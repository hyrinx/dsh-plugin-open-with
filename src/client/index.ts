/**
 * Browser-side plugin: injects the Open-with capsule split-button into the
 * conversation session header actions slot and registers the zh/en locale
 * dictionary. On click, calls `/open-with` RPC to spawn the chosen app at
 * the workspace directory.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
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

const NS = 'openWith'

export const inject = ['slots', 'locale', 'connection', 'sessions']

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
          const log = (level: 'info' | 'warn' | 'error', message: string, extra?: unknown): void => {
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
