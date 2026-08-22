/**
 * Capsule-style "Open" split button for the conversation session header.
 *
 * Left half: invokes the last chosen target (default = VS Code).
 * Right half: a chevron that opens a three-item popover
 *   (Open VS Code / Open Terminal / Open Folder).
 *
 * Icons are extracted directly from system .exe files (VS Code,
 * Windows Terminal / cmd, explorer.exe) and embedded as base64 PNG
 * data URLs via `src/assets.ts` — no hand-drawn SVG, pixel-identical
 * to the icons the user sees in their taskbar / Start menu.
 */
import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { IconChevronDownOutline14, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { vscodePngDataUrl, terminalPngDataUrl, folderPngDataUrl } from '../assets.js'

/** The three launch targets shared between the host and client. */
type LaunchTarget = 'code' | 'cmd' | 'explorer'

/** Registration-side business face: the launch callback + cwd lookup + log forwarder. */
export interface OpenWithInjected {
  /** Call the host to spawn the chosen app at the given directory. */
  launch: (cwd: string, target?: LaunchTarget) => Promise<RpcResult<unknown>>
  /** Resolve the workspace directory for the given session id. */
  getCwd: (sessionId: string) => string | undefined
  /** Forward a log line into the host log file (best-effort). */
  log: (level: 'info' | 'warn' | 'error', message: string, extra?: unknown) => void
}

/** Full component props: runtime share + locale + inject face. */
export type OpenWithButtonProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'openWith'>
  & InjectFace<OpenWithInjected>

/**
 * Render a system-extracted PNG icon via a base64 data URL.
 *
 * `image-rendering: -webkit-optimize-contrast` keeps the 32×32 source
 * crisp when scaled down to 14–16px (Chrome/Edge/Safari). Firefox uses
 * `crisp-edges` as its vendor prefix; both fall back to `auto` on
 * unsupported browsers.
 */
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
        // @ts-expect-error — Firefox prefixed variant, harmless on others
        imageRendering: '-moz-crisp-edges',
      }}
    />
  )
}

/** Wrapper so the rest of the file doesn't need to know the concrete data URL. */
function VscodeIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={vscodePngDataUrl} size={size} />
}
function TerminalIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={terminalPngDataUrl} size={size} />
}
function FolderIcon({ size = 14 }: { size?: number }) {
  return <PngIcon src={folderPngDataUrl} size={size} />
}

/** Static ordered targets. */
const TARGETS: readonly LaunchTarget[] = ['code', 'cmd', 'explorer'] as const

/** Per-target metadata: inline icon + i18n key. */
const TARGET_META: Record<LaunchTarget, { icon: (size: number) => JSX.Element; labelKey: `target.${LaunchTarget}` }> = {
  code: { icon: (s) => <VscodeIcon size={s} />, labelKey: 'target.code' },
  cmd: { icon: (s) => <TerminalIcon size={s} />, labelKey: 'target.cmd' },
  explorer: { icon: (s) => <FolderIcon size={s} />, labelKey: 'target.explorer' },
}

/**
 * Run the launch flow against a concrete target. Fires logging + RPC but
 * intentionally keeps no visible UI state: the user opted out of the
 * opening/opened/failed inline toast-style label mutation.
 */
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
 * Render the capsule split-button.
 *
 * Layout structure:
 *   ┌ root (inline-flex, 6px pill radius, 1px border, 2px gap) ──────────┐
 *   │ [ action | <sep> | picker ]                                        │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * Popover position: anchored to the bottom-right of the picker half.
 * @param props - composed slot props.
 * @returns the button + popover tree.
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

  // Label follows the currently selected target so the left half shows the
  // full action name ("打开 VS Code" / "Open Terminal" / …) instead of the
  // generic "Open" word. Use a literal template key cast because OpenWithKey
  // is declared as a mapped interface rather than a discriminated union.
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
    // Close any open menu on action press.
    if (open) setOpen(false)
    void run()
  }

  const onPickerClick = (_ev: MouseEvent<HTMLButtonElement>): void => {
    setOpen((o) => !o)
  }

  const selectTarget = (next: LaunchTarget): void => {
    setTarget(next)
    setOpen(false)
    // Fire the launch in the same commit — a single gesture selects the
    // target and immediately launches it (matches Trae Work's UX).
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
  // Matches master JobListAction.module.css menu tokens so the popover
  // blends into the shell's dsw theme rather than forcing a flat white.
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
        // Pill height is the source of truth; inner children use
        // height:100% so hover background fills up against the border.
        height: '28px',
        padding: 0,
        borderRadius: '6px',
        border: `1px solid ${borderVar}`,
        background: 'transparent',
        color: textVar,
        fontSize: '13px',
        // Dropdown menu needs to paint outside this box — keep visible.
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
          // Match root radius exactly so the hover fill sits flush on
          // both the outer border edge AND the pill's rounded corners.
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
