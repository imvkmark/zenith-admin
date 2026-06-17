/** 分 → 元字符串（保留两位小数） */
export function fenToYuan(fen: number): string {
  return (fen / 100).toFixed(2);
}

/** 分 → ¥元 */
export function formatYuan(fen: number): string {
  return `¥${fenToYuan(fen)}`;
}
