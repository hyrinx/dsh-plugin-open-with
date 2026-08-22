/**
 * Host-side plugin: registers `/open-with` RPC (launch / log endpoints).
 * `launch` spawns code / cmd / explorer at the given workspace directory
 * via the subprocess capability. `log` appends browser-side log lines to
 * the host log file.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-client-connection'
import { logger } from './logger.js'

export type LaunchTarget = 'code' | 'cmd' | 'explorer'

export const inject = ['subprocess', 'connection']

function shellExecutable(): 'cmd' | 'powershell' | 'bash' | 'zsh' | 'sh' {
  switch (process.platform) {
    case 'win32':
      return 'cmd'
    case 'darwin':
      return process.env.SHELL?.endsWith('/zsh') ? 'zsh' : 'bash'
    default:
      return (process.env.SHELL?.split('/').pop() as 'bash' | 'sh' | undefined) ?? 'bash'
  }
}

function fileManagerLauncher(): string {
  switch (process.platform) {
    case 'win32': return 'explorer.exe'
    case 'darwin': return '/usr/bin/open'
    default: return 'xdg-open'
  }
}

async function buildSpawnSpec(
  ctx: Context,
  target: LaunchTarget,
  cwd: string,
): Promise<{ argv: readonly string[]; useSpawnCwd: boolean }> {
  switch (target) {
    case 'code': {
      const exe = await ctx.subprocess.resolveExecutable('code')
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
        // Workaround: Node's Windows argv builder collapses empty-string
        // tokens, so `start "" title cmd.exe /K ...` silently drops the
        // title sentinel; we write the exe path as the window title and
        // also run `title <exe>` inside the /K script.
        const windir = process.env.windir ?? 'C:\\Windows'
        const cmdPath = `${windir}\\System32\\cmd.exe`
        const escapedCwd = cwd.includes(' ') ? `"${cwd}"` : cwd
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
      return {
        argv: [shell, '-i'],
        useSpawnCwd: true,
      }
    }
    case 'explorer': {
      const launcher = fileManagerLauncher()
      return {
        argv: [launcher, cwd],
        useSpawnCwd: process.platform !== 'win32',
      }
    }
    default: {
      const _exhaustive: never = target
      throw new Error(`unknown launch target: ${String(_exhaustive)}`)
    }
  }
}

export function apply(ctx: Context): void {
  logger.info('plugin loaded')
  ctx.effect(() => {
    return ctx.connection.rpc.handle(
      '/open-with',
      async (endpoint, payload) => {
        logger.info('RPC /open-with', { endpoint, payload })
        if (endpoint === 'log') {
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
            const exe = await ctx.subprocess.resolveExecutable('code')
            logger.info('resolved code ->', exe)
          }
          const { argv, useSpawnCwd } = await buildSpawnSpec(ctx, resolvedTarget, cwd)
          const handle = ctx.subprocess.spawn({
            argv: [...argv],
            cwd: useSpawnCwd ? cwd : process.cwd(),
            stdio: { stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' },
            graceMs: 5000,
          })
          logger.info('spawned', { target: resolvedTarget, argv, pid: handle.pid })
          handle.done.catch((err) => {
            logger.error('process exited with error', err)
          })
          return { ok: true, value: { launched: true, target: resolvedTarget, pid: handle.pid } }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          logger.error('launch failed', err)
          // Remedial suggestions per platform / target.
          if (resolvedTarget === 'code' && process.platform === 'win32') {
            logger.error('install "code" CLI via VS Code Command Palette: "Shell Command: Install \'code\' command in PATH"')
          } else if (resolvedTarget === 'cmd' && process.platform === 'linux') {
            logger.error('on Linux install a terminal emulator, e.g. gnome-terminal')
          } else if (resolvedTarget === 'explorer' && process.platform === 'linux') {
            logger.error('on Linux install xdg-utils (xdg-open)')
          }
          return { ok: false, error: { code: 'launch-failed', message: `failed to launch ${resolvedTarget}: ${message}` } }
        }
      },
      { authority: 'loopback' },
    )
  }, 'open-with: RPC handler')
}
