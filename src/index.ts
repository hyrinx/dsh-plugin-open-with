/**
 * Host-side plugin: registers an RPC channel `/open-with` that spawns
 * a given external tool at the workspace directory via the subprocess
 * capability.
 *
 * Supported target types:
 *   - `code`: VS Code desktop (resolved via `ctx.subprocess.resolveExecutable`)
 *   - `cmd`:  a shell in the workspace directory (platform-selects
 *             cmd.exe / powershell / bash)
 *   - `explorer`: a file manager window at the workspace (explorer.exe /
 *                 open / xdg-open)
 *
 * The browser half calls `ctx.connection.rpc.call('/open-with', 'launch', { cwd, target })`.
 * The host maps `target` to an argv tuple and spawns it detached. Because
 * Node cannot spawn Windows `.CMD` files without a shell, on Windows the
 * editor CLI path is wrapped in `cmd /c` — the same pattern
 * `dsh-sandbox-local` uses (see `cmd /c exit 0` probe in sandbox-local/src/index.ts).
 * A second RPC endpoint `log` lets the browser half forward its console
 * lines into the same host log file.
 *
 * Returns follow the dsh RPC union schema (matches master
 * `api/gateway/tests/gateway.host.spec.ts`):
 *   - success: `{ ok: true, value: T }`
 *   - failure: `{ ok: false, error: { code: string, message: string } }`
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the subprocess Context merge (ctx.subprocess).
import type {} from '@deepseek-ai/dsh-subprocess'
// Type-only: pulls the connection Context merge (ctx.connection).
import type {} from '@deepseek-ai/dsh-client-connection'
import { logger, LOG_FILE } from './logger.js'

/** The three supported launch targets. */
export type LaunchTarget = 'code' | 'cmd' | 'explorer'

/** Services required by this plugin: subprocess for spawning, connection for RPC. */
export const inject = ['subprocess', 'connection']

/**
 * Pick a shell executable name for the current platform.
 * @returns a string that `resolveExecutable` can look up on PATH.
 */
function shellExecutable(): 'cmd' | 'powershell' | 'bash' | 'zsh' | 'sh' {
  switch (process.platform) {
    case 'win32':
      // cmd.exe is always in System32 and is the lowest common denominator.
      // Powershell is available in-box since Win10 but is slower to boot;
      // keep cmd to match the spawn wrapping pattern used elsewhere in dsh.
      return 'cmd'
    case 'darwin':
      // macOS ships zsh by default on fresh installs since Catalina.
      return process.env.SHELL?.endsWith('/zsh') ? 'zsh' : 'bash'
    default:
      return (process.env.SHELL?.split('/').pop() as 'bash' | 'sh' | undefined) ?? 'bash'
  }
}

/**
 * Pick a file-manager launcher for the current platform.
 *   - Windows: explorer.exe (in-box, on PATH-free)
 *   - macOS:   /usr/bin/open (in-box)
 *   - Linux:   xdg-open (desktop-agnostic; depends on xdg-utils package)
 */
function fileManagerLauncher(): string {
  switch (process.platform) {
    case 'win32': return 'explorer.exe'
    case 'darwin': return '/usr/bin/open'
    default: return 'xdg-open'
  }
}

/**
 * Build the argv + spawn-cwd for a given target at the workspace directory.
 * @returns argv array suitable for `ctx.subprocess.spawn`.
 */
