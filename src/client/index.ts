/**
 * Browser-side plugin: injects a capsule "Open-with" split-button into the
 * conversation session header actions slot. On click, calls the host-side
 * RPC channel `/open-with` to spawn the chosen app (VS Code / terminal /
 * file explorer) at the workspace directory.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the connection Context merge (ctx.connection).
import type {} from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls the ui-conversation SlotMap merge (session header slots).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OpenWithButton } from './OpenVscodeButton.tsx'
import { en, zh, type OpenWithKey } from './locales.ts'

export type { OpenWithButtonProps, OpenWithInjected } from './OpenVscodeButton.tsx'
export type { OpenWithKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Open-with split-button copy. */
    openWith: OpenWithKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'openWith'

/** Services required: slots for UI registration, locale for i18n, connection for RPC, sessions for cwd lookup. */
export const inject = ['slots', 'locale', 'connection', 'sessions']

/**
 * Register the i18n dictionaries and inject the button into the conversation
 * session header actions slot.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'open-with: dictionaries')

  ctx.effect(
    () => ctx.slots.inject('conversation.session.header', () => ctx.slots.register(
      {
        name: 'conversation.session.header.actions',
        id: 'open-with',
        order: 10,
        locale: NS,
        inject: () => {
          // Forward client-side log lines into the host log file via RPC.
          // Best-effort: failures are swallowed so a logging hiccup never
          // breaks the UI. Also mirrors to the browser console for inline
          // DevTools visibility. Defined first so getCwd can call it without
          // self-reference issues.
          const log = (level: 'info' | 'warn' | 'error', message: string, extra?: unknown): void => {
            // Error objects lose message/stack when JSON-serialized across
            // RPC (those properties are non-enumerable). Flatten first so
            // the host log actually shows what went wrong.
            const safeExtra = extra instanceof Error
              ? { name: extra.name, message: extra.message, stack: extra.stack, cause: extra.cause }
              : extra
            const consoleLine = `[open-with] ${message}`
            if (level === 'error') console.error(consoleLine, safeExtra)
            else if (level === 'warn') console.warn(consoleLine, safeExtra)
            else console.log(consoleLine, safeExtra)
            ctx.connection.rpc.call('/open-with', 'log', { level, message, extra: safeExtra }).catch(() => {})
          }

          return {
            launch: async (cwd: string, target: 'code' | 'cmd' | 'explorer' = 'code') => {
              return ctx.connection.rpc.call('/open-with', 'launch', { cwd, target })
            },
            // Resolve the workspace directory for the given session.
            // dsh's SnapshotStore exposes `getSnapshot()` (not zustand's
            // getState); SessionSummary carries `cwd` directly, so one read
            // is enough — no workspace reverse lookup needed.
            getCwd: (sessionId: string): string | undefined => {
              try {
                const state = ctx.sessions.list.getSnapshot()
                const summary = state.byId[sessionId]
                if (summary === undefined) {
                  const allIds = Object.keys(state.byId)
                  log('warn', 'session not in list', { requested: sessionId, count: allIds.length, sample: allIds.slice(0, 3) })
                }
                return summary?.cwd
              } catch (err) {
                console.error('[open-with] getCwd failed:', err)
                return undefined
              }
            },
            log,
          }
        },
      },
      OpenWithButton,
    )),
    'open-with: button registration',
  )
}
