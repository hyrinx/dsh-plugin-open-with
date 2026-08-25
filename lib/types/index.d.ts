/**
 * Host-side plugin: registers an RPC channel `/open-vscode` that spawns
 * `code` (VS Code CLI) at the workspace directory via the subprocess
 * capability.
 *
 * The browser half calls `ctx.connection.rpc.call('/open-vscode', 'launch', { cwd })`.
 * The host resolves the `code` executable, spawns it detached, and returns.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Services required by this plugin: subprocess for spawning, connection for RPC. */
export declare const inject: string[];
/**
 * Register the `/open-vscode` RPC handler.
 * @param ctx - Cordis host context.
 */
export declare function apply(ctx: Context): void;
