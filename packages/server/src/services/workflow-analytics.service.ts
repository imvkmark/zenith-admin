import { and, eq, gte, desc, inArray, sql, type SQL } from 'drizzle-orm';
import dayjs from 'dayjs';
import { db } from '../db';
import { workflowInstances, workflowTasks, workflowDefinitions, users } from '../db/schema';
import { currentUser } from '../lib/context';
import { tenantCondition } from '../lib/tenant';
import type {
  WorkflowAnalytics,
  WorkflowInstanceStatus,
  WorkflowAnalyticsTrendPoint,
} from '@zenith/shared';

const FINISHED: WorkflowInstanceStatus[] = ['approved', 'rejected', 'withdrawn', 'cancelled'];

export async function getWorkflowAnalytics(query: { definitionId?: number } = {}): Promise<WorkflowAnalytics> {
  const user = currentUser();
  const instTenant = tenantCondition(workflowInstances, user);

  // 实例级筛选（监控可按流程定义过滤）
  const instConds: SQL[] = [];
  if (instTenant) instConds.push(instTenant);
  if (query.definitionId) instConds.push(eq(workflowInstances.definitionId, query.definitionId));
  const instWhere = instConds.length ? and(...instConds) : undefined;

  const since14 = dayjs().subtract(13, 'day').startOf('day').toDate();
  const since7 = dayjs().subtract(7, 'day').toDate();

  const durationExpr = sql<number | null>`avg(extract(epoch from (${workflowInstances.updatedAt} - ${workflowInstances.createdAt})))`;

  const [
    statusRows,
    avgRow,
    pendingRow,
    recentRow,
    definitionRows,
    nodeRows,
    approverRows,
    createdTrend,
    completedTrend,
  ] = await Promise.all([
    // 1. 各状态计数
    db.select({ status: workflowInstances.status, count: sql<number>`count(*)::int` })
      .from(workflowInstances).where(instWhere).groupBy(workflowInstances.status),
    // 2. 已完结实例平均耗时
    db.select({ avg: durationExpr })
      .from(workflowInstances)
      .where(and(...instConds, inArray(workflowInstances.status, FINISHED))),
    // 3. 当前挂起任务总数
    db.select({ count: sql<number>`count(*)::int` })
      .from(workflowTasks)
      .innerJoin(workflowInstances, eq(workflowTasks.instanceId, workflowInstances.id))
      .where(and(...instConds, eq(workflowTasks.status, 'pending'))),
    // 4. 近 7 天发起数
    db.select({ count: sql<number>`count(*)::int` })
      .from(workflowInstances)
      .where(and(...instConds, gte(workflowInstances.createdAt, since7))),
    // 5. 各流程定义统计
    db.select({
      definitionId: workflowInstances.definitionId,
      definitionName: workflowDefinitions.name,
      total: sql<number>`count(*)::int`,
      running: sql<number>`count(*) filter (where ${workflowInstances.status}::text = 'running')::int`,
      approved: sql<number>`count(*) filter (where ${workflowInstances.status}::text = 'approved')::int`,
      rejected: sql<number>`count(*) filter (where ${workflowInstances.status}::text = 'rejected')::int`,
      avgDurationSec: sql<number | null>`avg(extract(epoch from (${workflowInstances.updatedAt} - ${workflowInstances.createdAt}))) filter (where ${workflowInstances.status}::text in ('approved','rejected','withdrawn','cancelled'))`,
    })
      .from(workflowInstances)
      .innerJoin(workflowDefinitions, eq(workflowInstances.definitionId, workflowDefinitions.id))
      .where(instWhere)
      .groupBy(workflowInstances.definitionId, workflowDefinitions.name)
      .orderBy(desc(sql`count(*)`))
      .limit(12),
    // 6. 节点瓶颈：人工节点的平均处理时长 / 挂起数
    db.select({
      definitionId: workflowInstances.definitionId,
      definitionName: workflowDefinitions.name,
      nodeKey: workflowTasks.nodeKey,
      nodeName: workflowTasks.nodeName,
      avgHandleSec: sql<number | null>`avg(extract(epoch from (${workflowTasks.actionAt} - ${workflowTasks.createdAt}))) filter (where ${workflowTasks.actionAt} is not null)`,
      pendingCount: sql<number>`count(*) filter (where ${workflowTasks.status}::text = 'pending')::int`,
      doneCount: sql<number>`count(*) filter (where ${workflowTasks.status}::text in ('approved','rejected'))::int`,
    })
      .from(workflowTasks)
      .innerJoin(workflowInstances, eq(workflowTasks.instanceId, workflowInstances.id))
      .innerJoin(workflowDefinitions, eq(workflowInstances.definitionId, workflowDefinitions.id))
      .where(and(...instConds, inArray(workflowTasks.nodeType, ['approve', 'handler'])))
      .groupBy(workflowInstances.definitionId, workflowDefinitions.name, workflowTasks.nodeKey, workflowTasks.nodeName)
      .orderBy(desc(sql`count(*) filter (where ${workflowTasks.status}::text = 'pending')`), desc(sql`avg(extract(epoch from (${workflowTasks.actionAt} - ${workflowTasks.createdAt})))`))
      .limit(10),
    // 7. 审批人工作量（挂起任务）
    db.select({
      userId: workflowTasks.assigneeId,
      userName: sql<string>`coalesce(${users.nickname}, ${users.username})`,
      pendingCount: sql<number>`count(*)::int`,
      oldestPendingSec: sql<number | null>`extract(epoch from (now() - min(${workflowTasks.createdAt})))`,
    })
      .from(workflowTasks)
      .innerJoin(workflowInstances, eq(workflowTasks.instanceId, workflowInstances.id))
      .innerJoin(users, eq(workflowTasks.assigneeId, users.id))
      .where(and(...instConds, eq(workflowTasks.status, 'pending')))
      .groupBy(workflowTasks.assigneeId, users.nickname, users.username)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    // 8a. 近 14 天发起趋势
    db.select({ d: sql<string>`to_char(${workflowInstances.createdAt}, 'YYYY-MM-DD')`, c: sql<number>`count(*)::int` })
      .from(workflowInstances)
      .where(and(...instConds, gte(workflowInstances.createdAt, since14)))
      .groupBy(sql`to_char(${workflowInstances.createdAt}, 'YYYY-MM-DD')`),
    // 8b. 近 14 天完结趋势
    db.select({ d: sql<string>`to_char(${workflowInstances.updatedAt}, 'YYYY-MM-DD')`, c: sql<number>`count(*)::int` })
      .from(workflowInstances)
      .where(and(...instConds, inArray(workflowInstances.status, FINISHED), gte(workflowInstances.updatedAt, since14)))
      .groupBy(sql`to_char(${workflowInstances.updatedAt}, 'YYYY-MM-DD')`),
  ]);

  const statusCounts = statusRows.map((r) => ({ status: r.status, count: r.count }));
  const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const round = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v)));

  // 趋势序列补齐 14 天
  const createdMap = new Map(createdTrend.map((r) => [r.d, r.c]));
  const completedMap = new Map(completedTrend.map((r) => [r.d, r.c]));
  const trend: WorkflowAnalyticsTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    trend.push({ date: d, created: createdMap.get(d) ?? 0, completed: completedMap.get(d) ?? 0 });
  }

  return {
    statusCounts,
    total,
    avgDurationSec: round(avgRow[0]?.avg),
    pendingTaskCount: pendingRow[0]?.count ?? 0,
    recentCreated: recentRow[0]?.count ?? 0,
    definitionStats: definitionRows.map((r) => ({
      definitionId: r.definitionId,
      definitionName: r.definitionName,
      total: r.total,
      running: r.running,
      approved: r.approved,
      rejected: r.rejected,
      avgDurationSec: round(r.avgDurationSec),
    })),
    nodeBottlenecks: nodeRows.map((r) => ({
      definitionId: r.definitionId,
      definitionName: r.definitionName,
      nodeKey: r.nodeKey,
      nodeName: r.nodeName,
      avgHandleSec: round(r.avgHandleSec),
      pendingCount: r.pendingCount,
      doneCount: r.doneCount,
    })),
    approverWorkloads: approverRows
      .filter((r) => r.userId != null)
      .map((r) => ({
        userId: r.userId as number,
        userName: r.userName,
        pendingCount: r.pendingCount,
        oldestPendingSec: round(r.oldestPendingSec),
      })),
    trend,
  };
}
