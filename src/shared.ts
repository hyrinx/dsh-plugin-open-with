/**
 * Route paths, wire payloads, and the settings schema shared verbatim by the
 * host half (`./index.ts` and its siblings) and the browser half
 * (`./client/index.ts`).
 *
 * Browser-safe: constants, types, and pure helpers only — no node imports, so
 * the same module inlines into both bundles. Every route carries the absolute
 * pathname the host registers beside the document-relative form the browser
 * addresses (`*_ROUTE`), because one composition may serve the app under a
 * sub-path.
 */

// ── Routes ──────────────────────────────────────────────────────────────────

/** GET the normalized settings; POST replaces them. */
export const OPEN_WITH_SETTINGS_PATH = '/open-with/settings'
/** Browser-relative form of {@link OPEN_WITH_SETTINGS_PATH}. */
export const OPEN_WITH_SETTINGS_ROUTE = OPEN_WITH_SETTINGS_PATH.slice(1)

/** GET prefix serving one item's icon as PNG bytes (`<prefix>/<id>`). */
export const OPEN_WITH_ICON_PREFIX_PATH = '/open-with/icon'
/** Browser-relative form of {@link OPEN_WITH_ICON_PREFIX_PATH}. */
export const OPEN_WITH_ICON_PREFIX_ROUTE = OPEN_WITH_ICON_PREFIX_PATH.slice(1)

/** POST one launch of one item on one workspace directory. */
export const OPEN_WITH_OPEN_PATH = '/open-with/open'
/** Browser-relative form of {@link OPEN_WITH_OPEN_PATH}. */
export const OPEN_WITH_OPEN_ROUTE = OPEN_WITH_OPEN_PATH.slice(1)

/** POST one browser-side log line into the host log file. */
export const OPEN_WITH_LOG_PATH = '/open-with/log'
/** Browser-relative form of {@link OPEN_WITH_LOG_PATH}. */
export const OPEN_WITH_LOG_ROUTE = OPEN_WITH_LOG_PATH.slice(1)

/** GET the built-in open-in-app enablement; POST switches both halves together. */
export const OPEN_WITH_BUILTINS_PATH = '/open-with/builtins'
/** Browser-relative form of {@link OPEN_WITH_BUILTINS_PATH}. */
export const OPEN_WITH_BUILTINS_ROUTE = OPEN_WITH_BUILTINS_PATH.slice(1)

/** Directory this plugin owns inside the active profile directory. */
export const OPEN_WITH_DIR_NAME = 'open-with'

/** Settings document filename inside {@link OPEN_WITH_DIR_NAME}. */
export const OPEN_WITH_SETTINGS_FILENAME = 'settings.json'

/** Host log filename inside {@link OPEN_WITH_DIR_NAME}. */
export const OPEN_WITH_LOG_FILENAME = 'host.log'

// ── Built-in plugin toggle ──────────────────────────────────────────────────

/**
 * DSH 自带的「在应用中打开」是一对必须同时运行的包：
 * `@deepseek-ai/dsh-host-open-in-app` 提供 `/open-in-app` 三条路由，
 * `@deepseek-ai/dsh-client-ui-open-in-app` 提供停在 utilities 槽位的胶囊按钮。
 *
 * 只留一半会得到残废的形态（要么一个点不动的按钮，要么一个没人调用的后端），
 * 所以设置页把它们当成一个整体开关。
 */
export const OPEN_WITH_BUILTIN_MODULES: readonly string[] = [
  '@deepseek-ai/dsh-host-open-in-app',
  '@deepseek-ai/dsh-client-ui-open-in-app',
]

/** 内置「在应用中打开」这一对的观测状态（整体语义）。 */
export interface OpenWithBuiltinState {
  /** 只要有一半不在运行中的 profile 里就是 false。 */
  readonly present: boolean
  /** 两半都在运行时才为 true。 */
  readonly enabled: boolean
  /** 有一半无法被 profile 控制寻址时为 true。 */
  readonly readOnly: boolean
  /** 只读的原因：受保护的管理包，或 patch 无法寻址的行。 */
  readonly readOnlyReason?: 'management-required' | 'unaddressable'
}

/** GET 响应：这里能否切换，以及这一对的合并状态。 */
export interface OpenWithBuiltinsPayload extends OpenWithBuiltinState {
  /** host 未暴露 pluginManager 时为 false，此时什么都切换不了。 */
  readonly available: boolean
  /**
   * 浏览器半比 host 半新时为 true：路由回了 404，这只发生在 host 插件重载之前。
   */
  readonly stale?: boolean
}

/** POST 请求体：一起切换内置的两半。 */
export interface OpenWithBuiltinTogglePayload {
  readonly enabled: boolean
}

// ── Settings schema ─────────────────────────────────────────────────────────

/** Session-header slot the capsule button mounts into. */
export type Placement = 'actions' | 'utilities'

/** Default placement: the right-hand utilities cluster, beside DSH's own controls. */
export const DEFAULT_PLACEMENT: Placement = 'utilities'

/**
 * Default slot order.
 *
 * List slots sort by `priority` and then by `order` ascending, so a smaller
 * value sits further left. DSH's own "open in app" capsule registers at -10 in
 * the utilities seat; 0 therefore lands just to its right.
 */
export const DEFAULT_ORDER = 0

/** Inclusive lower bound accepted for a persisted slot order. */
export const ORDER_MIN = -100

/** Inclusive upper bound accepted for a persisted slot order. */
export const ORDER_MAX = 100

