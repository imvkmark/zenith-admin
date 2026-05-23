/**
 * 基础信息面板 — 步骤 ① 基础信息
 */
import { Form, Tag } from '@douyinfe/semi-ui';
import type { WorkflowDefinition } from '@zenith/shared';
import { useWorkflowCategories } from '@/hooks/useWorkflowCategories';

interface BasicInfoPanelProps {
  definition: WorkflowDefinition | null;
  isNew: boolean;
  categoryId: number | null;
  onFieldChange: (field: string, value: string) => void;
  onCategoryChange: (categoryId: number | null) => void;
}

function getStatusLabel(status: string): string {
  if (status === 'published') return '已发布';
  if (status === 'draft') return '草稿';
  return '已禁用';
}

export default function BasicInfoPanel({ definition, isNew, categoryId, onFieldChange, onCategoryChange }: Readonly<BasicInfoPanelProps>) {
  const { categories } = useWorkflowCategories();
  return (
    <div className="fd-basic-info">
      <div className="fd-basic-info__inner">
        <Form
          key={`basic-${definition?.id ?? 'new'}-${categoryId ?? 'none'}`}
          initValues={{
            name: definition?.name ?? '',
            description: definition?.description ?? '',
            categoryId: categoryId ?? undefined,
          }}
          labelPosition="top"
          onValueChange={(values: Record<string, unknown>) => {
            if (typeof values.name === 'string') onFieldChange('name', values.name);
            if (typeof values.description === 'string') onFieldChange('description', values.description);
          }}
        >
          <Form.Input
            field="name"
            label="流程名称"
            placeholder="请输入流程名称"
            rules={[{ required: true, message: '请输入流程名称' }]}
          />
          <Form.Select
            field="categoryId"
            label="流程分类"
            placeholder="请选择流程分类"
            showClear
            style={{ width: '100%' }}
            onChange={v => onCategoryChange(typeof v === 'number' ? v : null)}
            optionList={categories.map(c => ({
              value: c.id,
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {c.color ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} /> : null}
                  {c.name}
                  {c.code ? <Tag size="small" color="white" style={{ marginLeft: 4 }}>{c.code}</Tag> : null}
                </span>
              ),
            }))}
          />
          <Form.TextArea
            field="description"
            label="流程描述"
            placeholder="请输入流程描述"
            autosize={{ minRows: 3, maxRows: 6 }}
          />
          {!isNew && definition && (
            <>
              <Form.Input key={`v-${definition.version}`} field="version" label="版本号" disabled initValue={String(definition.version)} />
              <Form.Input key={`s-${definition.status}`} field="status" label="状态" disabled initValue={getStatusLabel(definition.status)} />
            </>
          )}
        </Form>
      </div>
    </div>
  );
}
