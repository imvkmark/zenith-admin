import { workflowDefinitions, workflowDefinitionVersions } from '../db/schema';
import { formatDateTime } from '../lib/datetime';

// ─── 数据映射 ─────────────────────────────────────────────────────────────────

export function mapDefinition(
  row: typeof workflowDefinitions.$inferSelect,
  createdByName?: string | null,
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    flowData: row.flowData,
    formFields: row.formFields,
    status: row.status,
    version: row.version,
    tenantId: row.tenantId,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdByName: createdByName ?? null,
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt),
  };
}

export function mapDefinitionVersion(
  row: typeof workflowDefinitionVersions.$inferSelect,
  publishedByName?: string | null,
) {
  return {
    id: row.id,
    definitionId: row.definitionId,
    version: row.version,
    name: row.name,
    description: row.description,
    flowData: row.flowData,
    formFields: row.formFields,
    publishedAt: formatDateTime(row.publishedAt),
    publishedBy: row.publishedBy ?? null,
    publishedByName: publishedByName ?? null,
    tenantId: row.tenantId,
  };
}

// ─── 业务逻辑 ─────────────────────────────────────────────────────────────────
import { eq, and, like, desc } from 'drizzle-orm';
import { escapeLike } from '../lib/where-helpers';
import { db } from '../db';
import { pageOffset } from '../lib/pagination';
import { tenantCondition, getCreateTenantId } from '../lib/tenant';
import { validateFlowData } from '../lib/workflow-engine';
import type { WorkflowFlowData } from '@zenith/shared';
import { HTTPException } from 'hono/http-exception';
import { currentUser } from '../lib/context';

export type WorkflowDefinitionStatus = 'draft' | 'published' | 'disabled';

export async function listDefinitions(query: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
  const user = currentUser();
  const { page = 1, pageSize = 20, keyword, status } = query;
  const tc = tenantCondition(workflowDefinitions, user);
  const conditions = [];
  if (tc) conditions.push(tc);
  if (keyword) conditions.push(like(workflowDefinitions.name, `%${escapeLike(keyword)}%`));
  if (status) conditions.push(eq(workflowDefinitions.status, status as WorkflowDefinitionStatus));
  const where = conditions.length ? and(...conditions) : undefined;
  const [total, rows] = await Promise.all([
    db.$count(workflowDefinitions, where),
    db.query.workflowDefinitions.findMany({
      where,
      with: { createdByUser: { columns: { nickname: true } } },
      orderBy: desc(workflowDefinitions.id),
      limit: pageSize,
      offset: pageOffset(page, pageSize),
    }),
  ]);
  return { list: rows.map(r => mapDefinition(r, r.createdByUser?.nickname ?? null)), total, page, pageSize };
}

export async function listPublishedDefinitions() {
  const user = currentUser();
  const tc = tenantCondition(workflowDefinitions, user);
  const conditions = [eq(workflowDefinitions.status, 'published')];
  if (tc) conditions.push(tc);
  const rows = await db.select().from(workflowDefinitions).where(and(...conditions)).orderBy(desc(workflowDefinitions.updatedAt));
  return rows.map(r => mapDefinition(r));
}

function findDefinition(id: number) {
  const user = currentUser();
  const tc = tenantCondition(workflowDefinitions, user);
  const conds = [eq(workflowDefinitions.id, id)];
  if (tc) conds.push(tc);
  return and(...conds);
}

export async function getDefinition(id: number) {
  const where = findDefinition(id);
  const row = await db.query.workflowDefinitions.findFirst({
    where,
    with: { createdByUser: { columns: { nickname: true } } },
  });
  if (!row) throw new HTTPException(404, { message: '流程定义不存在' });
  return mapDefinition(row, row.createdByUser?.nickname ?? null);
}

export async function createDefinition(data: {
  name: string; description?: string | null; flowData?: unknown; formFields?: unknown; status?: WorkflowDefinitionStatus;
}) {
  const user = currentUser();
  const [row] = await db.insert(workflowDefinitions).values({
    name: data.name,
    description: data.description ?? null,
    flowData: data.flowData ?? null,
    formFields: data.formFields ?? null,
    status: data.status ?? 'draft',
    tenantId: getCreateTenantId(user),
  }).returning();
  return mapDefinition(row);
}

