/**
 * Browser-side plugin: 注入胶囊拆分按钮到对话头部操作槽位，
 * 注册中英文词典，并注入设置页面到 DSH 设置面板。
 *
 * 功能：
 * - 胶囊拆分按钮：左键直接启动当前项，右键下拉菜单切换
 * - 下拉菜单按设置页排序展示（预设项在前，自定义项在后）
 * - 支持自定义项：名称、路径、自动图标提取、可见性控制
 * - 设置页：拖拽排序（组内）、隐藏/显示切换、添加/编辑/删除自定义项
 * - 图标后台提取：保存后立即关闭表单，图标异步更新
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { OpenWithButton } from './OpenVscodeButton.tsx'
import type { CapsuleItem } from './OpenVscodeButton.tsx'
import { OpenWithSettings } from './OpenWithSettings.tsx'
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

  // 1. 注入对话头部胶囊按钮
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
            launch: async (cwd: string, target = 'code') => {
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
            readHiddenIds: async (): Promise<string[]> => {
              try {
                const result = await ctx.connection.rpc.call('/open-with', 'readSettings', {})
                if (result && typeof result === 'object' && 'ok' in result) {
                  const settings = (result as { value?: { settings?: { hiddenIds?: string[] } } }).value?.settings
                  if (settings && Array.isArray(settings.hiddenIds)) {
                    return settings.hiddenIds.filter((id: unknown) => typeof id === 'string')
                  }
                }
                return []
              } catch {
                return []
              }
            },
            readCapsuleItems: async (): Promise<CapsuleItem[]> => {
              try {
                const result = await ctx.connection.rpc.call('/open-with', 'readSettings', {})
                if (result && typeof result === 'object' && 'ok' in result) {
                  const settings = (result as { value?: { settings?: { items?: CapsuleItem[]; hiddenIds?: string[] } } }).value?.settings
                  if (settings && Array.isArray(settings.items)) {
                    return settings.items.filter((it: CapsuleItem) => {
                      if (typeof it.id !== 'string' || typeof it.name !== 'string') return false
                      return true
                    })
                  }
                }
                return []
              } catch {
                return []
              }
            },
          }
        },
      },
      OpenWithButton,
    )),
    'open-with: button registration',
  )

  // 2. 注入设置页面（settings.section），参考 dsh-wallpaper-engine 的注册方式
  ctx.effect(
    () => ctx.slots.inject('settings.section', () => ctx.slots.register(
      {
        name: 'settings.section',
        id: 'open-with',
        order: 600,
        label: 'Open With',
        locale: NS,
        inject: () => ({
          extractIcon: async (exePath: string): Promise<string> => {
            try {
              console.log('[open-with] extractIcon RPC start', exePath)
              const result = await ctx.connection.rpc.call('/open-with', 'extractIcon', { exePath })
              if (result && typeof result === 'object' && 'ok' in result) {
                const icon = result.ok ? (result as { value?: { icon?: string } }).value?.icon ?? '' : ''
                console.log('[open-with] extractIcon RPC result', { ok: result.ok, iconLen: icon.length })
                return icon
              }
              console.warn('[open-with] extractIcon unexpected result', result)
              return ''
            } catch (err) {
              console.error('[open-with] extractIcon RPC error', err)
              return ''
            }
          },
          resolvePresetPath: async (target: 'code' | 'cmd' | 'powershell' | 'explorer'): Promise<string> => {
            try {
              const result = await ctx.connection.rpc.call('/open-with', 'resolvePresetPath', { target })
              if (result && typeof result === 'object' && 'ok' in result) {
                return (result as { value?: { path?: string } }).value?.path ?? ''
              }
              return ''
            } catch {
              return ''
            }
          },
          readSettings: async (): Promise<unknown> => {
            try {
              const result = await ctx.connection.rpc.call('/open-with', 'readSettings', {})
              if (result && typeof result === 'object' && 'ok' in result) {
                return (result as { value?: { settings?: unknown } }).value?.settings ?? null
              }
              return null
            } catch {
              return null
            }
          },
          writeSettings: async (settings: unknown): Promise<void> => {
            await ctx.connection.rpc.call('/open-with', 'writeSettings', { settings })
          },
        }),
      },
      OpenWithSettings,
    )),
    'open-with: settings section',
  )
}