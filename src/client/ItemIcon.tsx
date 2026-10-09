/**
 * 行内图标：胶囊按钮与设置页共用。
 *
 * 路径缺失或加载失败时留出等宽空白，不用占位图。记的是「哪一个 src 失败了」
 * 而不是「曾经失败过」：设置一变，图标 URL 里的修订号就前进、src 换新，
 * 粘滞的布尔值会把一次 404 永久定格成空白 —— 即使图标其实已经好了。
 */
import { useState } from 'react'

/**
 * @param src - 图标的文档相对 URL；空串表示这一项没有图标。
 * @param size - 边长（px）。
 */
export function ItemIcon({ src, size }: { src: string; size: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (src.length === 0 || failedSrc === src) {
    return <span style={{ display: 'block', width: size, height: size, flexShrink: 0 }} />
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      onError={() => { setFailedSrc(src) }}
      style={{
        display: 'block', width: size, height: size, flexShrink: 0,
        objectFit: 'contain', userSelect: 'none',
      }}
    />
  )
}
