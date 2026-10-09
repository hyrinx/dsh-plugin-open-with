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
import type { Context } from '@deepseek-ai/cordis';
import type { OpenWithLogger } from './logger.ts';
/**
 * Resolve a stored item path into the absolute executable it stands for.
 *
 * The settings document can hold either an absolute path (custom items, and the
 * presets once seeded) or a bare command name (a preset that came back through a
 * default restore, or a hand-edited document). Callers that need a real file —
 * icon extraction, and launchers that must not rely on the shell's PATH lookup —
 * consistently resolve through here, so every item is treated alike. A name that
 * cannot be resolved is returned unchanged: `start` still finds it on PATH, and
 * the settings page is where the user corrects it.
 * @param ctx - host plugin context.
 * @param path - the item's configured launcher path.
 * @returns the absolute executable path, or the input unchanged when unresolvable.
 */
export declare function resolveExecutable(ctx: Context, path: string): Promise<string>;
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
export declare function launchArgv(program: string, cwd?: string): readonly string[];
/**
 * Launch one item on one workspace directory.
 * @param ctx - host plugin context.
 * @param itemId - the item's id, for logging.
 * @param itemPath - the item's configured launcher path.
 * @param cwd - the session's workspace directory; always the child's working directory.
 * @param passCwd - whether the directory is also handed to the launcher as its argument.
 * @param logger - plugin logger.
 */
export declare function launchItem(ctx: Context, itemId: string, itemPath: string, cwd: string, passCwd: boolean, logger: OpenWithLogger): void;
