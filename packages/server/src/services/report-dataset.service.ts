/**
 * 报表数据集 Service
 * CRUD + 取数执行（preview 试跑 / data 取数）。
 * - sql：只读事务（READ ONLY + statement_timeout + 行上限）+ ${param} 绑定参数（防注入）。
 * - api：统一走 http-client 的 httpRequest（防 SSRF），按 itemsPath 提取数组，运行时参数注入。
 */
import { HTTPException } from 'hono/http-exception';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { reportDatasets } from '../db/schema';
import { pageOffset } from '../lib/pagination';
import { escapeLike } from '../lib/where-helpers';
import { formatDateTime } from '../lib/datetime';
import { rethrowPgUniqueViolation } from '../lib/db-errors';
import { httpRequest } from '../lib/http-client';
import { ensureDatasourceExists } from './report-datasource.service';
import type { ReportDatasetRow } from '../db/schema';
import type {
  ReportDataset, ReportDataResult, ReportField, ReportFieldType, ReportDatasetContent, ReportDatasetParam,
  ReportDatasourceType, ReportDatasourceConfig,
  ReportApiDatasourceConfig, ReportApiDatasetContent, ReportSqlDatasetContent,
  CreateReportDatasetInput, UpdateReportDatasetInput, ReportDatasetPreviewInput,
} from '@zenith/shared';

const PREVIEW_LIMIT = 100;
const MAX_LIMIT = 5000;
const QUERY_TIMEOUT = '15s';

type DatasetRowWithDs = ReportDatasetRow & { datasource?: { name: string } | null };

export function mapDataset(row: DatasetRowWithDs): ReportDataset {
  return {
    id: row.id,
    name: row.name,
    datasourceId: row.datasourceId,
    datasourceName: row.datasource?.name ?? null,
    type: row.type,
    content: (row.content ?? {}) as ReportDatasetContent,
    fields: (row.fields ?? []) as ReportField[],
    params: (row.params ?? []) as ReportDatasetParam[],
    status: row.status,
    remark: row.remark ?? null,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt),
  };
}

/** 按 type 规整数据集查询内容 */
function normalizeDatasetContent(
  type: ReportDatasourceType,
  content: Record<string, unknown> | null | undefined,
): ReportDatasetContent {
  const c = (content ?? {}) as Record<string, unknown>;
  if (type === 'sql') {
    return { sql: typeof c.sql === 'string' ? c.sql : '' };
  }
  const itemsPath = typeof c.itemsPath === 'string' ? c.itemsPath : null;
  const params = c.params && typeof c.params === 'object' && !Array.isArray(c.params)
    ? (c.params as Record<string, string>)
    : null;
  return { itemsPath, params };
}

function navigatePath(json: unknown, path?: string | null): unknown {
  if (!path) return json;
  return path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key.trim()] : undefined),
    json,
  );
}

function coerceParam(value: unknown, type: ReportFieldType): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'number') { const n = Number(value); return Number.isFinite(n) ? n : null; }
  if (type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
  return String(value);
}

/** 解析有效参数：数据集默认值 + 运行时传入，required 校验 */
export function resolveDatasetParams(defs: ReportDatasetParam[] | undefined, provided?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(provided ?? {}) };
  for (const d of defs ?? []) {
    const raw = provided?.[d.name];
    const val = (raw === undefined || raw === null || raw === '') ? (d.defaultValue ?? null) : coerceParam(raw, d.type);
    out[d.name] = val;
    if (d.required && (val === null || val === undefined)) {
      throw new HTTPException(400, { message: `缺少必填参数：${d.label || d.name}` });
    }
  }
  return out;
}

/** 把 ${name} 编译为绑定参数（防注入）；未提供的绑定 null */
function buildParamSql(text: string, params: Record<string, unknown>): SQL {
  const segments = text.split(/\$\{\s*(\w+)\s*\}/g);
  const chunks: SQL[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      if (segments[i]) chunks.push(sql.raw(segments[i]));
    } else {
      const v = params[segments[i]];
      chunks.push(sql`${v === undefined ? null : v}`);
    }
  }
  return sql.join(chunks, sql.raw(''));
}

