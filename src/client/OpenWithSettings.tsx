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
  const [failed, setFailed] = useState(false)
  if (src.length === 0 || failed) {
    return <span style={{ display: 'block', width: size, height: size, flexShrink: 0 }} />
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      onError={() => { setFailed(true) }}
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

// ── 主组件 ───────────────────────────────────────────────────────────────────

export function OpenWithSettings({ load, save, iconUrl, peers, loadBuiltins, setBuiltin, t }: OpenWithSettingsProps): JSX.Element {
  const [settings, setSettings] = useState<OpenWithSettingsDoc>(defaultSettings)
  // 统一的添加/编辑表单状态：formItemId 为 null 时隐藏，'__add__' 时添加，否则为编辑项 id
  const [formItemId, setFormItemId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPath, setFormPath] = useState('')
  // 自定义项是否把会话目录作为参数传给启动器
  const [formPassCwd, setFormPassCwd] = useState(true)
  const [formError, setFormError] = useState('')
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

  const persist = useCallback((next: OpenWithSettingsDoc) => {
    setSettings(next)
    void saveRef.current(next).catch(() => { })
  }, [])

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
    if (item) {
      setFormItemId(item.id)
      setFormName(item.name)
      setFormPath(item.path)
      setFormPassCwd(item.passCwd !== false)
    } else {
      setFormItemId('__add__')
      setFormName('')
      setFormPath('')
      setFormPassCwd(true)
    }
    setFormError('')
  }, [])

  // 关闭表单
  const closeForm = useCallback(() => {
    setFormItemId(null)
    setFormName('')
    setFormPath('')
    setFormPassCwd(true)
    setFormError('')
  }, [])

  // 提交表单：添加或编辑（立即保存并关闭）
  const submitForm = useCallback(async () => {
    if (formItemId === null) return
    const name = formName.trim()
    let path = formPath.trim()
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
      path = path.slice(1, -1)
    }
    if (!name) { setFormError(t('settings.edit.namePlaceholder')); return }
    if (!path) { setFormError(t('settings.edit.pathPlaceholder')); return }
    setFormError('')

    if (formItemId === '__add__') {
      const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newItem: OpenWithItem = {
        id: newId, name, path,
        ...(formPassCwd ? {} : { passCwd: false }),
      }
      persist({ ...settings, items: [...settings.items, newItem] })
    } else {
      const nextItems = settings.items.map((it) => {
        if (it.id !== formItemId) return it
        const merged: OpenWithItem = { ...it, name, path }
        delete (merged as { passCwd?: boolean }).passCwd
        return formPassCwd ? merged : { ...merged, passCwd: false }
      })
      persist({ ...settings, items: nextItems })
    }
    closeForm()
  }, [formItemId, formName, formPath, formPassCwd, settings, persist, closeForm, t])

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

  // 表单键盘事件
  const onFormKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') closeForm()
    if (e.key === 'Enter') { e.preventDefault(); void submitForm() }
  }

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
        <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
          {t('settings.items.title')}
        </label>

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
            return (
              <div
                key={item.id}
                onKeyDown={onFormKeyDown}
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
                      value={formName}
                      onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                      autoFocus
                      style={{
                        height: '30px', padding: '0 8px',
                        border: `1px solid ${borderVar}`, borderRadius: '4px',
                        background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 500, color: secondaryColor }}>
                      {t('settings.edit.pathPlaceholder')}
                    </label>
                    <input
                      type="text"
                      value={formPath}
                      onChange={(e) => { setFormPath(e.target.value); setFormError('') }}
                      style={{
                        height: '30px', padding: '0 8px',
                        border: `1px solid ${borderVar}`, borderRadius: '4px',
                        background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: secondaryColor }}>
                    {t('settings.edit.passCwd')}
                  </span>
                  <Switch
                    checked={formPassCwd}
                    onChange={(next: boolean) => { setFormPassCwd(next) }}
                    label={t('settings.edit.passCwd')}
                  />
                </div>
                {formError && (
                  <span style={{ fontSize: '11px', color: dangerColor }}>{formError}</span>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={closeForm}
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
                    onClick={submitForm}
                    style={{
                      height: '28px', padding: '0 12px', border: 'none', borderRadius: '4px',
                      background: brandColor, color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px', fontWeight: 500,
                    }}
                  >
                    {t('settings.save')}
                  </button>
                </div>
              </div>
            )
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
          <div
            onKeyDown={onFormKeyDown}
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
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                  placeholder={t('settings.edit.namePlaceholder')}
                  autoFocus
                  style={{
                    height: '30px', padding: '0 8px',
                    border: `1px solid ${borderVar}`, borderRadius: '4px',
                    background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 500, color: secondaryColor }}>
                  {t('settings.edit.pathPlaceholder')}
                </label>
                <input
                  type="text"
                  value={formPath}
                  onChange={(e) => { setFormPath(e.target.value); setFormError('') }}
                  placeholder={t('settings.edit.pathPlaceholder')}
                  style={{
                    height: '30px', padding: '0 8px',
                    border: `1px solid ${borderVar}`, borderRadius: '4px',
                    background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: secondaryColor }}>
                {t('settings.edit.passCwd')}
              </span>
              <Switch
                checked={formPassCwd}
                onChange={(next: boolean) => { setFormPassCwd(next) }}
                label={t('settings.edit.passCwd')}
              />
            </div>
            {formError && (
              <span style={{ fontSize: '11px', color: dangerColor }}>{formError}</span>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={closeForm}
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
                onClick={submitForm}
                style={{
                  height: '28px', padding: '0 12px', border: 'none', borderRadius: '4px',
                  background: brandColor, color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px', fontWeight: 500,
                }}
              >
                {t('settings.items.add')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}