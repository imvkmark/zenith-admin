/**
 * 通用流程实例详情面板
 * 在 MyApplications / WorkflowMonitor / PendingApprovals 中复用
 */
import type { ReactNode } from 'react';
import {
  Descriptions, Empty, Spin, Tabs, TabPane, Tag, Typography,
} from '@douyinfe/semi-ui';
import type { WorkflowDefinition, WorkflowInstance, WorkflowFormField } from '@zenith/shared';
import { formatDateTime } from '@/utils/date';
import ApprovalTimeline from '@/components/ApprovalTimeline';
import WorkflowFormRenderer from '@/pages/workflow/designer/components/WorkflowFormRenderer';
import WorkflowGraphView from './WorkflowGraphView';
import WorkflowNodeListView from './WorkflowNodeListView';

type TagColor = 'amber' | 'blue' | 'cyan' | 'green' | 'grey' | 'orange' | 'red';

const INSTANCE_STATUS_MAP: Record<string, { text: string; color: TagColor }> = {
  draft: { text: '草稿', color: 'grey' },
  running: { text: '审批中', color: 'blue' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
  withdrawn: { text: '已撤回', color: 'orange' },
};

interface Props {
  instance: WorkflowInstance | null;
  definition?: WorkflowDefinition | null;
  loading?: boolean;
  extraActions?: ReactNode;
}

export default function WorkflowInstanceDetailPanel({
  instance, definition, loading, extraActions,
}: Readonly<Props>) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  }
  if (!instance) {
    return <Empty title="暂无数据" />;
  }
  const statusInfo = INSTANCE_STATUS_MAP[instance.status];
  const formFields: WorkflowFormField[] = definition?.formFields ?? [];
  const hasFormFields = formFields.length > 0;
  const flowData = (definition?.flowData ?? null) as { process?: import('@/pages/workflow/designer/types').FlowProcess } | null;

  const renderFormData = () => {
    if (hasFormFields) {
      return (
        <WorkflowFormRenderer
          fields={formFields}
          initValues={(instance.formData as Record<string, unknown>) ?? {}}
          readOnly
        />
      );
    }
    const formatValue = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    };
    if (instance.formData && Object.keys(instance.formData).length > 0) {
      return (
        <Descriptions
          data={Object.entries(instance.formData).map(([k, v]) => ({ key: k, value: formatValue(v) }))}
        />
      );
    }
    return <Empty title="无表单数据" />;
  };

  return (
    <div>
      <Descriptions
        row
        size="medium"
        data={[
          { key: '申请标题', value: instance.title },
          ...(definition?.categoryName ? [{ key: '流程分类', value: definition.categoryName }] : []),
          { key: '流程名称', value: instance.definitionName ?? '—' },
          { key: '发起人', value: instance.initiatorName ?? '—' },
          {
            key: '当前状态',
            value: statusInfo
              ? <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
              : <span>{instance.status}</span>,
          },
          { key: '提交时间', value: formatDateTime(instance.createdAt) },
        ]}
      />

      {extraActions ? (
        <div style={{ marginTop: 12 }}>{extraActions}</div>
      ) : null}

      <Tabs type="line" style={{ marginTop: 16 }}>
        <TabPane tab="表单内容" itemKey="form">{renderFormData()}</TabPane>
        <TabPane tab="流程图" itemKey="graph">
          <WorkflowGraphView flowData={flowData} />
        </TabPane>
        <TabPane tab="节点列表" itemKey="nodes">
          <WorkflowNodeListView flowData={flowData} />
        </TabPane>
        <TabPane tab="审批记录" itemKey="approvals">
          {instance.tasks && instance.tasks.length > 0 ? (
            <ApprovalTimeline tasks={instance.tasks} />
          ) : (
            <Empty title="暂无审批记录" />
          )}
        </TabPane>
      </Tabs>

      {definition?.description ? (
        <div style={{ marginTop: 16, color: 'var(--semi-color-text-2)', fontSize: 13 }}>
          <Typography.Text type="tertiary">流程说明：{definition.description}</Typography.Text>
        </div>
      ) : null}
    </div>
  );
}
