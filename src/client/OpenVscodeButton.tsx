/**
 * Capsule-style "Open" split-button for the conversation session header.
 *
 * Left: launches the currently chosen target (default = VS Code).
 * Right: chevron opening a three-item popover (VS Code / Terminal / Folder).
 */
import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { IconChevronDownOutline14, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { vscodePngDataUrl, terminalPngDataUrl, folderPngDataUrl } from '../assets.js'

type LaunchTarget = 'code' | 'cmd' | 'explorer'

export interface OpenWithInjected {
  launch: (cwd: string, target?: LaunchTarget) => Promise<RpcResult<unknown>>
  getCwd: (sessionId: string) => string | undefined
  log: (level: 'info' | 'warn' | 'error', message: string, extra?: unknown) => void
}

export type OpenWithButtonProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'openWith'>
  & InjectFace<OpenWithInjected>

/** Renders a data-URL PNG icon at a given size. */
function PngIcon({ src, size = 14 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        display: 'block',
        width: size,
        height: size,
        imageRendering: '-webkit-optimize-contrast',
        // @ts-expect-error — Firefox vendor prefix, harmless elsewhere.
        imageRendering: '-moz-crisp-edges',
      }}
    />
  )
}

function VscodeIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={vscodePngDataUrl} size={size} />
}
function TerminalIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={terminalPngDataUrl} size={size} />
}
function FolderIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={folderPngDataUrl} size={size} />
}

const TARGETS: readonly LaunchTarget[] = ['code', 'cmd', 'explorer'] as const

const TARGET_META: Record<LaunchTarget, { icon: (size: number) => JSX.Element; labelKey: `target.${LaunchTarget}` }> = {
  code: { icon: (s) => <VscodeIcon size={s} />, labelKey: 'target.code' },
  cmd: { icon: (s) => <TerminalIcon size={s} />, labelKey: 'target.cmd' },
  explorer: { icon: (s) => <FolderIcon size={s} />, labelKey: 'target.explorer' },
}

function useLaunchFlow(
  target: LaunchTarget,
  sessionId: string,
  launch: OpenWithInjected['launch'],
  getCwd: OpenWithInjected['getCwd'],
  log: OpenWithInjected['log'],
): { run: () => void } {
  const run = useCallback(async () => {
    try {
      const cwd = getCwd(sessionId)
      if (cwd === undefined || cwd.length === 0) {
        log('warn', 'cwd not found for session', { sessionId })
        return
      }
      log('info', 'button clicked', { sessionId, target, cwd })
      const result = await launch(cwd, target)
      if (result.ok) log('info', 'RPC result', result)
      else log('warn', 'RPC returned error', result)
    } catch (err) {
      log('error', 'button click failed', err)
    }
  }, [target, sessionId, launch, getCwd, log])
  return { run }
}

/**
 * Render the capsule split-button + popover.
 * Layout: [ action | <sep> | picker ] with the popover anchored to the
 * bottom-right of the picker half.
 */
export function OpenWithButton({
  sessionId, launch, getCwd, log, t,
}: OpenWithButtonProps) {
  const [target, setTarget] = useState<LaunchTarget>('code')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLButtonElement>(null)
  useDismissOnOutsidePointer(rootRef, open, setOpen)

  const { run } = useLaunchFlow(target, sessionId, launch, getCwd, log)

  const labelKey = `target.${target}` as 'target.code'
  const label = t(labelKey)
  const title = t('tooltip')
  const currentIcon = TARGET_META[target].icon(14)

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      pickerRef.current?.focus()
    }
  }

  const onActionClick = (_ev: MouseEvent<HTMLButtonElement>): void => {
    if (open) setOpen(false)
    void run()
  }

  const onPickerClick = (_ev: MouseEvent<HTMLButtonElement>): void => {
    setOpen((o) => !o)
  }

  const selectTarget = (next: LaunchTarget): void => {
    setTarget(next)
    setOpen(false)
    const cwd = getCwd(sessionId)
    if (cwd === undefined || cwd.length === 0) {
      log('warn', 'cwd not found for session', { sessionId })
      return
    }
    log('info', 'picker selected launch', { sessionId, target: next, cwd })
    void launch(cwd, next).then((result) => {
      if (result.ok) log('info', 'RPC result', result)
      else log('warn', 'RPC returned error', result)
    }).catch((err) => {
      log('error', 'picker launch failed', err)
    })
  }

  const hoverVar = 'var(--dsw-hover, rgba(0,0,0,0.05))'
  const borderVar = 'var(--dsw-border-strong, rgba(0,0,0,0.12))'
  const textVar = 'var(--dsw-fg, inherit)'
  const menuBgVar = 'var(--dsw-specific-menu, transparent)'
  const menuBorderVar = 'var(--dsw-alias-border-l2, rgba(0,0,0,0.08))'
  const menuShadowVar = 'var(--dsw-shadow-lv3, 0 8px 24px rgba(0,0,0,0.08))'

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKeyDown}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'stretch',
        height: '28px',
        padding: 0,
        borderRadius: '6px',
        border: `1px solid ${borderVar}`,
        background: 'transparent',
        color: textVar,
        fontSize: '13px',
        overflow: 'visible',
      }}
    >
      <button
        type="button"
        onClick={onActionClick}
        title={title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          height: '100%',
          padding: '0 8px',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: '6px 0 0 6px',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {currentIcon}
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      </button>
      <span
        aria-hidden="true"
        style={{
          width: '1px',
          height: '100%',
          background: borderVar,
          flex: '0 0 auto',
        }}
      />
      <button
        ref={pickerRef}
        type="button"
        onClick={onPickerClick}
        aria-label={t('picker.aria')}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 6px',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: '0 6px 6px 0',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <IconChevronDownOutline14 size={12} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('menu.aria')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            right: 0,
            minWidth: '168px',
            maxWidth: 'min(320px, calc(100vw - 32px))',
            background: menuBgVar,
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            border: `1px solid ${menuBorderVar}`,
            borderRadius: '6px',
            boxShadow: menuShadowVar,
            padding: '4px',
            zIndex: 100,
          }}
        >
          {TARGETS.map((option) => {
            const { icon, labelKey } = TARGET_META[option]
            return (
              <button
                key={option}
                role="menuitem"
                type="button"
                onClick={() => selectTarget(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '6px 10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderRadius: '6px',
                  fontWeight: target === option ? 600 : 400,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {icon(14)}
                <span>{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
