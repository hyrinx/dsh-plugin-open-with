/**
 * OpenWith 设置页组件：在 DSH 设置面板中插入"打开方式"配置区域。
 *
 * 只有一个启动器列表，每个条目能力完全相同：拖拽排序、隐藏/显示、编辑名称
 * 与路径、删除，以及选择是否把会话目录作为参数传给启动器。种子条目没有任何
 * 特权，删掉就是删掉。
 *
 * 胶囊菜单的顺序就是这个列表的顺序。
 * 图标不落在设置文档里：每一项的图标由 host 按当前路径现算（`iconUrl`）。
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  DEFAULT_ITEMS,
  DEFAULT_ORDER,
  defaultSettings,
  normalizeOrder,
  type OpenWithBuiltinsPayload,
  type OpenWithItem,
  type OpenWithPeer,
  type OpenWithSettings as OpenWithSettingsDoc,
  type OpenWithSettingsPayload,
  type Placement,
} from '../shared.ts'

// ── 注入接口 ─────────────────────────────────────────────────────────────────

export interface OpenWithSettingsInjected {
  /** 读取 host 端归一化后的设置文档与预设启动器实际路径。 */
  load: () => Promise<OpenWithSettingsPayload>
  /** 覆盖 host 端设置文档；返回 host 归一化后的结果。 */
  save: (settings: OpenWithSettingsDoc) => Promise<OpenWithSettingsDoc>
  /** 某一项图标的文档相对 URL。 */
  iconUrl: (id: string) => string
  /** 两个会话头部槽位里当前已注册的条目（含本插件自己）。 */
  peers: () => readonly OpenWithPeer[]
  /** 读取 DSH 内置 open-in-app 这一对的启用状态。 */
  loadBuiltins: () => Promise<OpenWithBuiltinsPayload>
  /** 一起切换两半；返回 host 刷新后的状态。 */
  setBuiltin: (enabled: boolean) => Promise<OpenWithBuiltinsPayload>
}

export type OpenWithSettingsProps =
  PropsLocale<'openWith'>
  & OpenWithSettingsInjected

// ── 位置选项 ─────────────────────────────────────────────────────────────────

/** 位置选项，顺序即设置页展示顺序。 */
const PLACEMENT_OPTIONS: readonly { value: Placement; labelKey: string }[] = [
  { value: 'actions', labelKey: 'settings.placement.actions' },
  { value: 'utilities', labelKey: 'settings.placement.utilities' },
]

// ── 图标组件 ─────────────────────────────────────────────────────────────────

/** 行内图标；路径缺失或加载失败时留出等宽空白，不用占位图。 */
function ItemIcon({ src, size = 20 }: { src: string; size?: number }) {
  // 记住"是哪一个 src 失败了"，而不是"曾经失败过"：设置一变，revision 前进、
  // src 换新，粘滞的布尔值会把一次 404 永久定格成空白 —— 即使图标其实已经好了。
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (src.length === 0 || failedSrc === src) {
    return <span style={{ display: 'block', width: size, height: size, flexShrink: 0 }} />
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      onError={() => { setFailedSrc(src) }}
      style={{
        display: 'block', width: size, height: size, flexShrink: 0,
        imageRendering: '-webkit-optimize-contrast', userSelect: 'none',
      }}
    />
  )
}

/** 拖拽插入位置指示线 */
function InsertionLine({ color }: { color: string }) {
  return (
    <div
      style={{
        height: '2px',
        background: color,
        borderRadius: '1px',
        margin: '1px 0',
      }}
    />
  )
}

// ── 编辑 / 添加表单 ─────────────────────────────────────────────────────────

/** 表单提交时携带的草稿值。 */
export interface ItemFormValue {
  readonly name: string
  readonly path: string
  readonly passCwd: boolean
}

/**
 * 添加与编辑共用的启动器表单：自持草稿状态，两份表单不再各写一遍。
 *
 * `initial` 为 null 表示添加一个新项，否则编辑该项并以其当前值作为初始值。
 * 外部切换编辑目标时可用 `key` 强制重建，使草稿与初始值同步。
 */