async function buildSpawnSpec(
  ctx: Context,
  target: LaunchTarget,
  cwd: string,
): Promise<{ argv: readonly string[]; useSpawnCwd: boolean }> {
  switch (target) {
    case 'code': {
      const exe = await ctx.subprocess.resolveExecutable('code')
      // Windows: `resolveExecutable` returns the PATH-resolved `code.CMD`
      // wrapper (PATHEXT order has .CMD before .BAT, and VS Code ships
      // only the .CMD in `bin/`). Node's spawn refuses .CMD files
      // without a shell (EINVAL), so wrap the call in `cmd /c` —
      // the same pattern dsh-sandbox-local uses for its Windows probe
      // (`cmd /c exit 0`). macOS/Linux spawn the bare executable directly.
      return {
        argv: process.platform === 'win32'
          ? ['cmd', '/c', exe, cwd]
          : [exe, cwd],
        useSpawnCwd: false,
      }
    }
    case 'cmd': {
      const shell = shellExecutable()
      if (process.platform === 'win32' && shell === 'cmd') {
        // On Windows, `ctx.subprocess.spawn` deliberately leaves
        // `detached: false` (see subprocess-local spawn.ts line 360).
        // A plain `cmd /K ...` would therefore inherit the parent's
        // console / have no visible window when launched from an
        // Electron / GUI host. Route via `start` to force a brand-new
        // console window with its own title bar.
        //
        // TITLE NOTE: Node's Windows command-line builder collapses
        // empty-string argv tokens, so a `''` sentinel for `start`'s
        // required title positional is silently dropped. The next
        // token (`cmd` / `powershell`) then gets misinterpreted as
        // the window caption — resulting in a bare "cmd" title bar.
        // Fix by writing the full executable path as the window
        // title (matching the user's expectation) AND echoing the
        // same title via an inline `title` command, so even if
        // `start`'s quoting gets mangled the final console still
        // shows the correct caption.
        const windir = process.env.windir ?? 'C:\\Windows'
        const cmdPath = `${windir}\\System32\\cmd.exe`
        const escapedCwd = cwd.includes(' ') ? `"${cwd}"` : cwd
        // The `title X && cd /d ...` is passed as a single string
        // argument to `cmd /K ...` because `/K` consumes the rest of
        // its command line as script text.
        const innerCommands = `title ${cmdPath} && cd /d ${escapedCwd}`
        return {
          argv: ['cmd', '/c', 'start', `"${cmdPath}"`, 'cmd', '/K', innerCommands],
          useSpawnCwd: false,
        }
      }
      if (process.platform === 'win32' && shell === 'powershell') {
        const windir = process.env.windir ?? 'C:\\Windows'
        const psPath = `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
        const escapedCwd = cwd.replace(/'/g, "''")
        return {
          argv: [
            'cmd', '/c', 'start', `"${psPath}"`, 'powershell', '-NoExit',
            '-Command',
            `[Console]::Title = '${psPath.replace(/'/g, "''")}'; Set-Location -LiteralPath '${escapedCwd}'`,
          ],
          useSpawnCwd: false,
        }
      }
      // POSIX: terminal windows are the terminal emulator's job; just
      // launch an interactive shell and let the caller's desktop
      // environment handle the presentation.
      return {
        argv: [shell, '-i'],
        useSpawnCwd: true,
      }
    }
    case 'explorer': {
      const launcher = fileManagerLauncher()
      if (process.platform === 'win32') {
        // explorer.exe is picky about its CLI: it wants paths handed as
        // loose argv rather than a quoted single string, and it also
        // ignores the cwd from spawn itself. Pass cwd as the single
        // folder argument so Explorer opens rooted exactly there.
        return {
          argv: [launcher, cwd],
          useSpawnCwd: false,
        }
      }
      return {
        argv: [launcher, cwd],
        useSpawnCwd: true,
      }
    }
    default: {
      // Closed-union backstop.
      const _exhaustive: never = target
      throw new Error(`unknown launch target: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Register the `/open-with` RPC handler.
 * @param ctx - Cordis host context.
 */
export function apply(ctx: Context): void {
  logger.info('plugin loaded; log file ->', LOG_FILE)
  ctx.effect(() => {
    return ctx.connection.rpc.handle(
      '/open-with',
      async (endpoint, payload) => {
        logger.info('RPC /open-with', { endpoint, payload })
        if (endpoint === 'log') {
          // Client-side log forward: { level, message, extra }.
          const { level = 'info', message = '', extra } = (payload ?? {}) as {
            level?: 'info' | 'warn' | 'error'
            message?: string
            extra?: unknown
          }
          logger.client(level, String(message), extra)
          return { ok: true, value: null }
        }
        if (endpoint !== 'launch') {
          logger.warn('unknown endpoint', endpoint)
          return { ok: false, error: { code: 'unknown-endpoint', message: `unknown endpoint: ${endpoint}` } }
        }
        const { cwd, target } = (payload ?? {}) as { cwd?: string; target?: LaunchTarget }
        if (typeof cwd !== 'string' || cwd.length === 0) {
          logger.warn('cwd missing or invalid', { cwd })
          return { ok: false, error: { code: 'invalid-cwd', message: 'cwd is required' } }
        }
        const resolvedTarget: LaunchTarget = target === 'cmd' || target === 'explorer' ? target : 'code'
        try {
          if (resolvedTarget === 'code') {
            logger.info('resolving "code" executable on PATH...')
            const exe = await ctx.subprocess.resolveExecutable('code')
            logger.info('resolved code ->', exe)
          }
          const { argv, useSpawnCwd } = await buildSpawnSpec(ctx, resolvedTarget, cwd)
          // buildSpawnSpec decides whether the target needs cwd threaded
          // through its own argv (cmd's `cd /d`, explorer's folder arg) vs
          // handed to spawn's `cwd` field (POSIX shells, xdg-open).
          const spawnCwd = useSpawnCwd ? cwd : process.cwd()
          const handle = ctx.subprocess.spawn({
            argv: [...argv],
            cwd: spawnCwd,
            // SubprocessStdio is an object, not an array (master contract).
            // stdout/stderr have no 'ignore' mode; use 'inherit' so any
            // diagnostics land on the host stream — GUI apps / shells
            // launched via `start` don't actually share these handles.
            stdio: { stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' },
            graceMs: 5000,
          })
          logger.info('spawned', { target: resolvedTarget, argv, pid: handle.pid })
          // Fire-and-forget: GUI apps / shells launch and outlive the host.
          handle.done.catch((err) => {
            logger.error('process exited with error', err)
          })
          return { ok: true, value: { launched: true, target: resolvedTarget, pid: handle.pid } }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          logger.error('launch failed', err)
          if (resolvedTarget === 'code' && process.platform === 'win32') {
            logger.error('on Windows, install "code" from VS Code:', [
              'open Command Palette (Ctrl+Shift+P)',
              "run \"Shell Command: Install 'code' command in PATH\"",
              'or add %USERPROFILE%\\AppData\\Local\\Programs\\Microsoft VS Code\\bin to PATH',
            ])
          } else if (resolvedTarget === 'cmd' && process.platform === 'linux') {
            logger.error('on Linux, install a terminal emulator (e.g. gnome-terminal)')
          } else if (resolvedTarget === 'explorer' && process.platform === 'linux') {
            logger.error('on Linux, install xdg-utils (xdg-open)')
          }
          return { ok: false, error: { code: 'launch-failed', message: `failed to launch ${resolvedTarget}: ${message}` } }
        }
      },
      { authority: 'loopback' },
    )
  }, 'open-with: RPC handler')
}
