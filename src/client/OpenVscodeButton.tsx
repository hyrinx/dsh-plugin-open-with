/**
 * 胶囊拆分按钮：左侧直接启动当前项，右侧下拉菜单切换启动器。
 *
 * 下拉菜单展示内容 = 可见的预设项 + 可见的自定义项，
 * 排序与设置页保持一致（预设项在前，自定义项在后）。
 * 每次打开菜单时重新读取设置，确保所见即所得。
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { IconChevronDownOutline14, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'

type LaunchTarget = 'code' | 'cmd' | 'explorer' | 'powershell'

/** 胶囊菜单中的一项（预设或自定义）。 */
export interface CapsuleItem {
  id: string
  name: string
  icon: string
  /** 预设项才有 target */
  target?: LaunchTarget
  preset: boolean
}

export interface OpenWithInjected {
  launch: (cwd: string, target?: string) => Promise<RpcResult<unknown>>
  getCwd: (sessionId: string) => string | undefined
  log: (level: 'info' | 'warn' | 'error', message: string, extra?: unknown) => void
  /** 从 host 端读取隐藏的预设项 id 列表。 */
  readHiddenIds: () => Promise<string[]>
  /** 从 host 端读取全部设置，用于获取自定义项。 */
  readCapsuleItems: () => Promise<CapsuleItem[]>
}

export type OpenWithButtonProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'openWith'>
  & InjectFace<OpenWithInjected>

/** 默认图标（DSH logo），用于图标提取完成前的回退。 */
const fallbackIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKDSURBVFhH7ZZJyI1xFMZ/yJQpMmRhDkkplCglWSAiUaadDSVDlI2FhZAyFAsbCSkiYqGQDBEbU4ayMC1E5qnMUw/nvY7j3O/e78PuPnW63TM9533P//zPCzXU8H/QEhgXlQ1FE6At0ML+K/kMYB9wF7gCdAoxc4A7Ftsg9Ac2AteA98AX4DPwBHgFfHMyJgYD28y2C+gajYbewLSoVMVrjcyT1CUjYxJgj7O/AcaavjMwHJgF3Ad2+yCR708IKsljYKJPBKwOPjeB9cCnoF/ug1YmyasVtWixyzUs8YmiGLX6BwYAHxOn+shXYJkrYnvi42WD8y0dmr8VFbHAcjYHdiQ+asMaPyFN3cl+av16lgRWKypihRGMcPpbwDygx6/n/onB5nAKaGw6/fa1vl5PSCKh7oJY9AXgiPt/OPCWMMUczkSDQcXo4nmQkEtuA4PssqprirbExAWmm8NDoFE0OnQEjieJP9iB0+2ndp5NfCRzY8IC451Tz2gMaAYcSJLr7Swyn35lJmpgyFWCZrFwWhiNCbQTziUE6rnekt7CxWBTm8pCPS4O0NUKbSjQDXieFPEWeJHoNRV1YqdznhyNZTA7IcrkdbIt/4AWShGgeW0VHRLoTR1KCKMsjYHl4GdWW6q4EwpofS4B2jldF5ueSFrI0fp8E/QJu36rHagCQ0wvQt+mUTaKkfwG0N75VYVJYWWeBno5+wnT6/bbbGMpzExW7TFgdJWH+jcomX+id8BBu8leBpLzwFAjmVBmAi4B3SNJJehQ3kuSlZNHtjP0CbbOCtM3oRbbXqBDJKgGbYBVyVNnogLmJwf3n6C1LSO14CRw2W46Tc0mYKr7Yq6hhnrjO8xVal7nQeXKAAAAAElFTkSuQmCC'

/** Renders a data-URL PNG icon at a given size. */
function PngIcon({ src, size = 14 }: { src: string; size?: number }) {
  return (
    <img
      src={src || fallbackIcon}
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

function useLaunchFlow(
  target: string,
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
  sessionId, launch, getCwd, log, readHiddenIds, readCapsuleItems, t,
}: OpenWithButtonProps) {
  const [target, setTarget] = useState<string>('code')
  const [open, setOpen] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [capsuleItems, setCapsuleItems] = useState<CapsuleItem[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLButtonElement>(null)
  useDismissOnOutsidePointer(rootRef, open, setOpen)

  // 挂载时异步加载胶囊项列表和隐藏列表
  useEffect(() => {
    readCapsuleItems().then((items) => {
      setCapsuleItems(items)
      if (items.length > 0 && !items.find((it) => it.id === target)) {
        setTarget(items[0].id)
      }
    }).catch(() => {})
    readHiddenIds().then(setHiddenIds).catch(() => {})
  }, [readHiddenIds, readCapsuleItems])

  const { run } = useLaunchFlow(target, sessionId, launch, getCwd, log)

  const currentItem = capsuleItems.find((it) => it.id === target)
  const label = currentItem?.name ?? t('target.code')
  const title = t('tooltip')
  const currentIcon = <PngIcon src={currentItem?.icon ?? ''} size={14} />

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
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) {
      // 每次打开下拉菜单时重新读取设置，确保排序和可见性所见即所得
      readCapsuleItems().then((items) => {
        setCapsuleItems(items)
      }).catch(() => {})
      readHiddenIds().then(setHiddenIds).catch(() => {})
    }
  }

  const selectTarget = (next: string): void => {
    setTarget(next)
    setOpen(false)
    const cwd = getCwd(sessionId)
    if (cwd === undefined || cwd.length === 0) {
      log('warn', 'cwd not found for session', { sessionId })
      return
    }
    log('info', 'picker selected launch', { sessionId, target: next, cwd })
    void launch(cwd, next).then((result: RpcResult<unknown>) => {
      if (result.ok) log('info', 'RPC result', result)
      else log('warn', 'RPC returned error', result)
    }).catch((err: unknown) => {
      log('error', 'picker launch failed', err)
    })
  }

  const visibleItems = capsuleItems.filter((it) => !hiddenIds.includes(it.id))
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
          {visibleItems.map((item) => {
            const icon = <PngIcon src={item.icon ?? ''} size={14} />
            return (
              <button
                key={item.id}
                role="menuitem"
                type="button"
                onClick={() => selectTarget(item.id)}
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
                  fontWeight: target === item.id ? 600 : 400,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = hoverVar }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {icon}
                <span>{item.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}