/**
 * OpenWith 设置页组件：在 DSH 设置面板中插入"打开方式"配置区域。
 *
 * 布局分为两部分：
 * - 上部：预设项卡片列表，支持拖拽排序（组内）、隐藏/显示切换
 * - 下部：自定义项列表 + 添加按钮，支持拖拽排序（组内）、隐藏/显示、
 *   编辑、删除，路径自动清除引号，图标后台提取
 *
 * 预设项与自定义项不能跨组拖拽，胶囊菜单排序 = 预设项排序 + 自定义项排序。
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
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

/** 默认应用图标（DSH logo），用于图标提取完成前的回退。 */
const appDefaultPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKDSURBVFhH7ZZJyI1xFMZ/yJQpMmRhDkkplCglWSAiUaadDSVDlI2FhZAyFAsbCSkiYqGQDBEbU4ayMC1E5qnMUw/nvY7j3O/e78PuPnW63TM9533P//zPCzXU8H/QEhgXlQ1FE6At0ML+K/kMYB9wF7gCdAoxc4A7Ftsg9Ac2AteA98AX4DPwBHgFfHMyJgYD28y2C+gajYbewLSoVMVrjcyT1CUjYxJgj7O/AcaavjMwHJgF3Ad2+yCR708IKsljYKJPBKwOPjeB9cCnoF/ug1YmyasVtWixyzUs8YmiGLX6BwYAHxOn+shXYJkrYnvi42WD8y0dmr8VFbHAcjYHdiQ+asMaPyFN3cl+av16lgRWKypihRGMcPpbwDygx6/n/onB5nAKaGw6/fa1vl5PSCKh7oJY9AXgiPt/OPCWMMUczkSDQcXo4nmQkEtuA4PssqprirbExAWmm8NDoFE0OnQEjieJP9iB0+2ndp5NfCRzY8IC451Tz2gMaAYcSJLr7Swyn35lJmpgyFWCZrFwWhiNCbQTziUE6rnekt7CxWBTm8pCPS4O0NUKbSjQDXieFPEWeJHoNRV1YqdznhyNZTA7IcrkdbIt/4AWShGgeW0VHRLoTR1KCKMsjYHl4GdWW6q4EwpofS4B2jldF5ueSFrI0fp8E/QJu36rHagCQ0wvQt+mUTaKkfwG0N75VYVJYWWeBno5+wnT6/bbbGMpzExW7TFgdJWH+jcomX+id8BBu8leBpLzwFAjmVBmAi4B3SNJJehQ3kuSlZNHtjP0CbbOCtM3oRbbXqBDJKgGbYBVyVNnogLmJwf3n6C1LSO14CRw2W46Tc0mYKr7Yq6hhnrjO8xVal7nQeXKAAAAAElFTkSuQmCC'

// ── 类型定义 ─────────────────────────────────────────────────────────────────

export interface OpenWithItem {
  id: string
  /** 显示名称 */
  name: string
  /** 可执行文件/目标路径 */
  path: string
  /** 图标 data URL（空串表示使用默认图标） */
  icon: string
  /** 是否为预设项（预设项不可删除） */
  preset: boolean
  /** 启动目标类型（预设项使用） */
  target?: LaunchTarget
}

export type LaunchTarget = 'code' | 'cmd' | 'powershell' | 'explorer'

export interface OpenWithSettings {
  /** 当前选中项的 id */
  currentId: string
  /** 所有项列表 */
  items: OpenWithItem[]
  /** 在胶囊菜单中隐藏的项 id（不在数组中的项均显示，预设/自定义均可） */
  hiddenIds: string[]
}

// ── 注入接口 ─────────────────────────────────────────────────────────────────

export interface OpenWithSettingsInjected {
  extractIcon: (exePath: string) => Promise<string>
  /** 解析预设启动器的实际可执行文件路径。 */
  resolvePresetPath: (target: LaunchTarget) => Promise<string>
  /** 从 host 端读取设置文件。 */
  readSettings: () => Promise<OpenWithSettings | null>
  /** 写入设置到 host 端文件。 */
  writeSettings: (settings: OpenWithSettings) => Promise<void>
}

export type OpenWithSettingsProps =
  PropsLocale<'openWith'>
  & OpenWithSettingsInjected

// ── 预设项 ───────────────────────────────────────────────────────────────────

