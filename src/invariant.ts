/**
 * Invariants for the open-with plugin.
 *
 * The RPC channel `/open-with` is registered with `loopback` authority:
 * only local-transport requests reach the handler. The host-side `resolveExecutable`
 * call rejects names containing path separators, so a crafted `code`/`cmd`/`explorer`
 * launch path cannot escape the PATH lookup. The spawned process inherits the
 * subprocess service's scrubbed environment, not the raw parent env.
 */
export {}
