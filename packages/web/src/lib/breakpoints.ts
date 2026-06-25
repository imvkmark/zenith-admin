/**
 * 响应式断点单一来源（JS 侧）。
 *
 * ⚠️ 这里的值必须与 CSS `@media` 中使用的 `max-width` 写法保持一致，
 * 否则会出现「CSS 判定为移动端、JS 判定为桌面端」的死区。
 *
 * 约定：JS 统一用 `mediaDown(key)` 生成 `(max-width: <value - 1>px)`，
 * 与 CSS 里常见的 `@media (max-width: 767px)` / `(max-width: 991px)` 完全对齐：
 *   - md = 768 → `(max-width: 767px)`（移动端导航 / 工具栏切换）
 *   - lg = 992 → `(max-width: 991px)`（侧边栏自动收起）
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/** `(max-width: <bp - 1>px)`：窄于该断点（含临界）。对齐 CSS 的 max-width 写法。 */
export function mediaDown(key: BreakpointKey): string {
  return `(max-width: ${BREAKPOINTS[key] - 1}px)`;
}

/** `(min-width: <bp>px)`：不窄于该断点。 */
export function mediaUp(key: BreakpointKey): string {
  return `(min-width: ${BREAKPOINTS[key]}px)`;
}

/** `[min, max)` 区间：`min` 含、`max` 不含。 */
export function mediaBetween(min: BreakpointKey, max: BreakpointKey): string {
  return `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`;
}
