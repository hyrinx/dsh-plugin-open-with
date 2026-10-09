/**
 * Profile-scoped storage for this plugin.
 *
 * Settings and the host log live in `profile/<mode>/open-with`, the profile
 * directory the DSH launcher publishes as `ctx.profileContext.dir`, so they
 * travel with the profile that loaded the plugin. A composition that was not
 * launched from a profile (a bare test harness) falls back to
 * `$DSH_HOME/profiles/default/open-with` rather than scattering files.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type OpenWithSettings } from './shared.ts';
/**
 * Directory owning this plugin's settings and log inside the active profile.
 * @param ctx - host plugin context.
 * @returns the absolute directory (not created here).
 */
export declare function openWithDirOf(ctx: Context): string;
/** Settings document path inside one plugin directory. */
export declare function settingsFileOf(dir: string): string;
/** Host log path inside one plugin directory. */
export declare function logFileOf(dir: string): string;
/**
 * Read and normalize the settings document.
 * @param file - absolute settings path.
 * @returns the normalized document, or null when the file does not exist or is unreadable.
 */
export declare function readSettings(file: string): OpenWithSettings | null;
/**
 * Replace the settings document atomically (write-then-rename, so a crash
 * mid-write cannot leave a truncated file).
 * @param file - absolute settings path.
 * @param settings - the document to persist; normalized before writing.
 * @returns the normalized document that was written.
 */
export declare function writeSettings(file: string, settings: unknown): OpenWithSettings;
