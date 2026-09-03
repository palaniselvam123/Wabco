/**
 * Reference-counted body scroll lock.
 *
 * Several overlays can be open at once — a fullscreen chart, the chart
 * drill-down panel, and the record detail. When each saved and restored
 * `body.style.overflow` independently, an overlay opening on top of another
 * captured 'hidden' as the previous value and restored it on close, leaving
 * the page permanently unscrollable. Counting the locks fixes that: the
 * original value is captured once and restored only when the last is released.
 */

let depth = 0
let saved = ''

export function lockScroll() {
  if (depth === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  depth += 1
}

export function unlockScroll() {
  if (depth === 0) return
  depth -= 1
  if (depth === 0) {
    document.body.style.overflow = saved
    saved = ''
  }
}

/** Convenience for useEffect: `useEffect(() => scrollLockEffect(open), [open])` */
export function scrollLockEffect(active) {
  if (!active) return undefined
  lockScroll()
  return unlockScroll
}