function ItemForm({
  initial, submitLabel, onCancel, onSubmit, t,
}: {
  initial: OpenWithItem | null
  submitLabel: string
  onCancel: () => void
  onSubmit: (value: ItemFormValue) => void
  t: OpenWithSettingsProps['t']
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [path, setPath] = useState(initial?.path ?? '')
  const [passCwd, setPassCwd] = useState(initial?.passCwd !== false)
  const [error, setError] = useState('')

  const hoverVar = 'var(--dsw-hover, rgba(0,0,0,0.05))'
  const borderVar = 'var(--dsw-border-strong, rgba(0,0,0,0.12))'
  const textVar = 'var(--dsw-fg, inherit)'
  const dangerColor = 'var(--dsw-alias-danger, #e53e3e)'
  const secondaryColor = 'var(--dsw-alias-label-secondary, #666)'
  const brandColor = 'var(--dsw-alias-brand-primary, #4f8cff)'
  const brandAlpha = 'var(--dsw-alias-brand-primary-alpha, rgba(79, 140, 255, 0.06))'
  const inputBg = 'var(--dsw-specific-input, transparent)'

  /** 去掉用户偶发的包裹引号，再校验必填。 */
  const submit = (): void => {
    const trimmedName = name.trim()
    let trimmedPath = path.trim()
    if ((trimmedPath.startsWith('"') && trimmedPath.endsWith('"'))
      || (trimmedPath.startsWith("'") && trimmedPath.endsWith("'"))) {
      trimmedPath = trimmedPath.slice(1, -1)
    }
    if (!trimmedName) { setError(t('settings.edit.namePlaceholder')); return }
    if (!trimmedPath) { setError(t('settings.edit.pathPlaceholder')); return }
    setError('')
    onSubmit({ name: trimmedName, path: trimmedPath, passCwd })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    if (e.key === 'Enter') { e.preventDefault(); submit() }
  }

  return (
    <div
      onKeyDown={onKeyDown}
      style={{
        display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px',
        border: `1px solid ${brandColor}`, borderRadius: '8px', background: brandAlpha,
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: secondaryColor }}>
            {t('settings.edit.namePlaceholder')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder={initial === null ? t('settings.edit.namePlaceholder') : undefined}
            autoFocus
            style={{
              height: '30px', padding: '0 8px', width: '100%', boxSizing: 'border-box',
              border: `1px solid ${borderVar}`, borderRadius: '4px',
              background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto', minWidth: 0 }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: secondaryColor }}>
            {t('settings.edit.pathPlaceholder')}
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => { setPath(e.target.value); setError('') }}
            placeholder={initial === null ? t('settings.edit.pathPlaceholder') : undefined}
            style={{
              height: '30px', padding: '0 8px',
              border: `1px solid ${borderVar}`, borderRadius: '4px',
              background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
              width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'flex-end', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: secondaryColor, whiteSpace: 'nowrap' }}>
            {t('settings.edit.passCwd')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', height: '30px' }}>
            <Switch
              checked={passCwd}
              onChange={setPassCwd}
              label={t('settings.edit.passCwd')}
            />
          </div>
        </div>
      </div>
      {error && (
        <span style={{ fontSize: '11px', color: dangerColor }}>{error}</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            height: '28px', padding: '0 12px',
            border: `1px solid ${borderVar}`, borderRadius: '4px',
            background: 'transparent', color: textVar, cursor: 'pointer', fontSize: '12px',
          }}
        >
          {t('settings.cancel')}
        </button>
        <button
          type="button"
          onClick={submit}
          style={{
            height: '28px', padding: '0 12px', border: 'none', borderRadius: '4px',
            background: brandColor, color: '#fff',
            cursor: 'pointer', fontSize: '12px', fontWeight: 500,
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

// ── 主组件 ───────────────────────────────────────────────────────────────────

export function OpenWithSettings({ load, save, iconUrl, peers, loadBuiltins, setBuiltin, t }: OpenWithSettingsProps): JSX.Element {
  const [settings, setSettings] = useState<OpenWithSettingsDoc>(defaultSettings)
  // 统一的添加/编辑表单状态：formItemId 为 null 时隐藏，'__add__' 时添加，否则为编辑项 id
  const [formItemId, setFormItemId] = useState<string | null>(null)
  // 拖拽排序状态
  const [dragState, setDragState] = useState<{ itemId: string } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // 按钮顺序输入框的文本态（允许中途为空或只输入负号，提交时才归一化）
  const [orderText, setOrderText] = useState(String(DEFAULT_ORDER))
  // 两个槽位里已注册组件的快照，用于对照本插件按钮的落点
  const [peerList, setPeerList] = useState<readonly OpenWithPeer[]>([])
  // 内置 open-in-app 这一对的启用状态；null = 尚未读取
  const [builtins, setBuiltins] = useState<OpenWithBuiltinsPayload | null>(null)
  const [builtinBusy, setBuiltinBusy] = useState(false)
  const [builtinError, setBuiltinError] = useState('')
  // 最近一次保存失败的原因；空串表示没有失败
  const [saveError, setSaveError] = useState('')
  // 保存的发出序号：并发保存时只允许最后一次发出的请求校正本地状态
  const saveSeq = useRef(0)
  // 「恢复默认」的两步确认：首次点击只是待命，再点一下才真正执行
  const [restoreArmed, setRestoreArmed] = useState(false)
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 注入面每次渲染都会给出新的函数引用：固定到 ref，避免加载 effect 反复触发
  // （反复 GET 会与保存的 POST 竞态，把刚写入的值覆盖回旧值）。
  const loadRef = useRef(load)
  loadRef.current = load
  const saveRef = useRef(save)
  saveRef.current = save
  const peersRef = useRef(peers)
  peersRef.current = peers
  const loadBuiltinsRef = useRef(loadBuiltins)
  loadBuiltinsRef.current = loadBuiltins
  const setBuiltinRef = useRef(setBuiltin)
  setBuiltinRef.current = setBuiltin

  // 挂载时从 host 端加载设置
  useEffect(() => {
    loadRef.current().then((payload) => {
      setSettings(payload.settings)
    }).catch(() => { })
  }, [])

  // 挂载时快照同槽位组件（其他插件可能稍后才注册，故另给刷新入口）
  useEffect(() => { setPeerList(peersRef.current()) }, [])

  // 读取内置插件的启用状态；切换后或外部改过 patch 后都用它同步
  const refreshBuiltins = useCallback(() => {
    setBuiltinError('')
    loadBuiltinsRef.current()
      .then((payload) => { setBuiltins(payload) })
      .catch((err: unknown) => { setBuiltinError(err instanceof Error ? err.message : String(err)) })
  }, [])

  // 挂载时读取一次内置插件状态
  useEffect(() => { refreshBuiltins() }, [refreshBuiltins])

  // 外部（加载/保存返回）刷新后的顺序回写输入框
  useEffect(() => { setOrderText(String(settings.order)) }, [settings.order])

  /**
   * 落盘一份新文档，并让界面停在 host 真正持有的那份上。
   *
   * 先乐观更新，拖拽、开关这类操作才能即时可见；随后用 host 回传的归一化
   * 文档校正（host 会校正 id、收敛顺序）。
   *
   * 连续编辑会并发发出多个请求，而响应不保证按序返回，所以用序号守卫：
   * 只有最后一次发出的请求有权写回状态，否则一个慢响应会把更新的一次覆盖
   * 回去。失败时退回 host 实际持有的文档并亮出原因 —— 停在只存在于屏幕上
   * 的状态，等于让用户以为改动已经生效。
   */
  const persist = useCallback((next: OpenWithSettingsDoc) => {
    setSettings(next)
    const seq = ++saveSeq.current
    setSaveError('')
    void saveRef.current(next)
      .then((saved) => {
        if (seq !== saveSeq.current) return
        setSettings(saved)
      })
      .catch((err: unknown) => {
        if (seq !== saveSeq.current) return
        setSaveError(err instanceof Error ? err.message : String(err))
        void loadRef.current()
          .then((payload) => {
            if (seq !== saveSeq.current) return
            setSettings(payload.settings)
          })
          .catch(() => {
            // 回读也失败时保持现状：上面的横幅已经说明了问题。
          })
      })
  }, [])

  /** 收起「恢复默认」的待命态（超时、真正执行、或组件卸载时都要收）。 */
  const disarmRestore = useCallback(() => {
    if (restoreTimer.current !== null) {
      clearTimeout(restoreTimer.current)
      restoreTimer.current = null
    }
    setRestoreArmed(false)
  }, [])

  // 待命计时器必须在卸载时清掉：留着就是一次卸载后的 setState。
  useEffect(() => disarmRestore, [disarmRestore])

  /**
   * 把启动器列表恢复成内置的默认项。
   *
   * 只动 `items` —— 按钮位置与按钮顺序属于另外两节，各有自己的控件，不该被
   * 这个按钮顺带重置。
   *
   * 两个引用要跟着收敛，否则会留下指向已不存在项的悬空 id：
   * - `currentId` 指向被移除的自定义项时，回落到第一个默认项；
   * - `hiddenIds` 中属于自定义项的 id 一并清掉，而用户对**默认项**的隐藏
   *   选择保留 —— 那是他的意愿，不在这次重置的范围内。
   */
  const restoreDefaults = useCallback(() => {
    const defaults = DEFAULT_ITEMS.map((item) => ({ ...item }))
    const ids = new Set(defaults.map((item) => item.id))
    persist({
      ...settings,
      items: defaults,
      currentId: ids.has(settings.currentId) ? settings.currentId : defaults[0].id,
      hiddenIds: settings.hiddenIds.filter((id) => ids.has(id)),
    })
  }, [settings, persist])

  // 首次点击进入待命（3 秒后自动收起），第二次点击才执行 —— 这个按钮会丢掉
  // 所有自定义启动器，一次误触不该造成损失。
  const onRestoreClick = useCallback(() => {
    if (restoreArmed) {
      disarmRestore()
      restoreDefaults()
      return
    }
    if (restoreTimer.current !== null) clearTimeout(restoreTimer.current)
    setRestoreArmed(true)
    restoreTimer.current = setTimeout(() => {
      restoreTimer.current = null
      setRestoreArmed(false)
    }, 3000)
  }, [restoreArmed, disarmRestore, restoreDefaults])

  // 选择当前项（点击卡片切换）
  const selectCurrent = useCallback((item: OpenWithItem) => {
    persist({ ...settings, currentId: item.id })
  }, [settings, persist])

  // 删除项（同时清理隐藏状态）
  const removeItem = useCallback((id: string) => {
    const nextItems = settings.items.filter((it) => it.id !== id)
    const nextCurrentId = settings.currentId === id
      ? (nextItems[0]?.id ?? 'code')
      : settings.currentId
    const nextHiddenIds = settings.hiddenIds.filter((hid) => hid !== id)
    persist({ ...settings, currentId: nextCurrentId, items: nextItems, hiddenIds: nextHiddenIds })
  }, [settings, persist])

  // 切换项在胶囊菜单中的可见性（预设/自定义均可）
  const toggleHidden = useCallback((id: string) => {
    const nextHiddenIds = settings.hiddenIds.includes(id)
      ? settings.hiddenIds.filter((hid) => hid !== id)
      : [...settings.hiddenIds, id]
    persist({ ...settings, hiddenIds: nextHiddenIds })
  }, [settings, persist])

  // ── 拖拽排序 ────────────────────────────────────────────────────────────
  /** 在同组内移动 item */
  const moveItem = useCallback((fromIndex: number, toIndex: number): void => {
    const nextItems = [...settings.items]
    const [moved] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, moved)
    persist({ ...settings, items: nextItems })
  }, [settings, persist])

  const onDragStart = (e: DragEvent<HTMLDivElement>, itemId: string): void => {
    setDragState({ itemId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const onDragEnd = (): void => {
    setDragState(null)
    setDragOverIndex(null)
  }

  /** 容器级 onDragOver：根据鼠标 Y 坐标计算插入位置 */
  const onGroupDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (!dragState) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const container = e.currentTarget
    const children = Array.from(container.querySelectorAll('[data-drag-item]'))
    if (children.length === 0) return
    const mouseY = e.clientY
    let insertIndex = children.length
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      if (mouseY < midY) {
        insertIndex = i
        break
      }
    }
    setDragOverIndex(insertIndex)
  }

  /** 容器级 onDrop：根据 dragOverIndex 执行重排 */
  const onGroupDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    if (!dragState) return
    const fromId = dragState.itemId
    const targetIdx = dragOverIndex
    setDragState(null)
    setDragOverIndex(null)
    if (targetIdx === null) return
    const allItems = settings.items
    const fromIndex = allItems.findIndex((it) => it.id === fromId)
    if (fromIndex === -1) return
    let toIndex = targetIdx
    // 如果拖到自身或自身下方，需调整目标索引
    if (fromIndex < toIndex) toIndex -= 1
    if (fromIndex === toIndex) return
    moveItem(fromIndex, toIndex)
  }

  // 打开表单：无参数时为添加，传 item 时为编辑
  const openForm = useCallback((item?: OpenWithItem) => {
    setFormItemId(item ? item.id : '__add__')
  }, [])

  // 关闭表单
  const closeForm = useCallback(() => {
    setFormItemId(null)
  }, [])

  // 提交表单：添加或编辑（立即保存并关闭）
  const submitForm = useCallback((value: ItemFormValue) => {
    if (formItemId === null) return
    const { name, path, passCwd } = value

    if (formItemId === '__add__') {
      const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newItem: OpenWithItem = {
        id: newId, name, path,
        ...(passCwd ? {} : { passCwd: false }),
      }
      persist({ ...settings, items: [...settings.items, newItem] })
    } else {
      const nextItems = settings.items.map((it) => {
        if (it.id !== formItemId) return it
        const merged: OpenWithItem = { ...it, name, path }
        delete (merged as { passCwd?: boolean }).passCwd
        return passCwd ? merged : { ...merged, passCwd: false }
      })
      persist({ ...settings, items: nextItems })
    }
    closeForm()
  }, [formItemId, settings, persist, closeForm])

  // 提交按钮顺序：归一化后保存；非法或未变则回退显示
  const commitOrder = useCallback(() => {
    const raw = orderText.trim()
    const parsed = raw === '' ? null : normalizeOrder(Number(raw))
    if (parsed === null || parsed === settings.order) {
      setOrderText(String(settings.order))
      return
    }
    persist({ ...settings, order: parsed })
  }, [orderText, settings, persist])

  // 一起切换内置 open-in-app 的两个半边，并用 host 返回的状态回填
  const toggleBuiltin = useCallback((enabled: boolean) => {
    setBuiltinBusy(true)
    setBuiltinError('')
    setBuiltinRef.current(enabled).then((payload) => {
      setBuiltins(payload)
    }).catch((err: unknown) => {
      setBuiltinError(err instanceof Error ? err.message : String(err))
    }).finally(() => {
      setBuiltinBusy(false)
    })
  }, [])

  // 表单键盘事件由 ItemForm 内部处理，这里不再持有全局表单草稿。

  // ── 样式变量 ──────────────────────────────────────────────────────────────
  const hoverVar = 'var(--dsw-hover, rgba(0,0,0,0.05))'
  const borderVar = 'var(--dsw-border-strong, rgba(0,0,0,0.12))'
  const textVar = 'var(--dsw-fg, inherit)'
  const dangerColor = 'var(--dsw-alias-danger, #e53e3e)'
  const secondaryColor = 'var(--dsw-alias-label-secondary, #666)'
  const tertiaryColor = 'var(--dsw-alias-label-tertiary, #999)'
  const brandColor = 'var(--dsw-alias-brand-primary, #4f8cff)'
  const brandAlpha = 'var(--dsw-alias-brand-primary-alpha, rgba(79, 140, 255, 0.06))'
  const inputBg = 'var(--dsw-specific-input, transparent)'

  const allItems = settings.items

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/*
        ── 保存失败横幅 ─────────────────────────────────────────────────────────
      */}
      {saveError !== '' && (
        <div
          role="alert"
          style={{
            padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
            border: `1px solid ${dangerColor}`, color: dangerColor,
            background: 'var(--dsw-alias-danger-alpha, rgba(229, 62, 62, 0.06))',
            wordBreak: 'break-all',
          }}
        >
          {t('settings.save.failed')} {saveError}
        </div>
      )}

      {/*
        ── 按钮位置 / 按钮顺序 / 内置插件 ───────────────────────────────────────────────
      */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '24px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 1 auto', minWidth: 0 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
            {t('settings.placement.title')}
          </label>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '2px', alignSelf: 'flex-start',
              padding: '2px', border: `1px solid ${borderVar}`, borderRadius: '6px',
            }}
          >
            {PLACEMENT_OPTIONS.map((option) => {
              const active = settings.placement === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { persist({ ...settings, placement: option.value }) }}
                  style={{
                    height: '30px', padding: '0 8px', border: `1px solid ${borderVar}`, borderRadius: '6px',
                    background: active ? brandColor : 'transparent',
                    color: active ? '#fff' : textVar,
                    cursor: 'pointer', fontSize: '12px', fontWeight: active ? 500 : 400,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {t(option.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 1 auto', minWidth: 0 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
            {t('settings.order.title')}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={orderText}
            onChange={(e) => { setOrderText(e.target.value) }}
            onBlur={commitOrder}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitOrder() } }}
            style={{
              width: '70px', height: '30px', padding: '0 8px',
              border: `1px solid ${borderVar}`, borderRadius: '6px',
              background: inputBg, color: textVar, fontSize: '12px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 auto', minWidth: 0 }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
            {t('settings.builtins.title')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '30px' }}>
            {builtins === null
              ? <span style={{ fontSize: '11px', color: tertiaryColor }}>{t('settings.builtins.loading')}</span>
              : !builtins.available
                ? <span style={{ fontSize: '11px', color: tertiaryColor }}>
                  {builtins.stale === true ? t('settings.builtins.stale') : t('settings.builtins.unavailable')}
                </span>
                : (() => {
                  const note = !builtins.present
                    ? t('settings.builtins.missing')
                    : builtins.readOnlyReason === 'management-required'
                      ? t('settings.builtins.readOnlyManagement')
                      : builtins.readOnlyReason === 'unaddressable'
                        ? t('settings.builtins.readOnlyUnaddressable')
                        : ''
                  return (
                    <>
                      <span style={{ fontSize: '11px', color: tertiaryColor }}>
                        {(builtins.enabled ? t('settings.builtins.on') : t('settings.builtins.off'))
                          + (note === '' ? '' : ` · ${note}`)}
                      </span>
                      <Switch
                        checked={builtins.enabled}
                        disabled={!builtins.present || builtins.readOnly || builtinBusy}
                        onChange={(next: boolean) => { toggleBuiltin(next) }}
                        label={t('settings.builtins.title')}
                      />
                    </>
                  )
                })()}
          </div>
          {builtinError !== '' && (
            <span style={{ fontSize: '11px', color: dangerColor, marginTop: '4px' }}>{builtinError}</span>
          )}
        </div>
      </div>

      {/*
        ── 同槽位组件 ────────────────────────────────────────────────────────
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor }}>
            {t('settings.peers.title')}
          </label>
          <button
            type="button"
            onClick={() => { setPeerList(peersRef.current()) }}
            style={{
              height: '22px', padding: '0 8px', border: `1px solid ${borderVar}`,
              borderRadius: '4px', background: 'transparent', color: secondaryColor,
              cursor: 'pointer', fontSize: '11px',
            }}
          >
            {t('settings.peers.refresh')}
          </button>
        </div>
        {PLACEMENT_OPTIONS.map((option) => {
          const rows = peerList.filter((peer) => peer.slot === option.value)
          return (
            <div key={option.value} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: tertiaryColor }}>{t(option.labelKey)}</span>
              {rows.length === 0
                ? <span style={{ fontSize: '11px', color: tertiaryColor }}>{t('settings.peers.empty')}</span>
                : rows.map((peer) => (
                  <div
                    key={`${peer.slot}-${peer.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '3px 8px', borderRadius: '4px',
                      background: peer.self ? brandAlpha : 'transparent',
                      border: `1px solid ${peer.self ? brandColor : 'transparent'}`,
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: peer.self ? brandColor : textVar, fontWeight: peer.self ? 500 : 400 }}>
                      {peer.self ? `${peer.id} · ${t('settings.peers.self')}` : peer.id}
                    </span>
                    <span style={{ marginLeft: 'auto', color: secondaryColor, fontVariantNumeric: 'tabular-nums' }}>
                      {`order ${String(peer.order)} · priority ${String(peer.priority)}`}
                    </span>
                  </div>
                ))}
            </div>
          )
        })}
      </div>

      {/*
        ── 启动器 ────────────────────────────────────────────────────────────
      */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
        onDragOver={onGroupDragOver}
        onDrop={onGroupDrop}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor }}>
            {t('settings.items.title')}
          </label>
          <button
            type="button"
            onClick={onRestoreClick}
            style={{
              marginLeft: 'auto',
              height: '22px', padding: '0 8px',
              border: `1px solid ${restoreArmed ? dangerColor : borderVar}`,
              borderRadius: '4px', background: 'transparent',
              color: restoreArmed ? dangerColor : secondaryColor,
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t(restoreArmed ? 'settings.items.restoreConfirm' : 'settings.items.restore')}
          </button>
        </div>

        {allItems.length === 0 && formItemId !== '__add__' && (
          <span style={{ fontSize: '12px', color: tertiaryColor, padding: '4px 0' }}>
            {t('settings.noItems')}
          </span>
        )}

        {allItems.map((item, itemIndex) => {
          const isActive = item.id === settings.currentId
          const isEditing = item.id === formItemId
          const isDragging = dragState?.itemId === item.id
          const showInsertBefore = dragState !== null && dragOverIndex === itemIndex

          // 编辑模式：显示内联编辑表单
          if (isEditing) {
            return <ItemForm key={`edit-${item.id}`} initial={item} submitLabel={t('settings.save')} onCancel={closeForm} onSubmit={submitForm} t={t} />
          }

          // 正常模式：显示卡片
          return (
            <Fragment key={item.id}>
              {showInsertBefore && <InsertionLine color={brandColor} />}
              <div
                data-drag-item
                role="button"
                tabIndex={0}
                draggable
                onClick={() => selectCurrent(item)}
                onDragStart={(e) => onDragStart(e, item.id)}
                onDragEnd={onDragEnd}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCurrent(item) } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px',
                  border: `1px solid ${isActive ? brandColor : borderVar}`,
                  borderRadius: '8px',
                  background: isActive ? brandAlpha : 'transparent',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.4 : 1,
                  transition: 'border-color 0.15s, background 0.15s, opacity 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = hoverVar }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span
                  style={{
                    display: 'flex', alignItems: 'center', color: tertiaryColor, fontSize: '13px',
                    cursor: 'grab', userSelect: 'none', flexShrink: 0, lineHeight: 1,
                  }}
                  title={t('settings.dragTip') as string}
                >
                  ⋮⋮
                </span>
                <ItemIcon src={iconUrl(item.id)} size={20} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>
                    {item.name}
                    {isActive && (
                      <span style={{ fontSize: '10px', color: brandColor, marginLeft: '6px', fontWeight: 600 }}>
                        ✓ {t('settings.current.title')}
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: '11px', color: tertiaryColor,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.path}
                  </span>
                </div>
                <span
                  onClick={(e) => { e.stopPropagation() }}
                  style={{ display: 'flex', flexShrink: 0 }}
                >
                  <Switch
                    checked={!settings.hiddenIds.includes(item.id)}
                    onChange={() => { toggleHidden(item.id) }}
                    label={settings.hiddenIds.includes(item.id) ? t('settings.show') : t('settings.hide')}
                  />
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openForm(item) }}
                  title={t('settings.edit')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px',
                    background: 'transparent', color: secondaryColor, cursor: 'pointer',
                    fontSize: '14px', opacity: 0.6, transition: 'opacity 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = hoverVar }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent' }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                  title={t('settings.delete')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px',
                    background: 'transparent', color: dangerColor, cursor: 'pointer',
                    fontSize: '14px', opacity: 0.6, transition: 'opacity 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = hoverVar }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent' }}
                >
                  ✕
                </button>
              </div>
            </Fragment>
          )
        })}
        {dragState !== null && dragOverIndex === allItems.length && (
          <InsertionLine color={brandColor} />
        )}

        {/*
          ── 添加按钮 / 表单 ─────────────────────────────────────────────────
        */}
        {formItemId !== '__add__' ? (
          <button
            type="button"
            onClick={() => openForm()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '10px 0',
              border: `1px dashed ${borderVar}`, borderRadius: '8px',
              background: 'transparent', color: secondaryColor, cursor: 'pointer',
              fontSize: '13px', transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = hoverVar
              e.currentTarget.style.borderColor = brandColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = borderVar
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            <span>{t('settings.items.add')}</span>
          </button>
        ) : (
          <ItemForm key="add" initial={null} submitLabel={t('settings.items.add')} onCancel={closeForm} onSubmit={submitForm} t={t} />
        )}
      </div>
    </div>
  )
}