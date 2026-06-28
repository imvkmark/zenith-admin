/**
 * 提交前审批链路预览（T1-1）+ 设计器草稿预览（3C）
 *
 * 对流程做"干跑"遍历：从 start 沿正常边走，按节点 assigneeType 解析出真实审批人姓名，
 * 供发起页/设计器在提交或发布前展示「审批人：张三 → 李四 → …」。条件/并行分支会标注分支名并展开所有分支。
 * - previewFlow：对**已发布** definitionId（租户校验）。
 * - previewFlowDraft：对设计器**未发布草稿** flowData，可指定测试发起人。
 */
import { eq, and, inArray } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db';
import { workflowDefinitions, users } from '../db/schema';
import { tenantCondition } from '../lib/tenant';
import { currentUser } from '../lib/context';
import { resolveAssigneeIds } from './workflow-assignee-resolver.service';
import type { WorkflowFlowData, WorkflowApproverPreviewNode, PreviewWorkflowDraftInput } from '@zenith/shared';

const APPROVER_TYPES = new Set(['approve', 'handler']);

/** 核心：对给定 flowData 干跑遍历，解析每个审批/办理/抄送/子流程节点的审批人。 */
async function previewFlowData(
  flowData: WorkflowFlowData | null,
  initiatorId: number,
  formData?: Record<string, unknown> | null,
): Promise<WorkflowApproverPreviewNode[]> {
  if (!flowData?.nodes?.length) throw new HTTPException(400, { message: '流程未配置，无法预览' });

  const nodeById = new Map(flowData.nodes.map((n) => [n.id, n]));
  const outEdges = new Map<string, WorkflowFlowData['edges']>();
  const inDegree = new Map<string, number>();
  for (const e of flowData.edges) {
    if (e.isException) continue;
    if (nodeById.get(e.target)?.data.type === 'catchNode') continue;
    (outEdges.get(e.source) ?? outEdges.set(e.source, []).get(e.source)!).push(e);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  const startNode = flowData.nodes.find((n) => n.data.type === 'start');
  if (!startNode) throw new HTTPException(400, { message: '流程缺少开始节点' });

  const fd = (formData ?? {}) as Record<string, unknown>;
  const pendingIds = new Set<number>();
  const entries: Array<{ nodeKey: string; nodeName: string; nodeType: string; ids: number[]; approveMethod: string | null; branchLabel: string | null }> = [];
  const visited = new Set<string>();

  // 发起人节点：始终作为链路第一个节点，展示当前（测试）发起人
  entries.push({ nodeKey: '__initiator__', nodeName: '发起人', nodeType: 'start', ids: [initiatorId], approveMethod: null, branchLabel: null });
  pendingIds.add(initiatorId);

  const walk = async (nodeId: string, branchLabel: string | null): Promise<void> => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodeById.get(nodeId);
    if (!node) return;
    const type = node.data.type;
    if (APPROVER_TYPES.has(type) || type === 'ccNode' || type === 'subProcess') {
      let ids: number[] = [];
      if (type !== 'subProcess') {
        try {
          ids = await resolveAssigneeIds(node.data, { initiatorId, formData: fd });
        } catch {
          ids = [];
        }
      }
      ids.forEach((id) => pendingIds.add(id));
      entries.push({
        nodeKey: node.data.key,
        nodeName: node.data.label,
        nodeType: type,
        ids,
        approveMethod: node.data.approveMethod ?? null,
        branchLabel,
      });
    }
    const outs = outEdges.get(nodeId) ?? [];
    const isBranch = outs.length > 1;
    for (const e of outs) {
      const targetMerge = (inDegree.get(e.target) ?? 0) > 1;
      const nextLabel = targetMerge ? null : (isBranch ? (e.label || '分支') : branchLabel);
      await walk(e.target, nextLabel);
    }
  };
  await walk(startNode.id, null);

  const idList = [...pendingIds];
  const nameMap = new Map<number, string>();
  if (idList.length > 0) {
    const rows = await db.select({ id: users.id, nickname: users.nickname, username: users.username })
      .from(users).where(inArray(users.id, idList));
    for (const r of rows) nameMap.set(r.id, r.nickname ?? r.username);
  }

  return entries.map((e) => ({
    nodeKey: e.nodeKey,
    nodeName: e.nodeName,
    nodeType: e.nodeType,
    approvers: e.ids.map((id) => ({ id, name: nameMap.get(id) ?? `用户#${id}` })),
    approveMethod: e.approveMethod,
    branchLabel: e.branchLabel,
    empty: APPROVER_TYPES.has(e.nodeType) && e.ids.length === 0,
  }));
}

export async function previewFlow(
  definitionId: number,
  formData?: Record<string, unknown> | null,
): Promise<WorkflowApproverPreviewNode[]> {
  const user = currentUser();
  const tc = tenantCondition(workflowDefinitions, user);
  const conds = [eq(workflowDefinitions.id, definitionId)];
  if (tc) conds.push(tc);
  const [def] = await db.select().from(workflowDefinitions).where(and(...conds)).limit(1);
  if (!def) throw new HTTPException(404, { message: '流程定义不存在' });
  return previewFlowData(def.flowData as WorkflowFlowData | null, user.userId, formData);
}

/** 设计器草稿预览：对未发布的 flowData 解析审批链路，可指定测试发起人（默认当前用户）。 */
export async function previewFlowDraft(input: PreviewWorkflowDraftInput): Promise<WorkflowApproverPreviewNode[]> {
  const user = currentUser();
  const initiatorId = input.starterUserId ?? user.userId;
  return previewFlowData(input.flowData as unknown as WorkflowFlowData, initiatorId, input.formData);
}
