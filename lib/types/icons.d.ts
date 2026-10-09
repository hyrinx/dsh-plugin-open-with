/**
 * Windows icon extraction for the icon route.
 *
 * The resolved launcher's associated icon is extracted as a PNG by a
 * generated PowerShell script run with `-File` and positional arguments, so
 * spaces, quotes, and non-ASCII characters in the executable path never enter
 * the command line's parsing. `ExtractAssociatedIcon` yields 32px, the most
 * the stock .NET surface gives without a native addon.
 *
 * Every failure resolves null and the route answers 404, which the browser
 * renders as the generic fallback glyph.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { OpenWithLogger } from './logger.ts';
/**
 * Extract one executable's associated icon as PNG bytes.
 * @param ctx - host plugin context.
 * @param exePath - the resolved launcher (`.exe`, or any file the shell has an association for).
 * @param logger - plugin logger.
 * @returns the PNG bytes, or null when this host cannot extract one.
 */
export declare function extractIconPng(ctx: Context, exePath: string, logger: OpenWithLogger): Promise<Buffer | null>;
