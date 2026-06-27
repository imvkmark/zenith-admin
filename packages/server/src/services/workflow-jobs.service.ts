import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db';
import { workflowJobs, workflowJobExecutions } from '../db/schema';
import type { WorkflowJobRow, WorkflowJobExecutionRow } from '../db/schema';
import { pageOffset } from '../lib/pagination';
import { formatDateTime, formatNullableDateTime } from '../lib/datetime';
import { retryJob, skipJob } from '../lib/workflow-jobs';

export interface ListWorkflowJobsQuery {
  page?: number;
  pageSize?: number;
  jobType?: WorkflowJobRow['jobType'];
  status?: WorkflowJobRow['status'];
  instanceId?: number;
  keyword?: string;
}

function mapJob(row: WorkflowJobRow) {
  return {
    id: row.id,
    jobType: row.jobType,
    status: row.status,
    instanceId: row.instanceId ?? null,
    taskId: row.taskId ?? null,
    nodeKey: row.nodeKey ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    traceId: row.traceId ?? null,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    runAt: formatDateTime(row.runAt),
    lockedAt: formatNullableDateTime(row.lockedAt),
    lockedBy: row.lockedBy ?? null,
    lastError: row.lastError ?? null,
    result: (row.result ?? null) as Record<string, unknown> | null,
    tenantId: row.tenantId ?? null,
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt),
  };
}

function mapExecution(row: WorkflowJobExecutionRow) {
  return {
    id: row.id,
    jobId: row.jobId,
    jobType: row.jobType,
    attempt: row.attempt,
    status: row.status,
    requestUrl: row.requestUrl ?? null,
    requestMethod: row.requestMethod ?? null,
    requestBody: row.requestBody ?? null,
    responseStatus: row.responseStatus ?? null,
    responseBody: row.responseBody ?? null,
    errorMessage: row.errorMessage ?? null,
    durationMs: row.durationMs ?? null,
    startedAt: formatNullableDateTime(row.startedAt),
    finishedAt: formatNullableDateTime(row.finishedAt),
    createdAt: formatDateTime(row.createdAt),
  };
}

export async function listWorkflowJobs(query: ListWorkflowJobsQuery) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 10);
  const conds: SQL[] = [];
  if (query.jobType) conds.push(eq(workflowJobs.jobType, query.jobType));
  if (query.status) conds.push(eq(workflowJobs.status, query.status));
  if (query.instanceId != null) conds.push(eq(workflowJobs.instanceId, query.instanceId));
  if (query.keyword) {
    const kw = `%${query.keyword}%`;
    conds.push(or(ilike(workflowJobs.idempotencyKey, kw), ilike(workflowJobs.traceId, kw), ilike(workflowJobs.nodeKey, kw))!);
  }
  const where = conds.length > 0 ? and(...conds) : undefined;

  const [total, rows] = await Promise.all([
    db.$count(workflowJobs, where),
    db.select().from(workflowJobs).where(where)
      .orderBy(desc(workflowJobs.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
  ]);

  return { list: rows.map(mapJob), total, page, pageSize };
}

export async function getWorkflowJobDetail(id: number) {
  const [row] = await db.select().from(workflowJobs).where(eq(workflowJobs.id, id)).limit(1);
  if (!row) throw new HTTPException(404, { message: '作业不存在' });
  const execs = await db.select().from(workflowJobExecutions)
    .where(eq(workflowJobExecutions.jobId, id))
    .orderBy(desc(workflowJobExecutions.id));
  return { ...mapJob(row), executions: execs.map(mapExecution) };
}

export async function retryWorkflowJob(id: number, payload?: Record<string, unknown>) {
  const row = await retryJob(id, payload ? { payload } : undefined);
  if (!row) throw new HTTPException(400, { message: '仅失败 / 死信 / 已取消的作业可重试' });
  return mapJob(row);
}

export async function skipWorkflowJob(id: number) {
  const row = await skipJob(id);
  if (!row) throw new HTTPException(400, { message: '仅待处理 / 失败 / 死信的作业可跳过' });
  return mapJob(row);
}
