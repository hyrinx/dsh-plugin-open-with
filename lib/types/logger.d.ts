/**
 * Host logging for this plugin.
 *
 * One file, `profile/<mode>/open-with/host.log`, truncated on every plugin
 * load so it always describes the current session. Lines are mirrored to the
 * composition logger (`ctx.logger('open-with')`), which is where DSH's own
 * console exporter picks them up; the file exists because the console is not
 * readable after the fact.
 *
 * Writes never throw: a failing log must not take the plugin down.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Log levels accepted on the wire and in the file. */
export type LogLevel = 'info' | 'warn' | 'error';
/** The plugin's logger surface. */
export interface OpenWithLogger {
    info(message: string, extra?: unknown): void;
    warn(message: string, extra?: unknown): void;
    error(message: string, extra?: unknown): void;
    /** Write one line forwarded from the browser half. */
    client(level: LogLevel, message: string, extra?: unknown): void;
}
/**
 * Create the logger bound to one log file.
 * @param ctx - host plugin context (its composition logger is the console mirror).
 * @param logFile - absolute log path; its directory is created and the file truncated.
 * @returns the logger surface used by the rest of the host half.
 */
export declare function createLogger(ctx: Context, logFile: string): OpenWithLogger;