const PRESET_ITEMS: OpenWithItem[] = [
  { id: 'code', name: 'VS Code', path: 'code', icon: '', preset: true, target: 'code' },
  { id: 'cmd', name: 'Command Prompt', path: 'cmd', icon: '', preset: true, target: 'cmd' },
  { id: 'powershell', name: 'PowerShell', path: 'powershell', icon: '', preset: true, target: 'powershell' },
  { id: 'explorer', name: 'File Explorer', path: 'explorer', icon: '', preset: true, target: 'explorer' },
]

// ── 默认设置 ────────────────────────────────────────────────────────────────

function defaultSettings(): OpenWithSettings {
  return { currentId: 'code', items: [...PRESET_ITEMS], hiddenIds: [] }
}

// ── 图标组件 ─────────────────────────────────────────────────────────────────

function ItemIcon({ src, size = 20 }: { src: string; size?: number }) {
  const iconSrc = src || appDefaultPngDataUrl
  return (
    <img
      src={iconSrc}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size, imageRendering: '-webkit-optimize-contrast' }}
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

export function OpenWithSettings({ extractIcon, resolvePresetPath, readSettings, writeSettings, t }: OpenWithSettingsProps): JSX.Element {
  const [settings, setSettings] = useState<OpenWithSettings>(defaultSettings)
  const [resolvedPaths, setResolvedPaths] = useState<Record<string, string>>({})
  // 统一的添加/编辑表单状态：formItemId 为 null 时隐藏，'__add__' 时添加，否则为编辑项 id
  const [formItemId, setFormItemId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formPath, setFormPath] = useState('')
  const [formError, setFormError] = useState('')
  // 拖拽排序状态
  const [dragState, setDragState] = useState<{ itemId: string; group: 'preset' | 'custom' } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // 用 ref 保持 settings 最新引用，供后台图标提取回调使用
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  // 防止重复提取预设图标
  const extractedPresets = useRef<Set<string>>(new Set())

  // 挂载时解析所有预设项的实际路径
  useEffect(() => {
    const targets: LaunchTarget[] = ['code', 'cmd', 'powershell', 'explorer']
    for (const target of targets) {
      resolvePresetPath(target).then((presetPath: string) => {
        if (presetPath) {
          setResolvedPaths((prev) => ({ ...prev, [target]: presetPath }))
        }
      })
    }
  }, [resolvePresetPath])

  // 挂载时从 host 端加载持久化设置
  useEffect(() => {
    readSettings().then((loaded: OpenWithSettings | null) => {
      if (loaded && loaded.currentId && loaded.items) {
        // 确保预设项始终存在
        const items = [...loaded.items]
        for (const preset of PRESET_ITEMS) {
          if (!items.find((it: OpenWithItem) => it.id === preset.id)) {
            items.push(preset)
          }
        }
        setSettings({ currentId: loaded.currentId, items, hiddenIds: loaded.hiddenIds ?? [] })
      }
    })
  }, [readSettings])

  const persist = useCallback((next: OpenWithSettings) => {
    setSettings(next)
    writeSettings(next).catch(() => {})
  }, [writeSettings])

  // 为无图标的预设项从本地 exe 提取图标（运行时，不再内置 base64）
  useEffect(() => {
    const presets = settingsRef.current.items.filter((it) => it.preset && it.target && !it.icon)
    for (const p of presets) {
      if (extractedPresets.current.has(p.id)) continue
      const exePath = resolvedPaths[p.target!]
      if (!exePath) continue
      extractedPresets.current.add(p.id)
      extractIcon(exePath).then((icon) => {
        if (!icon) return
        const cur = settingsRef.current
        const nextItems = cur.items.map((it) =>
          it.id === p.id ? { ...it, icon } : it
        )
        const next: OpenWithSettings = { ...cur, items: nextItems }
        setSettings(next)
        writeSettings(next).catch(() => {})
      })
    }
  }, [resolvedPaths, settings.items, extractIcon, writeSettings])

  // 选择当前项（点击卡片切换）
  const selectCurrent = useCallback((item: OpenWithItem) => {
    persist({ ...settings, currentId: item.id })
  }, [settings, persist])

  // 删除自定义项（同时清理图标和隐藏状态）
  const removeItem = useCallback((id: string) => {
    const nextItems = settings.items.filter((it) => it.id !== id)
    const nextCurrentId = settings.currentId === id
      ? (nextItems[0]?.id ?? 'code')
      : settings.currentId
    const nextHiddenIds = settings.hiddenIds.filter((hid) => hid !== id)
    persist({ currentId: nextCurrentId, items: nextItems, hiddenIds: nextHiddenIds })
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

  const onDragStart = (e: DragEvent<HTMLDivElement>, itemId: string, group: 'preset' | 'custom'): void => {
    setDragState({ itemId, group })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  const onDragEnd = (): void => {
    setDragState(null)
    setDragOverIndex(null)
  }

  /** 容器级 onDragOver：根据鼠标 Y 坐标计算插入位置 */
  const onGroupDragOver = (e: DragEvent<HTMLDivElement>, group: 'preset' | 'custom'): void => {
    if (!dragState || dragState.group !== group) return
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
  const onGroupDrop = (e: DragEvent<HTMLDivElement>, group: 'preset' | 'custom'): void => {
    e.preventDefault()
    if (!dragState || dragState.group !== group) return
    const fromId = dragState.itemId
    const targetIdx = dragOverIndex
    setDragState(null)
    setDragOverIndex(null)
    if (targetIdx === null) return
    const allItems = settings.items
    const fromIndex = allItems.findIndex((it) => it.id === fromId)
    if (fromIndex === -1) return
    // 将组内相对索引转换为 allItems 绝对索引
    const groupBaseIndex = group === 'preset'
      ? 0
      : allItems.findIndex((it) => !it.preset)
    let toIndex = groupBaseIndex + targetIdx
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
    } else {
      setFormItemId('__add__')
      setFormName('')
      setFormPath('')
    }
    setFormError('')
  }, [])

  // 关闭表单
  const closeForm = useCallback(() => {
    setFormItemId(null)
    setFormName('')
    setFormPath('')
    setFormError('')
  }, [])

  // 提交表单：添加或编辑（立即保存并关闭，图标后台提取）
  const submitForm = useCallback(async () => {
    if (formItemId === null) return
    const name = formName.trim()
    // 自动清除路径两端的引号（用户从资源管理器复制路径时常带引号）
    let path = formPath.trim()
    if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
      path = path.slice(1, -1)
    }
    if (!name) { setFormError(t('settings.custom.namePlaceholder')); return }
    if (!path) { setFormError(t('settings.custom.pathPlaceholder')); return }
    setFormError('')

    if (formItemId === '__add__') {
      // 添加新项：立即保存（空图标），关闭表单，后台提取图标
      const newId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const newItem: OpenWithItem = { id: newId, name, path, icon: '', preset: false }
      persist({
        currentId: settings.currentId,
        items: [...settings.items, newItem],
        hiddenIds: settings.hiddenIds,
      })
      closeForm()
      // 后台提取图标，完成后自动更新
      extractIcon(path).then((icon) => {
        if (!icon) return
        const cur = settingsRef.current
        const nextItems = cur.items.map((it) =>
          it.id === newId ? { ...it, icon } : it
        )
        persist({ ...cur, items: nextItems })
      }).catch(() => {})
    } else {
      // 编辑已有项：立即保存，关闭表单，路径变化时后台提取图标
      const oldItem = settings.items.find((it) => it.id === formItemId)
      const pathChanged = !!(oldItem && path !== oldItem.path)
      const icon = pathChanged ? '' : (oldItem?.icon ?? '')
      const nextItems = settings.items.map((it) =>
        it.id === formItemId ? { ...it, name, path, icon } : it
      )
      persist({ currentId: settings.currentId, items: nextItems, hiddenIds: settings.hiddenIds })
      closeForm()
      if (pathChanged) {
        const editId = formItemId
        extractIcon(path).then((icon) => {
          if (!icon) return
          const cur = settingsRef.current
          const nextItems = cur.items.map((it) =>
            it.id === editId ? { ...it, icon } : it
          )
          persist({ ...cur, items: nextItems })
        }).catch(() => {})
      }
    }
  }, [formItemId, formName, formPath, settings, persist, extractIcon, closeForm, t])

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

  const presetItems = settings.items.filter((it) => it.preset)
  const customItems = settings.items.filter((it) => !it.preset)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/*
        ── 预设项 ────────────────────────────────────────────────────────────
      */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
        onDragOver={(e) => onGroupDragOver(e, 'preset')}
        onDrop={(e) => onGroupDrop(e, 'preset')}
      >
        <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
          {t('settings.preset.title')}
        </label>

        {presetItems.map((item, itemIndex) => {
          const isActive = item.id === settings.currentId
          const isDragging = dragState?.itemId === item.id
          const showInsertBefore = dragState?.group === 'preset' && dragOverIndex === itemIndex
          return (
            <Fragment key={item.id}>
              {showInsertBefore && <InsertionLine color={brandColor} />}
              <div
                data-drag-item
                role="button"
                tabIndex={0}
                draggable
                onClick={() => selectCurrent(item)}
                onDragStart={(e) => onDragStart(e, item.id, 'preset')}
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
                <ItemIcon src={item.icon} size={20} />
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
                    {resolvedPaths[item.id] || item.path}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleHidden(item.id) }}
                  title={settings.hiddenIds.includes(item.id) ? t('settings.show') : t('settings.hide')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '24px', padding: 0, border: 'none', borderRadius: '4px',
                    background: 'transparent', color: settings.hiddenIds.includes(item.id) ? dangerColor : secondaryColor,
                    cursor: 'pointer', fontSize: '13px', opacity: 0.6, transition: 'opacity 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = hoverVar }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent' }}
                >
                  {settings.hiddenIds.includes(item.id) ? '👁‍🗨' : '👁'}
                </button>
              </div>
            </Fragment>
          )
        })}
        {dragState?.group === 'preset' && dragOverIndex === presetItems.length && (
          <InsertionLine color={brandColor} />
        )}
      </div>

      {/*
        ── 自定义项 ──────────────────────────────────────────────────────────
      */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
        onDragOver={(e) => onGroupDragOver(e, 'custom')}
        onDrop={(e) => onGroupDrop(e, 'custom')}
      >
        <label style={{ fontSize: '12px', fontWeight: 500, color: secondaryColor, marginBottom: '6px' }}>
          {t('settings.custom.title')}
        </label>

        {customItems.length === 0 && formItemId !== '__add__' && (
          <span style={{ fontSize: '12px', color: tertiaryColor, padding: '4px 0' }}>
            {t('settings.noCustom')}
          </span>
        )}

        {customItems.map((item, itemIndex) => {
          const isActive = item.id === settings.currentId
          const isEditing = item.id === formItemId
          const isDragging = dragState?.itemId === item.id
          const showInsertBefore = dragState?.group === 'custom' && dragOverIndex === itemIndex

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
                      {t('settings.custom.namePlaceholder')}
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
                      {t('settings.custom.pathPlaceholder')}
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
                onDragStart={(e) => onDragStart(e, item.id, 'custom')}
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
                <ItemIcon src={item.icon} size={20} />
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
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleHidden(item.id) }}
                  title={settings.hiddenIds.includes(item.id) ? t('settings.show') : t('settings.hide')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '24px', padding: 0, border: 'none', borderRadius: '4px',
                    background: 'transparent', color: settings.hiddenIds.includes(item.id) ? dangerColor : secondaryColor,
                    cursor: 'pointer', fontSize: '13px', opacity: 0.6, transition: 'opacity 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = hoverVar }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent' }}
                >
                  {settings.hiddenIds.includes(item.id) ? '👁‍🗨' : '👁'}
                </button>
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
        {dragState?.group === 'custom' && dragOverIndex === customItems.length && (
          <InsertionLine color={brandColor} />
        )}

        {/*
          ── 自定义添加按钮 / 表单 ───────────────────────────────────────────
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
            <span>{t('settings.custom.add')}</span>
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
                  {t('settings.custom.namePlaceholder')}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError('') }}
                  placeholder={t('settings.custom.namePlaceholder')}
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
                  {t('settings.custom.pathPlaceholder')}
                </label>
                <input
                  type="text"
                  value={formPath}
                  onChange={(e) => { setFormPath(e.target.value); setFormError('') }}
                  placeholder={t('settings.custom.pathPlaceholder')}
                  style={{
                    height: '30px', padding: '0 8px',
                    border: `1px solid ${borderVar}`, borderRadius: '4px',
                    background: inputBg, color: textVar, fontSize: '13px', outline: 'none',
                  }}
                />
              </div>
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
                {t('settings.custom.add')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}