export async function updateDefinition(id: number, data: Partial<{
  name: string; description: string | null; flowData: unknown; formFields: unknown; status: WorkflowDefinitionStatus;
}>) {
  const where = findDefinition(id);
  const [existing] = await db.select().from(workflowDefinitions).where(where).limit(1);
  if (!existing) throw new HTTPException(404, { message: '流程定义不存在' });
  const updateData: Record<string, unknown> = { ...data };
  if (data.flowData !== undefined) updateData.flowData = data.flowData;
  if (data.formFields !== undefined) updateData.formFields = data.formFields;
  // 已发布的流程被修改后自动回到草稿，需重新发布
  if (existing.status === 'published' && data.status === undefined) {
    updateData.status = 'draft';
  }
  const [updated] = await db
    .update(workflowDefinitions)
    .set(updateData as Partial<typeof workflowDefinitions.$inferInsert>)
    .where(where)
    .returning();
  if (!updated) throw new HTTPException(404, { message: '流程定义不存在' });
  return mapDefinition(updated);
}

export async function publishDefinition(id: number) {
  const where = findDefinition(id);
  const [existing] = await db.select().from(workflowDefinitions).where(where).limit(1);
  if (!existing) throw new HTTPException(404, { message: '流程定义不存在' });
  const flowData = existing.flowData as WorkflowFlowData | null;
  if (!flowData?.nodes) throw new HTTPException(400, { message: '请先在设计器中设计流程' });
  const validation = validateFlowData(flowData);
  if (!validation.valid) throw new HTTPException(400, { message: validation.errors[0] });
  const user = currentUser();
  const newVersion = existing.version + 1;
  const updated = await db.transaction(async (tx) => {
    await tx.insert(workflowDefinitionVersions).values({
      definitionId: existing.id,
      version: newVersion,
      name: existing.name,
      description: existing.description,
      flowData: existing.flowData,
      formFields: existing.formFields,
      publishedBy: user?.id ?? null,
      tenantId: existing.tenantId,
    });
    const [u] = await tx
      .update(workflowDefinitions)
      .set({ status: 'published', version: newVersion })
      .where(where)
      .returning();
    return u;
  });
  return mapDefinition(updated);
}

export async function listVersions(definitionId: number) {
  // 校验定义存在 + 租户可见
  const [def] = await db.select().from(workflowDefinitions).where(findDefinition(definitionId)).limit(1);
  if (!def) throw new HTTPException(404, { message: '流程定义不存在' });
  const rows = await db.query.workflowDefinitionVersions.findMany({
    where: eq(workflowDefinitionVersions.definitionId, definitionId),
    with: { publishedByUser: { columns: { nickname: true } } },
    orderBy: desc(workflowDefinitionVersions.version),
  });
  return rows.map(r => mapDefinitionVersion(r, r.publishedByUser?.nickname ?? null));
}

export async function restoreVersion(definitionId: number, versionId: number) {
  const where = findDefinition(definitionId);
  const [def] = await db.select().from(workflowDefinitions).where(where).limit(1);
  if (!def) throw new HTTPException(404, { message: '流程定义不存在' });
  const [ver] = await db.select().from(workflowDefinitionVersions)
    .where(and(eq(workflowDefinitionVersions.id, versionId), eq(workflowDefinitionVersions.definitionId, definitionId)))
    .limit(1);
  if (!ver) throw new HTTPException(404, { message: '历史版本不存在' });
  const [updated] = await db.update(workflowDefinitions).set({
    name: ver.name,
    description: ver.description,
    flowData: ver.flowData,
    formFields: ver.formFields,
    status: 'draft',
  }).where(where).returning();
  return mapDefinition(updated);
}

export async function disableDefinition(id: number) {
  const where = findDefinition(id);
  const [updated] = await db.update(workflowDefinitions).set({ status: 'disabled' }).where(where).returning();
  if (!updated) throw new HTTPException(404, { message: '流程定义不存在' });
  return mapDefinition(updated);
}

export async function deleteDefinition(id: number) {
  const where = findDefinition(id);
  const [existing] = await db.select().from(workflowDefinitions).where(where).limit(1);
  if (!existing) throw new HTTPException(404, { message: '流程定义不存在' });
  if (existing.status === 'published') throw new HTTPException(400, { message: '已发布的流程不能删除，请先禁用' });
  await db.delete(workflowDefinitions).where(where);
}

export async function getWorkflowDefinitionBeforeAudit(id: number) {
  const row = await db.query.workflowDefinitions.findFirst({
    where: findDefinition(id),
    with: { createdByUser: { columns: { nickname: true } } },
  });
  if (!row) return null;
  return mapDefinition(row, row.createdByUser?.nickname ?? null);
}
