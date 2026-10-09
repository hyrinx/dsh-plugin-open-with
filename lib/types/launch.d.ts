/**
 * Windows launch recipes and subprocess dispatch (presets and custom items).
 *
 * Every preset is dispatched through `cmd /c start` rather than `cmd /c <exe>`:
 * `cmd /c` strips a leading quote from the command string, truncating paths like
 * `C:\Program Files\...`; with `start` as the command word cmd leaves the
 * quoting alone, and `start` itself treats the first `""` as the window title
 * and the rest as program plus arguments.
 *
 * Terminal targets use `start /D <cwd>` to set the new window's working
 * directory, avoiding the nested-quote damage a `cd /d "<path>"` prefix would
 * suffer. File Explorer is spawned directly: its path argument needs no shell
 * parsing at all.
 *
 * A launch that has been handed to `start` is fire-and-forget, so the plugin
 * only records the first-exit diagnostics instead of holding a successful
 * launch open.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { LaunchTarget } from './shared.ts';
import type { OpenWithLogger } from './logger.ts';
/**
 * Resolve one preset's executable path.
 * @param ctx - host plugin context.
 * @param target - preset target.
 * @returns the absolute executable path.
 */
export declare function resolvePresetExecutable(ctx: Context, target: LaunchTarget): Promise<string>;
/**
 * Build the argv for one custom item launch. The item's path is handed to
 * `start` verbatim (a bare `cmd /c <path>` would strip its quotes).
 * @param itemPath - the item's configured launcher path.
 * @returns the argv to spawn.
 */
export declare function customArgv(itemPath: string): readonly string[];
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
export declare function spawnDetached(ctx: Context, argv: readonly string[], cwd: string, label: string, logger: OpenWithLogger): void;
/**
 * Launch one preset on one workspace directory.
 * @param ctx - host plugin context.
 * @param target - preset target.
 * @param cwd - the session's workspace directory.
 * @param logger - plugin logger.
 */
export declare function launchPreset(ctx: Context, target: LaunchTarget, cwd: string, logger: OpenWithLogger): Promise<void>;
/**
 * Launch one custom item on one workspace directory.
 * @param ctx - host plugin context.
 * @param itemId - the item's id, for logging.
 * @param itemPath - the item's configured launcher path.
 * @param cwd - the session's workspace directory.
 * @param logger - plugin logger.
 */
export declare function launchCustom(ctx: Context, itemId: string, itemPath: string, cwd: string, logger: OpenWithLogger): void;
