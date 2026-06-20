/**
 * 工作流事件 → 站内信（持久化待办通知）订阅者
 *
 * 与 ws.ts（瞬时 WebSocket 推送）互补：本订阅者将关键事件落库到 in_app_messages，
 * 使待办、催办、审批结果在消息中心留痕，离线用户登录后仍可见。
 * - task.created（pending 审批任务）→ 通知处理人「待办提醒」
 * - task.created（ccNode 抄送任务）  → 通知抄送人「抄送通知」
 * - task.urged                       → 通知处理人「催办提醒」
 * - instance.approved/rejected/withdrawn → 通知发起人「审批结果」
 */
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { inAppMessages, workflowInstances } from '../../db/schema';
import type { InAppMessageType } from '@zenith/shared';
import { workflowEventBus } from '../workflow-event-bus';
import logger from '../logger';

async function resolveInstanceLabel(instanceId: number): Promise<string> {
  const [row] = await db
    .select({ title: workflowInstances.title, serialNo: workflowInstances.serialNo })
    .from(workflowInstances)
    .where(eq(workflowInstances.id, instanceId))
    .limit(1);
  if (!row) return `#${instanceId}`;
  return row.serialNo ? `${row.title}（${row.serialNo}）` : row.title;
}

async function insertMessage(input: {
  userId: number;
  title: string;
  content: string;
  type: InAppMessageType;
  tenantId: number | null;
}): Promise<void> {
  try {
    await db.insert(inAppMessages).values({
      userId: input.userId,
      title: input.title,
      content: input.content,
      type: input.type,
      source: 'system',
      tenantId: input.tenantId,
    });
  } catch (err) {
    logger.error('[workflow notification] insert failed', { err, userId: input.userId, title: input.title });
  }
}

export function registerNotificationWorkflowSubscriber(): void {
  workflowEventBus.on('task.created', async (event) => {
    const task = event.task;
    if (!task.assigneeId) return;
    const isCc = task.nodeType === 'ccNode';
    // 仅在 pending（激活的人工审批）或抄送时通知；waiting（顺序会签未激活）不打扰
    if (!isCc && task.status !== 'pending') return;
    const label = await resolveInstanceLabel(event.instanceId);
    await insertMessage({
      userId: task.assigneeId,
      title: isCc ? '流程抄送通知' : '待办审批提醒',
      content: isCc
        ? `流程「${label}」抄送给你（节点：${task.nodeName}）`
        : `你有一条新的待办：流程「${label}」（节点：${task.nodeName}），请及时处理`,
      type: 'info',
      tenantId: event.tenantId,
    });
  });

  workflowEventBus.on('task.urged', async (event) => {
    const task = event.task;
    if (!task.assigneeId) return;
    const label = await resolveInstanceLabel(event.instanceId);
    const extra = event.comment ? `：${event.comment}` : '';
    await insertMessage({
      userId: task.assigneeId,
      title: '催办提醒',
      content: `流程「${label}」（节点：${task.nodeName}）有人催办${extra}，请尽快处理`,
      type: 'warning',
      tenantId: event.tenantId,
    });
  });

  workflowEventBus.on('task.transferred', async (event) => {
    const task = event.task;
    if (!task.assigneeId || task.status !== 'pending') return;
    const label = await resolveInstanceLabel(event.instanceId);
    await insertMessage({
      userId: task.assigneeId,
      title: '待办转交提醒',
      content: `流程「${label}」（节点：${task.nodeName}）的审批任务已转交给你，请及时处理`,
      type: 'info',
      tenantId: event.tenantId,
    });
  });

  const notifyInitiator = (status: 'approved' | 'rejected' | 'withdrawn') => async (
    event: { instanceId: number; tenantId: number | null; instance: { initiatorId: number; title: string; serialNo?: string | null } },
  ) => {
    const inst = event.instance;
    const label = inst.serialNo ? `${inst.title}（${inst.serialNo}）` : inst.title;
    const map = {
      approved: { title: '审批通过', content: `你发起的流程「${label}」已审批通过`, type: 'success' as const },
      rejected: { title: '审批被驳回', content: `你发起的流程「${label}」已被驳回`, type: 'error' as const },
      withdrawn: { title: '流程已撤回', content: `你发起的流程「${label}」已撤回`, type: 'warning' as const },
    };
    const m = map[status];
    await insertMessage({ userId: inst.initiatorId, title: m.title, content: m.content, type: m.type, tenantId: event.tenantId });
  };

  workflowEventBus.on('instance.approved', notifyInitiator('approved'));
  workflowEventBus.on('instance.rejected', notifyInitiator('rejected'));
  workflowEventBus.on('instance.withdrawn', notifyInitiator('withdrawn'));
}
