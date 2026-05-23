/**
 * 流程定义页左侧分类侧栏
 */
import { useState } from 'react';
import { Button, Dropdown, Popconfirm, SideSheet, Space, Toast, Form } from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form/interface';
import { MoreHorizontal, Plus } from 'lucide-react';
import type { WorkflowCategory } from '@zenith/shared';
import { request } from '@/utils/request';

interface Props {
  categories: WorkflowCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onChanged: () => void;
  canManage: boolean;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function CategorySidebar({ categories, selectedId, onSelect, onChanged, canManage }: Readonly<Props>) {
  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState<WorkflowCategory | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formApi, setFormApi] = useState<FormApi | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditVisible(true);
  };

  const openEdit = (c: WorkflowCategory) => {
    setEditing(c);
    setEditVisible(true);
  };

  const handleSubmit = async () => {
    if (!formApi) return;
    try {
      const values = await formApi.validate() as Record<string, unknown>;
      setSubmitting(true);
      const payload = {
        name: values.name,
        code: values.code || null,
        icon: values.icon || null,
        color: values.color || null,
        sort: typeof values.sort === 'number' ? values.sort : Number(values.sort) || 0,
        description: values.description || null,
      };
      const res = editing
        ? await request.put(`/api/workflows/categories/${editing.id}`, payload)
        : await request.post('/api/workflows/categories', payload);
      if (res.code === 0) {
        Toast.success(editing ? '已更新' : '已新增');
        setEditVisible(false);
        onChanged();
      }
    } catch {
      // validation failed
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: WorkflowCategory) => {
    const res = await request.delete(`/api/workflows/categories/${c.id}`);
    if (res.code === 0) {
      Toast.success('已删除');
      if (selectedId === c.id) onSelect(null);
      onChanged();
    }
  };

  const renderItem = (label: string, count: number | null, isAll: boolean, c?: WorkflowCategory) => {
    const isActive = isAll ? selectedId === null : selectedId === c?.id;
    return (
      <button
        type="button"
        onClick={() => onSelect(isAll ? null : c?.id ?? null)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '8px 12px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          background: isActive ? 'var(--semi-color-fill-1)' : 'transparent',
          borderLeft: `3px solid ${isActive ? (c?.color ?? 'var(--semi-color-primary)') : 'transparent'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
        }}
      >
        {c?.color ? (
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
        ) : <span style={{ width: 10 }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {count !== null && <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>{count}</span>}
        {canManage && c && (
          <Dropdown
            trigger="custom"
            visible={openMenuId === c.id}
            onClickOutSide={() => setOpenMenuId(null)}
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => { setOpenMenuId(null); openEdit(c); }}>编辑</Dropdown.Item>
                <Dropdown.Item>
                  <Popconfirm
                    title="确定删除该分类？"
                    content="分类下若仍有流程将无法删除"
                    onConfirm={() => { setOpenMenuId(null); void handleDelete(c); }}
                  >
                    <span style={{ color: 'var(--semi-color-danger)' }}>删除</span>
                  </Popconfirm>
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}
            >
              <MoreHorizontal size={14} />
            </button>
          </Dropdown>
        )}
      </button>
    );
  };

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: 'var(--semi-color-bg-1)',
      borderRadius: 8, border: '1px solid var(--semi-color-border)',
      padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
      alignSelf: 'flex-start',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px', borderBottom: '1px solid var(--semi-color-border)', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>流程分类</span>
        {canManage && (
          <Button theme="borderless" size="small" icon={<Plus size={14} />} onClick={openNew}>新增</Button>
        )}
      </div>
      {renderItem('全部流程', null, true)}
      {categories.map(c => (
        <div key={c.id}>{renderItem(c.name, null, false, c)}</div>
      ))}

      <SideSheet
        title={editing ? '编辑分类' : '新增分类'}
        visible={editVisible}
        onCancel={() => setEditVisible(false)}
        width={480}
        bodyStyle={{ padding: 16 }}
        footer={(
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditVisible(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>保存</Button>
          </Space>
        )}
      >
        <Form
          getFormApi={api => setFormApi(api)}
          initValues={{
            name: editing?.name ?? '',
            code: editing?.code ?? '',
            icon: editing?.icon ?? '',
            color: editing?.color ?? '',
            sort: editing?.sort ?? 0,
            description: editing?.description ?? '',
          }}
          labelPosition="top"
        >
          <Form.Input
            field="name" label="名称"
            placeholder="如：人事 / 财务 / IT"
            rules={[{ required: true, message: '请填写名称' }]}
          />
          <Form.Input field="code" label="编码" placeholder="可选，仅字母数字" />
          <Form.Slot label="颜色">
            <Space wrap>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => formApi?.setValue('color', color)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: color,
                    border: formApi?.getValue('color') === color ? '2px solid var(--semi-color-text-0)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  aria-label={color}
                />
              ))}
              <Form.Input field="color" noLabel placeholder="自定义 #hex" style={{ width: 120 }} />
            </Space>
          </Form.Slot>
          <Form.Input field="icon" label="图标名称" placeholder="lucide 图标名（可选）" />
          <Form.InputNumber field="sort" label="排序" min={0} style={{ width: '100%' }} />
          <Form.TextArea field="description" label="描述" autosize={{ minRows: 2, maxRows: 4 }} />
        </Form>
      </SideSheet>
    </div>
  );
}
