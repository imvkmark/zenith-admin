import { desc } from 'drizzle-orm';
import { db } from '../../../db';
import { announcements } from '../../../db/schema';
import { currentUser } from '../../context';
import { tenantCondition } from '../../tenant';
import { defineExport } from '../registry';
import type { ExportColumn } from '../types';

const columns: ExportColumn[] = [
  { key: 'id', header: 'ID', width: 8, type: 'number' },
  { key: 'title', header: '标题', width: 24 },
  { key: 'type', header: '类型', width: 12 },
  { key: 'priority', header: '优先级', width: 10 },
  { key: 'publishStatus', header: '发布状态', width: 12 },
  { key: 'createByName', header: '创建人', width: 14 },
  { key: 'createdAt', header: '创建时间', width: 22, type: 'datetime' },
];

export const announcementsExportDefinition = defineExport({
  entity: 'system.announcements',
  moduleName: '公告管理',
  filenamePrefix: '公告列表',
  sourcePath: '/system/announcements',
  sheetName: '公告',
  permissions: { export: 'system:announcement:list' },
  execution: { mode: 'sync', syncModeOverridesAsyncPolicies: true },
  retention: { normalDays: 7, sensitiveDays: 7, rawDays: 7 },
  columns,
  countRows: async () => db.$count(announcements, tenantCondition(announcements, currentUser())),
  streamRows: async () =>
    db.select().from(announcements).where(tenantCondition(announcements, currentUser())).orderBy(desc(announcements.id)),
});
