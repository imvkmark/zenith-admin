/**
 * WorkflowApproverPreviewDrawer — 设计器内审批人预览（3C）。
 * 对未发布的草稿 flowData 调用 /preview-draft，按可选「测试发起人 + 测试表单」实时解析每个节点的审批人，
 * 复用 ApproverPreviewTimeline 渲染链路。配合体检/仿真，形成「配 → 预览 → 仿真 → 体检 → 发布」闭环。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, SideSheet, Select, Typography, TextArea, Toast } from '@douyinfe/semi-ui';
import { RefreshCw } from 'lucide-react';
import type { WorkflowApproverPreviewNode, WorkflowFlowData, WorkflowFormField } from '@zenith/shared';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form/interface';
import { request } from '@/utils/request';
import { ApproverPreviewTimeline } from '@/components/workflow/WorkflowApproverPreview';
import WorkflowFormRenderer from './WorkflowFormRenderer';

interface UserOption {
  id: number;
  nickname: string;
}

interface Props {
  visible: boolean;
  flowData: WorkflowFlowData;
  formFields: WorkflowFormField[];
  users: UserOption[];
  onClose: () => void;
}

export default function WorkflowApproverPreviewDrawer({ visible, flowData, formFields, users, onClose }: Readonly<Props>) {
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<WorkflowApproverPreviewNode[]>([]);
  const [starterUserId, setStarterUserId] = useState<number | undefined>(undefined);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [jsonDraft, setJsonDraft] = useState('{}');
  const formApi = useRef<FormApi | null>(null);

  const userOptions = users.map((u) => ({ value: u.id, label: u.nickname }));

  const load = useCallback(async () => {
    if (!flowData?.nodes?.length) {
      setNodes([]);
      return;
    }
    // 表单驱动时优先取表单实时值；否则解析 JSON 草稿
    let fd: Record<string, unknown> = formData;
    if (formFields.length > 0 && formApi.current) {
      fd = formApi.current.getValues() as Record<string, unknown>;
    } else if (formFields.length === 0 && jsonDraft.trim()) {
      try {
        fd = JSON.parse(jsonDraft) as Record<string, unknown>;
      } catch {
        Toast.error('测试表单数据不是合法 JSON');
        return;
      }
    }
    setLoading(true);
    try {
      const res = await request.post<WorkflowApproverPreviewNode[]>(
        '/api/workflows/definitions/preview-draft',
        { flowData, formData: fd, starterUserId },
        { silent: true },
      );
      if (res.code === 0) setNodes(res.data ?? []);
      else Toast.error(res.message || '预览失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowData, starterUserId, jsonDraft]);

  // 打开抽屉时自动预览一次
  useEffect(() => {
    if (visible) void load();
    else setNodes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <SideSheet title="审批人预览" visible={visible} onCancel={onClose} width="min(560px, 96vw)">
      <Typography.Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
        基于当前未保存的流程草稿解析审批人；可切换测试发起人与测试表单，观察条件分支与审批人如何变化。
      </Typography.Text>

      <Select
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="默认使用当前登录用户作为发起人"
        showClear
        filter
        optionList={userOptions}
        value={starterUserId}
        onChange={(v) => setStarterUserId(typeof v === 'number' ? v : undefined)}
      />

      {formFields.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <WorkflowFormRenderer
            fields={formFields}
            initValues={formData}
            getFormApi={(api) => { formApi.current = api; }}
            onValueChange={setFormData}
            labelPosition="top"
          />
        </div>
      ) : (
        <TextArea
          value={jsonDraft}
          onChange={setJsonDraft}
          rows={6}
          style={{ marginBottom: 12 }}
          placeholder={'{\n  "amount": 1200\n}'}
        />
      )}

      <Button
        block
        type="primary"
        icon={<RefreshCw size={14} />}
        loading={loading}
        onClick={() => void load()}
        style={{ marginBottom: 16 }}
      >
        按当前条件预览
      </Button>

      <ApproverPreviewTimeline nodes={nodes} loading={loading} />
    </SideSheet>
  );
}
