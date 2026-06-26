import { formatDate, formatDateTime } from '../datetime';
import type { ExportColumn } from './types';

export function formatExportValue<TRow extends Record<string, unknown>>(
  column: ExportColumn<TRow>,
  row: TRow,
): unknown {
  const raw = column.key ? row[column.key] : undefined;
  const value = column.transform ? column.transform(raw, row) : raw;
  if (value == null) return '';
  if (column.enumMap && typeof value === 'string') return column.enumMap[value] ?? value;
  if (column.type === 'datetime') return formatDateTime(value as Date | string | number);
  if (column.type === 'date') return formatDate(value as Date | string | number);
  if (column.type === 'boolean') return value ? '是' : '否';
  if (column.type === 'money') {
    const cents = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(cents) ? (cents / 100).toFixed(2) : '';
  }
  return value;
}
