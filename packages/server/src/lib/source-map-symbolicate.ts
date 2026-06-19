/**
 * 压缩堆栈还原（基于上传的 source map）。
 */
import { SourceMapConsumer } from 'source-map';

function basename(url: string): string {
  const noQuery = url.split('?')[0].split('#')[0];
  const parts = noQuery.split('/');
  return parts[parts.length - 1] || noQuery;
}

const FRAME_RE = /^\s*at\s+(?:(.+?)\s+\()?(\S+?):(\d+):(\d+)\)?\s*$/;

export interface SourceMapEntry { fileName: string; content: string }

/**
 * 将压缩堆栈逐帧映射回源码位置。无法匹配的帧原样保留。
 */
export async function symbolicateStack(stack: string | null | undefined, maps: SourceMapEntry[]): Promise<string | null> {
  if (!stack || maps.length === 0) return null;
  const byBase = new Map<string, string>();
  for (const m of maps) byBase.set(basename(m.fileName), m.content);

  const consumers = new Map<string, SourceMapConsumer>();
  const lines = stack.split('\n');
  const out: string[] = [];
  let changed = false;

  try {
    for (const line of lines) {
      const m = FRAME_RE.exec(line);
      if (!m) { out.push(line); continue; }
      const fnName = m[1];
      const url = m[2];
      const lineNo = Number(m[3]);
      const colNo = Number(m[4]);
      const base = basename(url);
      const content = byBase.get(base);
      if (!content) { out.push(line); continue; }

      let consumer = consumers.get(base);
      if (!consumer) {
        consumer = await new SourceMapConsumer(JSON.parse(content));
        consumers.set(base, consumer);
      }
      const pos = consumer.originalPositionFor({ line: lineNo, column: colNo });
      if (pos.source && pos.line != null) {
        changed = true;
        out.push(`    at ${pos.name ?? fnName ?? '?'} (${pos.source}:${pos.line}:${pos.column ?? 0})`);
      } else {
        out.push(line);
      }
    }
  } catch {
    return null;
  } finally {
    for (const c of consumers.values()) {
      (c as unknown as { destroy?: () => void }).destroy?.();
    }
  }
  return changed ? out.join('\n') : null;
}
