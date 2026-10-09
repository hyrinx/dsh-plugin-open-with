/**
 * Capsule split button: the left half launches the current item, the right
 * half opens a picker menu.
 *
 * The menu is DSH's `Menu` primitive with `portal` enabled, so the list mounts
 * on `document.body` and is positioned from the anchor rect — the session
 * header's `container-type` and stacking context would otherwise clip it.
 *
 * Menu contents are re-read from the host every time the menu opens, so a
 * settings change is visible without a page reload.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { OpenWithItem, OpenWithSettings, OpenWithSettingsPayload } from '../shared.ts'
import { FALLBACK_ICON_DATA_URL } from './fallback-icon.ts'
import type { OpenWithLogLevel } from './controller.ts'

/** Session-header slots this button can mount into, chosen by the settings page. */
export type HeaderActionSlot =
  | 'conversation.session.header.actions'
  | 'conversation.session.header.utilities'

/** Host capabilities supplied to the button through its slot registration. */
export interface OpenWithInjected {
  /** Read the settings document (and its resolved preset paths) from the host. */
  getSettings: () => Promise<OpenWithSettingsPayload>
  /** Launch one item on the session's workspace directory. */
  launch: (target: string, path: string) => Promise<void>
  /** The session's workspace directory, or undefined when the session is unknown. */
  getCwd: (sessionId: string) => string | undefined
  /** Mirror one line into the browser console and the host log file. */
  log: (level: OpenWithLogLevel, message: string, extra?: unknown) => void
  /** Document-relative URL of one item's icon. */
  iconUrl: (id: string) => string
}

export type OpenWithButtonProps =
  PropsRuntime<HeaderActionSlot>
  & PropsLocale<'openWith'>
  & InjectFace<OpenWithInjected>

/** Chevron drawn inline, so the control carries no icon-package dependency. */
function Chevron({ size = 12, open }: { size?: number; open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        display: 'block',
        transition: 'transform 0.15s',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <path
        d="M3.5 6 8 10.5 12.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** One item's icon, falling back to the bundled glyph when nothing loads. */
function ItemIcon({ src, size = 14 }: { src: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const source = src.length > 0 && !failed ? src : FALLBACK_ICON_DATA_URL
  return (
    <img
      src={source}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      onError={() => { setFailed(true) }}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
    />
  )
}

/**
 * Render the split button.
 * @param props - session identity, localized copy, and the injected host face.
 * @returns the control, or null while the first settings read is in flight.
 */
export function OpenWithButton({
  sessionId, getSettings, launch, getCwd, log, iconUrl, t,
}: OpenWithButtonProps) {
  const [settings, setSettings] = useState<OpenWithSettings | null>(null)
  const [override, setOverride] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // 注入面每次渲染都会给出新的函数引用：固定到 ref，让 reload 保持稳定，
  // 否则挂载 effect 会在每次渲染后重新读取，形成请求循环。
  const getSettingsRef = useRef(getSettings)
  getSettingsRef.current = getSettings
  const logRef = useRef(log)
  logRef.current = log

  const reload = useCallback((): void => {
    getSettingsRef.current().then((payload) => { setSettings(payload.settings) })
      .catch((err: unknown) => { logRef.current('warn', 'settings read failed', err) })
  }, [])

  useEffect(() => { reload() }, [reload])

  /** Localized label: all items use the same pattern. */
  const labelOf = (item: OpenWithItem): string => `${t('label')} ${item.name}`

  const visibleItems = settings === null
    ? []
    : settings.items.filter(item => !settings.hiddenIds.includes(item.id))
  const preferred = override ?? settings?.currentId
  const current = visibleItems.find(item => item.id === preferred) ?? visibleItems[0]

  const run = useCallback((target: string): void => {
    if (busy) return
    const cwd = getCwd(sessionId)
    if (cwd === undefined || cwd.length === 0) {
      log('warn', 'workspace directory unavailable for session', { sessionId })
      return
    }
    setBusy(true)
    log('info', 'launch requested', { sessionId, target, cwd })
    void launch(target, cwd)
      .then(() => { log('info', 'launch accepted', { target }) })
      .catch((err: unknown) => { log('error', 'launch failed', { target, err }) })
      .finally(() => { setBusy(false) })
  }, [busy, getCwd, launch, log, sessionId])

  const onPrimary = (): void => {
    setOpen(false)
    if (current !== undefined) run(current.id)
  }

  const onChevron = (): void => {
    if (!open) reload()
    setOpen(value => !value)
  }

  const onSelect = (id: string): void => {
    setOpen(false)
    setOverride(id)
    run(id)
  }

  const borderVar = 'var(--dsw-alias-border-l2, rgba(0,0,0,0.12))'
  const hoverVar = 'var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,0.05))'
  const textVar = 'var(--dsw-alias-label-primary, inherit)'

  const halfStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    font: 'inherit',
  } as const

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', height: '28px' }}>
      <Menu
        open={open}
        portal
        dense
        autoFocus
        align="end"
        onClose={() => { setOpen(false) }}
        selectedId={current?.id ?? ''}
        items={visibleItems.length > 0
          ? visibleItems.map(item => ({
              id: item.id,
              icon: <ItemIcon src={iconUrl(item.id)} />,
              label: labelOf(item),
            }))
          : [{ id: '__empty__', label: t('menu.empty'), disabled: true }]}
        onSelect={onSelect}
        anchor={(
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'stretch',
              height: '28px',
              borderRadius: '6px',
              border: `1px solid ${borderVar}`,
              color: textVar,
              fontSize: '12px',
              // Rounds the two halves through the outer frame.
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={onPrimary}
              title={t('tooltip')}
              aria-label={current === undefined ? t('label') : labelOf(current)}
              style={{ ...halfStyle, gap: '4px', padding: '0 8px', borderRadius: '6px 0 0 6px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <ItemIcon src={current === undefined ? '' : iconUrl(current.id)} />
              <span style={{ whiteSpace: 'nowrap' }}>
                {current === undefined ? t('label') : labelOf(current)}
              </span>
            </button>
            <span aria-hidden="true" style={{ width: '1px', background: borderVar, flex: '0 0 auto' }} />
            <button
              type="button"
              onClick={onChevron}
              aria-label={t('picker.aria')}
              aria-haspopup="menu"
              aria-expanded={open}
              style={{ ...halfStyle, justifyContent: 'center', padding: '0 5px', borderRadius: '0 6px 6px 0' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Chevron open={open} />
            </button>
          </div>
        )}
      />
    </div>
  )
}