/** One menu entry: all items are treated uniformly. */
export interface OpenWithItem {
  readonly id: string
  readonly name: string
  /** Launcher path: an absolute path or a bare command name resolvable via PATH. */
  readonly path: string
  /**
   * Whether the session directory is handed to the launcher as an argument.
   * Absent means yes, so a launcher that wants no directory (or finds the
   * folder itself) is the only case that stores this.
   */
  readonly passCwd?: boolean
}

/** The persisted settings document. */
export interface OpenWithSettings {
  /** Id of the item the primary half of the split button launches. */
  readonly currentId: string
  readonly items: readonly OpenWithItem[]
  /** Ids excluded from the capsule menu; an absent id is visible. */
  readonly hiddenIds: readonly string[]
  readonly placement: Placement
  /**
   * Slot order within the placed seat: a smaller value sits further left.
   * DSH's own "open in app" capsule registers at -10 in the utilities seat.
   */
  readonly order: number
}

/** Settings-route response: the stored document. */
export interface OpenWithSettingsPayload {
  readonly settings: OpenWithSettings
}

/**
 * One entry already registered in a session-header seat this plugin can occupy.
 *
 * Read from the browser-side slot ledger so the settings page can show where
 * this plugin's capsule lands relative to the components around it.
 */
export interface OpenWithPeer {
  /** Seat the entry occupies. */
  readonly slot: Placement
  /** Registration id. */
  readonly id: string
  /** List order: a smaller value sits further left. */
  readonly order: number
  /** Coarse bucket applied before `order`. */
  readonly priority: number
  /** Diagnostics label of the registrant, when it declared one. */
  readonly registrant?: string
  /** True for this plugin's own entry. */
  readonly self: boolean
}

/** Open-route request body. */
export interface OpenWithOpenPayload {
  /** Item id from the settings document. */
  readonly target: string
  /** Absolute workspace directory to open. */
  readonly path: string
}

/** Log-route request body. */
export interface OpenWithLogPayload {
  readonly level: 'info' | 'warn' | 'error'
  readonly message: string
  readonly extra?: unknown
}

/**
 * The seed menu entries, in default order.
 *
 * These carry no privileges. Their `path` is a bare command name only as a
 * starting point: the host resolves it into an absolute executable path the
 * first time it writes a document, and from then on every entry is an ordinary
 * item the settings page can rename, re-target, hide, and remove.
 */
export const DEFAULT_ITEMS: readonly OpenWithItem[] = [
  { id: 'explorer', name: 'Explorer', path: 'explorer' },
  { id: 'cmd', name: 'Command', path: 'cmd', passCwd: false },
  { id: 'powershell', name: 'PowerShell', path: 'powershell', passCwd: false },
  { id: 'code', name: 'VS Code', path: 'code' },
]

/** The settings document used before one has ever been written. */
export function defaultSettings(): OpenWithSettings {
  return {
    currentId: DEFAULT_ITEMS[0].id,
    items: DEFAULT_ITEMS.map(item => ({ ...item })),
    hiddenIds: [],
    placement: DEFAULT_PLACEMENT,
    order: DEFAULT_ORDER,
  }
}

/**
 * Narrow one persisted placement value.
 * @param value - any value read from the settings file.
 * @returns the value when legal, else null.
 */
export function normalizePlacement(value: unknown): Placement | null {
  return value === 'actions' || value === 'utilities' ? value : null
}

/**
 * Coerce one persisted slot order into the accepted range.
 * @param value - any value read from the settings file.
 * @returns a rounded, clamped integer, or null when the value is unusable.
 */
export function normalizeOrder(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(ORDER_MAX, Math.max(ORDER_MIN, Math.round(value)))
}

/** Narrow one persisted item value into a complete {@link OpenWithItem}. */
function normalizeItem(raw: unknown): OpenWithItem | null {
  if (raw === null || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  if (typeof source.id !== 'string' || source.id.length === 0) return null
  if (typeof source.name !== 'string') return null
  return {
    id: source.id,
    name: source.name,
    path: typeof source.path === 'string' ? source.path : '',
    ...(source.passCwd === false ? { passCwd: false } : {}),
  }
}

/**
 * Coerce any persisted value into a complete settings document.
 *
 * The file may come from an older version, be hand-edited, or be truncated, so
 * every field is validated independently: a malformed item is dropped, a stale
 * `currentId` falls back to the first item, an unknown `placement` falls back to
 * the default, and an out-of-range `order` is clamped (a missing one takes
 * {@link DEFAULT_ORDER}).
 *
 * Missing items are never restored: every entry is a plain item, so removing
 * one has to survive the next read. Only a document that does not exist at all
 * falls back to {@link defaultSettings}, which the host seeds.
 * @param raw - the settings file parsed as JSON, or null when it does not exist.
 * @returns a document that is safe to persist and render.
 */
export function normalizeSettings(raw: unknown): OpenWithSettings {
  if (raw === null || typeof raw !== 'object') return defaultSettings()
  const source = raw as Partial<OpenWithSettings>
  const items: OpenWithItem[] = Array.isArray(source.items)
    ? source.items
      .map(normalizeItem)
      .filter((item): item is OpenWithItem => item !== null)
    : []
  const currentId = typeof source.currentId === 'string' && items.some(item => item.id === source.currentId)
    ? source.currentId
    : (items[0]?.id ?? '')
  const hiddenIds = Array.isArray(source.hiddenIds)
    ? source.hiddenIds.filter((id): id is string => typeof id === 'string')
    : []
  return {
    currentId,
    items,
    hiddenIds,
    placement: normalizePlacement(source.placement) ?? DEFAULT_PLACEMENT,
    order: normalizeOrder(source.order) ?? DEFAULT_ORDER,
  }
}