/**
 * Windows launch recipe, initial-path resolution, and subprocess dispatch.
 *
 * Every item — terminal, editor, file manager, or a user's own entry — takes
 * one shape: the program path, optionally followed by the directory to open.
 * Nothing about an item's origin changes how it starts.
 *
 * The whole command runs behind `cmd /c start` rather than `cmd /c <exe>`:
 * `cmd /c` strips a leading quote from the command string, truncating paths
 * like `C:\Program Files\...`; with `start` as the command word cmd leaves the
 * quoting alone, and `start` itself treats the first `""` as the window title
 * and the rest as program plus arguments.
 *
 * Folders reach File Explorer through `start` rather than a direct
 * `explorer.exe` spawn: an explorer spawned straight from this process inherits
 * its stdio pipes and window flags and exits 1 without ever showing a window,
 * whereas `start` hands the directory to the shell's own opener, which is how
 * DSH's own open-in-app opens folders.
 *
 * A launch that has been handed to `start` is fire-and-forget, so the plugin
 * only records the first-exit diagnostics instead of holding a successful
 * launch open.
 */

import { existsSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { OpenWithLogger } from './logger.ts'

/** Collected-output ceiling for a launch command; diagnostics are short. */
const MAX_OUTPUT_BYTES = 64 * 1024

/** Early-failure watch window: a command still running past it counts as launched. */
const LAUNCH_WATCH_MS = 5_000

/**
 * Environment tombstone applied to every launch.
 *
 * A DSH host shipped as an Electron shell hands `ELECTRON_RUN_AS_NODE` down to
 * its children. An Electron launcher that inherits it runs as a bare Node
 * process: VS Code starts, exits 0, and never draws a window — which reads in
 * the log exactly like a successful launch. `undefined` is the subprocess
 * provider's tombstone, removing just this entry from the child while the rest
 * of the ambient environment is layered as usual.
 */
const LAUNCH_ENV: NodeJS.ProcessEnv = { ELECTRON_RUN_AS_NODE: undefined }

/**
 * Absolute path of a program that ships with Windows.
 * @param name - the bare command name.
 * @returns the absolute executable path, or null when this is not one of them.
 */
function systemLauncherPath(name: string): string | null {
  const windir = process.env.windir ?? 'C:\\Windows'
  switch (name) {
    case 'cmd':
      return `${windir}\\System32\\cmd.exe`
    case 'powershell':
      return `${windir}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
    case 'explorer':
      return `${windir}\\explorer.exe`
    default:
      return null
  }
}

/**
 * Resolve a bare command name to the GUI executable it stands for.
 *
 * `resolveExecutable('code')` hits the CLI wrapper (`bin\code.cmd`), and
 * `start`-ing a `.cmd` raises a console window before the GUI appears; the real
 * GUI executable sits in the same directory as the wrapper or the one above.
 * Windows paths are case-insensitive, so probing for `<stem>.exe` finds
 * `Code.exe` from `code.cmd`.
 * @param ctx - host plugin context.
 * @param name - the bare command name.
 * @returns the resolved executable path.
 */
async function resolveGuiExecutable(ctx: Context, name: string): Promise<string> {
  const resolved: string = await ctx.subprocess.resolveExecutable(name)
  const extension = extname(resolved).toLowerCase()
  if (extension === '.cmd' || extension === '.bat') {
    const stem = basename(resolved, extname(resolved))
    for (const directory of [dirname(resolved), dirname(dirname(resolved))]) {
      const candidate = join(directory, `${stem}.exe`)
      if (existsSync(candidate)) return candidate
    }
  }
  return resolved
}

/**
 * Resolve one seeded item's bare command name into the path to store.
 *
 * Used once, when the host writes the very first document. A name that cannot
 * be resolved is kept verbatim: `start` still finds it on PATH, and the user can
 * correct it in the settings page.
 * @param ctx - host plugin context.
 * @param name - the bare command name from the seed.
 * @returns the absolute executable path, or the name unchanged.
 */
export async function resolveInitialPath(ctx: Context, name: string): Promise<string> {
  const system = systemLauncherPath(name)
  if (system !== null) return system
  try {
    return await resolveGuiExecutable(ctx, name)
  } catch {
    // Swallows a not-found command: the seed keeps its bare name.
    return name
  }
}

/**
 * Resolve any stored item path into the absolute executable it stands for.
 *
 * The settings document can hold either an absolute path (custom items, and
 * presets once seeded) or a bare command name (a preset that was never
 * resolved, e.g. a document written before the resolver existed). Callers that
 * need a real file — icon extraction, and launchers that must not rely on the
 * shell's PATH lookup — consistently resolve through here so every item, preset
 * or custom, is treated alike.
 * @param ctx - host plugin context.
 * @param path - the item's configured launcher path.
 * @returns the absolute executable path, or the input unchanged when unresolvable.
 */
export async function resolveExecutable(ctx: Context, path: string): Promise<string> {
  if (path.length === 0) return path
  if (isAbsolute(path)) return path
  return resolveInitialPath(ctx, path)
}

/**
 * Build the argv for one launch: `<program> [cwd]` behind `cmd /c start`.
 *
 * The `start` command word is what keeps a path like `C:\Program Files\...`
 * intact (a bare `cmd /c <path>` strips its leading quote), and the leading
 * `""` is the window title that `start` would otherwise mistake the program
 * path for.
 * @param program - the item's launcher path.
 * @param cwd - directory to hand the launcher; omitted when it takes none.
 * @returns the argv to spawn.
 */
export function launchArgv(program: string, cwd?: string): readonly string[] {
  return cwd === undefined
    ? ['cmd', '/c', 'start', '', program]
    : ['cmd', '/c', 'start', '', program, cwd]
}

/**
 * Spawn one launcher and report its first-exit diagnostics asynchronously.
 *
 * `SubprocessHandle` exposes no pid, so the log records the exit outcome
 * rather than a process identity.
 * @param ctx - host plugin context.
 * @param argv - full command; `argv[0]` is the program, never shell-interpreted.
 * @param cwd - the child's working directory (the session's workspace).
 * @param label - log label identifying the target.
 * @param logger - plugin logger.
 */
function spawnDetached(
  ctx: Context,
  argv: readonly string[],
  cwd: string,
  label: string,
  logger: OpenWithLogger,
): void {
  const handle = ctx.subprocess.spawn({
    argv: [...argv],
    cwd,
    env: LAUNCH_ENV,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: MAX_OUTPUT_BYTES },
      stderr: { maxBytes: MAX_OUTPUT_BYTES },
    },
    graceMs: LAUNCH_WATCH_MS,
  })
  handle.done.then((outcome: { exitCode: number | null }) => {
    const stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? ''
    const stdout = handle.collected.stdout?.readFrom(0).text.trim() ?? ''
    if (outcome.exitCode !== 0 || stderr.length > 0) {
      logger.warn('launch command finished with diagnostics', {
        label, exitCode: outcome.exitCode, stdout, stderr,
      })
    } else {
      logger.info('launch command finished', { label, exitCode: outcome.exitCode })
    }
  }).catch((err: unknown) => {
    logger.error('launch command failed to run', { label, err })
  })
}

/**
 * Launch one item on one workspace directory.
 * @param ctx - host plugin context.
 * @param itemId - the item's id, for logging.
 * @param itemPath - the item's configured launcher path.
 * @param cwd - the session's workspace directory; always the child's working directory.
 * @param passCwd - whether the directory is also handed to the launcher as its argument.
 * @param logger - plugin logger.
 */
export function launchItem(
  ctx: Context,
  itemId: string,
  itemPath: string,
  cwd: string,
  passCwd: boolean,
  logger: OpenWithLogger,
): void {
  logger.info('launching item', { target: itemId, path: itemPath, cwd, passCwd })
  spawnDetached(ctx, launchArgv(itemPath, passCwd ? cwd : undefined), cwd, itemId, logger)
}