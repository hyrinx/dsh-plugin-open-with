/**
 * Host half of open-with: four routes on the composition's `webServer`
 * serving the settings document, per-item icons, the launch endpoint the
 * browser split button posts to, and the browser log relay.
 *
 * Security has one home, here. Every route asks the composition's
 * `connection` service for a rejection first: its Host/Origin fence defeats
 * DNS rebinding and cross-site calls, and its browser authentication gates
 * every caller before any setting, icon, or launch is reachable. On top of
 * that fence each route validates its body at the wire (JSON media type, a
 * bounded body, string fields, an item id that exists, an absolute path
 * naming an existing directory).
 *
 * Settings live in the profile the plugin was loaded from
 * (`profile/<mode>/open-with/settings.json`); the log sits beside them.
 * Windows only: every launcher recipe in `./launch.ts` targets win32.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis function-plugin name. */
export declare const name = "open-with";
/** The route carrier, the trust fence guarding every route, and the PATH resolver. */
export declare const inject: string[];
/** Register the settings, icon, open, and log routes behind the connection trust fence. */
export declare function apply(ctx: Context): void;
