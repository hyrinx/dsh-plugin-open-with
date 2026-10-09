/**
 * Browser-side plugin.
 *
 * 功能：
 * - 胶囊拆分按钮：左半直接启动当前项，右侧下拉菜单切换启动器；
 *   注入位置可配置（会话标题旁 / 右侧工具区），改设置后立即迁移槽位。
 * - 注册中英文词典，并把设置页注入 DSH 设置面板。
 *
 * 所有数据都走 host 的 webServer 路由（`./controller.ts`），浏览器侧不缓存，
 * 因此菜单与设置页展示的永远是 host 实际持有的文档。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  DEFAULT_ORDER, DEFAULT_PLACEMENT, OPEN_WITH_ICON_PREFIX_ROUTE,
  type OpenWithSettings, type Placement,
} from '../shared.ts'
import { OpenWithController, type OpenWithLogLevel } from './controller.ts'
import { publishSettings, settingsRevision } from './settings-events.ts'
import { OpenWithButton } from './OpenWithButton.tsx'
import type { HeaderActionSlot } from './OpenWithButton.tsx'
import { OpenWithSettings as OpenWithSettingsPanel } from './OpenWithSettings.tsx'
import { en, zh, type OpenWithKey } from './locales.ts'

export type { OpenWithButtonProps, OpenWithInjected } from './OpenWithButton.tsx'
export type { OpenWithSettingsProps } from './OpenWithSettings.tsx'
export type { OpenWithKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Open-with split-button copy. */
    openWith: OpenWithKey
  }
}

const NS = 'openWith'

/** placement 选项到会话头部槽位的映射。 */
const PLACEMENT_SLOT: Record<Placement, HeaderActionSlot> = {
  actions: 'conversation.session.header.actions',
  utilities: 'conversation.session.header.utilities',
}

export const inject = ['slots', 'locale', 'sessions']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'open-with: dictionaries')

  const controller = new OpenWithController()

  /**
   * 某一项图标的文档相对 URL。
   *
   * 末尾拼上广播版本号：图标路由按 id 寻址，id 在改路径时并不改变，若不换
   * URL，`<img>` 会一直显示改动前的字节。
   */
  const iconUrl = (id: string): string =>
    `${OPEN_WITH_ICON_PREFIX_ROUTE}/${encodeURIComponent(id)}?v=${String(settingsRevision())}`

  /** 取会话工作区目录；会话未知时返回 undefined。 */
  const getCwd = (sessionId: string): string | undefined => {
    try {
      return ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
    } catch (err) {
      controller.log('warn', 'session lookup failed', err)
      return undefined
    }
  }

  let mounted: { placement: Placement; order: number; dispose: () => void } | null = null

  /**
   * 把胶囊按钮挂到 placement 对应的槽位，并写入 order 控制同槽位内的前后位置；
   * 位置与顺序都没变时为空操作。
   * @param placement - 目标注入位置。
   * @param order - 同槽位内的排序值，越小越靠前。
   */
  const mount = (placement: Placement, order: number): void => {
    if (mounted?.placement === placement && mounted.order === order) return
    mounted?.dispose()
    mounted = null
    const slot = PLACEMENT_SLOT[placement]
    mounted = {
      placement,
      order,
      dispose: ctx.slots.inject(slot, () => ctx.slots.register({
        name: slot,
        id: 'open-with',
        order,
        locale: NS,
        inject: () => ({
          getSettings: () => controller.load(),
          launch: (target: string, path: string) => controller.launch(target, path),
          getCwd,
          log: (level: OpenWithLogLevel, message: string, extra?: unknown) => {
            controller.log(level, message, extra)
          },
          iconUrl,
        }),
      }, OpenWithButton)),
    }
  }

  // 先按默认位置挂载，再用持久化设置校正（HTTP 读，通常毫秒级返回）。
  mount(DEFAULT_PLACEMENT, DEFAULT_ORDER)
  void controller.load()
    .then((payload) => { mount(payload.settings.placement, payload.settings.order) })
    .catch((err: unknown) => { controller.log('warn', 'settings read failed during mount', err) })

  // ── 设置页面 ──────────────────────────────────────────────────────────────

  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'open-with',
      order: 600,
      label: () => ctx.locale.bind(NS)('menu.aria'),
      locale: NS,
      inject: () => ({
        load: () => controller.load(),
        save: async (settings: OpenWithSettings): Promise<OpenWithSettings> => {
          const saved = await controller.save(settings)
          // 位置或顺序可能在设置页被改动，立即把按钮迁到位。
          mount(saved.placement, saved.order)
          // 把 host 归一化后的文档推给同页的胶囊按钮：它据此立即重渲染，
          // 不用等用户点开菜单再发一次读请求。放在 mount 之后，重建出来的
          // 按钮便能从广播缓存里拿到新文档，不闪空菜单。
          publishSettings(saved)
          return saved
        },
        iconUrl,
      }),
    },
    OpenWithSettingsPanel,
  )), 'open-with: settings section')
}