/** 只读执行 SQL（READ ONLY 事务 + 超时 + 行上限 + 参数绑定）*/
async function runReadonlySql(text: string, params: Record<string, unknown>, limit: number): Promise<ReportDataResult> {
  const trimmed = text.trim().replace(/;\s*$/, '');
  if (!trimmed) throw new HTTPException(400, { message: '数据集 SQL 不能为空' });
  const capped = Math.max(1, Math.min(limit || PREVIEW_LIMIT, MAX_LIMIT));
  const isSelect = !/;/.test(trimmed) && /^(select|with)\b/i.test(trimmed);
  const inner = buildParamSql(trimmed, params);
  try {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql.raw('SET LOCAL TRANSACTION READ ONLY'));
      await tx.execute(sql.raw(`SET LOCAL statement_timeout = '${QUERY_TIMEOUT}'`));
      if (isSelect) return await tx.execute(sql`SELECT * FROM (${inner}) AS _sub LIMIT ${capped}`);
      return await tx.execute(inner);
    });
    const arr = (rows as unknown as Record<string, unknown>[]) ?? [];
    const sliced = arr.slice(0, capped);
    const columns = sliced.length ? Object.keys(sliced[0]) : [];
    return { columns, rows: sliced, total: arr.length };
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new HTTPException(400, { message: `SQL 执行失败：${msg}` });
  }
}

export async function ensureDatasetExists(id: number): Promise<ReportDatasetRow> {
  const [row] = await db.select().from(reportDatasets).where(eq(reportDatasets.id, id)).limit(1);
  if (!row) throw new HTTPException(404, { message: '数据集不存在' });
  return row;
}

export async function getDataset(id: number): Promise<ReportDataset> {
  const row = await db.query.reportDatasets.findFirst({
    where: eq(reportDatasets.id, id),
    with: { datasource: { columns: { name: true } } },
  });
  if (!row) throw new HTTPException(404, { message: '数据集不存在' });
  return mapDataset(row);
}

export async function listDatasets(query: {
  page?: number; pageSize?: number; keyword?: string; datasourceId?: number; type?: string; status?: string;
}) {
  const { page = 1, pageSize = 20, keyword, datasourceId, type, status } = query;
  const conds = [];
  if (keyword) {
    const kw = `%${escapeLike(keyword)}%`;
    conds.push(or(ilike(reportDatasets.name, kw), ilike(reportDatasets.remark, kw)));
  }
  if (datasourceId) conds.push(eq(reportDatasets.datasourceId, datasourceId));
  if (type === 'api' || type === 'sql') conds.push(eq(reportDatasets.type, type));
  if (status === 'enabled' || status === 'disabled') conds.push(eq(reportDatasets.status, status));
  const where = conds.length ? and(...conds) : undefined;
  const [total, rows] = await Promise.all([
    db.$count(reportDatasets, where),
    db.query.reportDatasets.findMany({
      where,
      with: { datasource: { columns: { name: true } } },
      orderBy: desc(reportDatasets.id),
      limit: pageSize,
      offset: pageOffset(page, pageSize),
    }),
  ]);
  return { list: rows.map(mapDataset), total, page, pageSize };
}

export async function createDataset(input: CreateReportDatasetInput): Promise<ReportDataset> {
  const ds = await ensureDatasourceExists(input.datasourceId);
  const content = normalizeDatasetContent(ds.type, input.content);
  try {
    const [row] = await db.insert(reportDatasets).values({
      name: input.name,
      datasourceId: input.datasourceId,
      type: ds.type,
      content,
      fields: (input.fields ?? []) as ReportField[],
      params: (input.params ?? []) as ReportDatasetParam[],
      status: input.status ?? 'enabled',
      remark: input.remark,
    }).returning();
    return mapDataset(row);
  } catch (err) {
    rethrowPgUniqueViolation(err, '数据集名称已存在');
    throw err;
  }
}

export async function updateDataset(id: number, input: UpdateReportDatasetInput): Promise<ReportDataset> {
  const current = await ensureDatasetExists(id);
  let type: ReportDatasourceType = current.type;
  if (input.datasourceId && input.datasourceId !== current.datasourceId) {
    const ds = await ensureDatasourceExists(input.datasourceId);
    type = ds.type;
  }
  const content = input.content !== undefined ? normalizeDatasetContent(type, input.content) : undefined;
  const typeChanged = input.datasourceId != null && input.datasourceId !== current.datasourceId;
  try {
    const [row] = await db.update(reportDatasets).set({
      name: input.name,
      datasourceId: input.datasourceId,
      type: typeChanged ? type : undefined,
      content,
      fields: input.fields as ReportField[] | undefined,
      params: input.params as ReportDatasetParam[] | undefined,
      status: input.status,
      remark: input.remark,
    }).where(eq(reportDatasets.id, id)).returning();
    if (!row) throw new HTTPException(404, { message: '数据集不存在' });
    return mapDataset(row);
  } catch (err) {
    rethrowPgUniqueViolation(err, '数据集名称已存在');
    throw err;
  }
}

