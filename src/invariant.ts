/**
 * Invariants for the open-with plugin.
 * - RPC authority: `loopback` (only loopback transports can call the handler).
 * - `resolveExecutable` rejects any name with path separators, so the target
 *   selection cannot escape PATH resolution.
 */
export {}
