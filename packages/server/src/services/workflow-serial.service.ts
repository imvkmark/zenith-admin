/**
 * 业务编号 / 流水号生成
 *
 * 每个流程定义 + 周期键维护一个自增序列，通过 INSERT ... ON CONFLICT DO UPDATE 原子自增，
 * 在发起事务内调用，确保并发下编号唯一、连续。
 */
import { sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import { workflowSerialCounters } from '../db/schema';
import type { DbTransaction } from '../db/types';
import type { WorkflowSerialNoConfig } from '@zenith/shared';

function resolvePeriodKey(resetPeriod: WorkflowSerialNoConfig['resetPeriod'], now: dayjs.Dayjs): string {
  switch (resetPeriod) {
    case 'daily': return now.format('YYYYMMDD');
    case 'monthly': return now.format('YYYYMM');
    case 'yearly': return now.format('YYYY');
    default: return 'ALL';
  }
}

function resolveDatePart(dateFormat: WorkflowSerialNoConfig['dateFormat'], now: dayjs.Dayjs): string {
  switch (dateFormat) {
    case 'YYYYMMDD': return now.format('YYYYMMDD');
    case 'YYYYMM': return now.format('YYYYMM');
    case 'YYYY': return now.format('YYYY');
    default: return '';
  }
}

/**
 * 生成业务编号；config 未启用时返回 null。
 * 必须在事务内调用以保证原子自增。
 */
export async function generateSerialNo(
  tx: DbTransaction,
  definitionId: number,
  config: WorkflowSerialNoConfig | undefined | null,
): Promise<string | null> {
  if (!config?.enabled) return null;
  const now = dayjs();
  const periodKey = resolvePeriodKey(config.resetPeriod ?? 'never', now);
  const [row] = await tx
    .insert(workflowSerialCounters)
    .values({ definitionId, periodKey, seq: 1 })
    .onConflictDoUpdate({
      target: [workflowSerialCounters.definitionId, workflowSerialCounters.periodKey],
      set: { seq: sql`${workflowSerialCounters.seq} + 1` },
    })
    .returning({ seq: workflowSerialCounters.seq });
  const seqLength = Math.min(Math.max(config.seqLength ?? 4, 1), 12);
  const seqStr = String(row.seq).padStart(seqLength, '0');
  return `${config.prefix ?? ''}${resolveDatePart(config.dateFormat ?? 'none', now)}${seqStr}`;
}