export async function deleteDataset(id: number): Promise<void> {
  await ensureDatasetExists(id);
  await db.delete(reportDatasets).where(eq(reportDatasets.id, id));
}

// ─── 取数核心 ────────────────────────────────────────────────────────────────

/** 按数据源类型执行取数；sql 走只读绑定执行器，api 走 http-client */
export async function runReportData(
  type: ReportDatasourceType,
  config: ReportDatasourceConfig,
  content: ReportDatasetContent,
  params: Record<string, unknown> = {},
  limit = PREVIEW_LIMIT,
): Promise<ReportDataResult> {
  const cappedLimit = Math.max(1, Math.min(limit || PREVIEW_LIMIT, MAX_LIMIT));

  if (type === 'sql') {
    const sqlText = ((content as ReportSqlDatasetContent).sql ?? '').trim();
    if (!sqlText) throw new HTTPException(400, { message: '数据集 SQL 不能为空' });
    return runReadonlySql(sqlText, params, cappedLimit);
  }

  // api
  const apiCfg = config as ReportApiDatasourceConfig;
  if (!apiCfg?.url) throw new HTTPException(400, { message: '数据源未配置 URL' });
  const apiContent = (content ?? {}) as ReportApiDatasetContent;
  const method = apiCfg.method === 'POST' ? 'POST' : 'GET';
  // 合并静态 content.params 与运行时 params（运行时优先），剔除空值
  const merged: Record<string, unknown> = { ...(apiContent.params ?? {}), ...params };
  const effective = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  let url = apiCfg.url;
  let body: Record<string, unknown> | undefined;
  if (Object.keys(effective).length > 0) {
    if (method === 'GET') {
      const u = new URL(apiCfg.url);
      for (const [k, v] of Object.entries(effective)) u.searchParams.set(k, String(v));
      url = u.toString();
    } else {
      body = { ...effective };
    }
  }

  let json: unknown;
  try {
    const res = await httpRequest(url, { method, headers: apiCfg.headers ?? undefined, body, timeout: 10_000 });
    if (!res.ok) throw new HTTPException(502, { message: `数据源返回状态 ${res.status}` });
    json = await res.json();
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    throw new HTTPException(502, { message: '数据源请求失败，请检查 URL 与网络' });
  }

  const arr = navigatePath(json, apiContent.itemsPath);
  if (!Array.isArray(arr)) {
    throw new HTTPException(502, { message: '数据源返回结构不是数组，请检查「数组路径」配置' });
  }
  const sliced = arr.slice(0, cappedLimit) as Record<string, unknown>[];
  const columns = sliced.length > 0 ? Object.keys(sliced[0] ?? {}) : [];
  return { columns, rows: sliced, total: arr.length };
}

/** 试跑预览（不落库）：用未保存的数据源 + content + 运行时参数取数 */
export async function previewDataset(input: ReportDatasetPreviewInput): Promise<ReportDataResult> {
  const ds = await ensureDatasourceExists(input.datasourceId);
  const content = normalizeDatasetContent(ds.type, input.content);
  const params = (input.params ?? {}) as Record<string, unknown>;
  return runReportData(ds.type, (ds.config ?? {}) as ReportDatasourceConfig, content, params, input.limit ?? PREVIEW_LIMIT);
}

/** 取已保存数据集的数据（供仪表盘组件运行时调用，支持参数）*/
export async function getDatasetData(id: number, params?: Record<string, unknown>, limit?: number): Promise<ReportDataResult> {
  const row = await db.query.reportDatasets.findFirst({
    where: eq(reportDatasets.id, id),
    with: { datasource: { columns: { config: true } } },
  });
  if (!row) throw new HTTPException(404, { message: '数据集不存在' });
  if (row.status !== 'enabled') throw new HTTPException(400, { message: '数据集已停用' });
  const config = (row.datasource?.config ?? {}) as ReportDatasourceConfig;
  const resolved = resolveDatasetParams((row.params ?? []) as ReportDatasetParam[], params);
  return runReportData(row.type, config, (row.content ?? {}) as ReportDatasetContent, resolved, limit ?? PREVIEW_LIMIT);
}
