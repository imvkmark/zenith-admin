import type { CSSProperties } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { Printer } from 'lucide-react';
import { resolvePrintBandText, type ReportPrintCell, type ReportPrintMerge, type ReportPrintRenderResult } from '@zenith/shared';
import { formatDateTime } from '@/utils/date';
import './print-report.css';

interface PrintReportViewProps {
  result: ReportPrintRenderResult;
  params?: Record<string, unknown>;
  showActions?: boolean;
}

const PAPER_SIZE_MM = {
  A4: [210, 297],
  A3: [297, 420],
  A5: [148, 210],
  Letter: [216, 279],
} as const;

function mm(value: number | undefined, fallback: number) {
  return `${value ?? fallback}mm`;
}

function stringifyCellValue(value: ReportPrintCell['v']) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function getPaperSize(result: ReportPrintRenderResult) {
  const paper = result.pageConfig.paper ?? 'A4';
  const [w, h] = PAPER_SIZE_MM[paper] ?? PAPER_SIZE_MM.A4;
  return result.pageConfig.orientation === 'landscape' ? [h, w] : [w, h];
}

function isCoveredByMerge(row: number, col: number, merges: ReportPrintMerge[]) {
  return merges.some((m) => row >= m.row && row < m.row + m.rowSpan && col >= m.col && col < m.col + m.colSpan && !(row === m.row && col === m.col));
}

function findMerge(row: number, col: number, merges: ReportPrintMerge[]) {
  return merges.find((m) => m.row === row && m.col === col);
}

function buildCellStyle(cell: ReportPrintCell | undefined, height: number | undefined): CSSProperties {
  const s = cell?.s;
  return {
    height: height ? `${height}px` : undefined,
    fontWeight: s?.bold ? 700 : undefined,
    fontStyle: s?.italic ? 'italic' : undefined,
    fontSize: s?.fontSize ? `${s.fontSize}px` : undefined,
    color: s?.color,
    background: s?.background,
    textAlign: s?.align,
    verticalAlign: s?.valign,
  };
}

function triggerPrint() {
  document.body.classList.add('report-printing');
  const cleanup = () => document.body.classList.remove('report-printing');
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1200);
}

export function PrintReportView({ result, params = {}, showActions = true }: Readonly<PrintReportViewProps>) {
  const grid = result.grid;
  const merges = grid.merges ?? [];
  const cellMap = new Map(grid.cells.map((cell) => [cellKey(cell.row, cell.col), cell]));
  const [paperWidth, paperHeight] = getPaperSize(result);
  const margin = result.pageConfig.margin ?? { top: 12, right: 12, bottom: 12, left: 12 };
  const pageStyle = {
    '--report-paper-width': `${paperWidth}mm`,
    '--report-paper-height': `${paperHeight}mm`,
    '--report-margin-top': mm(margin.top, 12),
    '--report-margin-right': mm(margin.right, 12),
    '--report-margin-bottom': mm(margin.bottom, 12),
    '--report-margin-left': mm(margin.left, 12),
    '--report-background-image': result.pageConfig.backgroundImage ? `url("${result.pageConfig.backgroundImage}")` : 'none',
  } as CSSProperties;
  const bandCtx = { date: formatDateTime(new Date()), page: 1, pages: 1 };

  return (
    <div className="print-report-area">
      {showActions && (
        <div className="print-report-actions">
          <Button type="primary" icon={<Printer size={14} />} onClick={triggerPrint}>打印</Button>
        </div>
      )}
      <div className="print-report-view">
        <div className="print-report-page" style={pageStyle}>
          <div className="print-report-page__inner">
            {result.pageConfig.header && (
              <div className="print-report-band print-report-band--header">
                {resolvePrintBandText(result.pageConfig.header, params, bandCtx)}
              </div>
            )}
            <table className="print-report-table" aria-label={result.name}>
              <colgroup>
                {Array.from({ length: Math.max(grid.cols, 1) }).map((_, col) => (
                  <col key={col} style={{ width: `${grid.colWidths?.[col] ?? 96}px` }} />
                ))}
              </colgroup>
              <tbody>
                {Array.from({ length: Math.max(grid.rows, 1) }).map((_, row) => (
                  <tr key={row} style={{ height: grid.rowHeights?.[row] ? `${grid.rowHeights[row]}px` : undefined }}>
                    {Array.from({ length: Math.max(grid.cols, 1) }).map((__, col) => {
                      if (isCoveredByMerge(row, col, merges)) return null;
                      const cell = cellMap.get(cellKey(row, col));
                      const merge = findMerge(row, col, merges);
                      return (
                        <td
                          key={col}
                          rowSpan={merge?.rowSpan}
                          colSpan={merge?.colSpan}
                          className={`${cell?.s?.border ? 'print-report-cell--border' : ''} ${cell?.s?.wrap ? 'print-report-cell--wrap' : ''}`}
                          style={buildCellStyle(cell, grid.rowHeights?.[row])}
                        >
                          {stringifyCellValue(cell?.v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.pageConfig.footer && (
              <div className="print-report-band print-report-band--footer">
                {resolvePrintBandText(result.pageConfig.footer, params, bandCtx)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintReportView;
