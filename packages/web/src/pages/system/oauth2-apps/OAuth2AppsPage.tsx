import { useState, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  Toast,
  Typography,
  Popconfirm,
  Checkbox,
  TagInput,
  Banner,
} from '@douyinfe/semi-ui';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form/interface';
import { Plus, RotateCcw, Search } from 'lucide-react';
import { OAUTH2_GRANT_TYPES, OAUTH2_SCOPES } from '@zenith/shared';
import type { OAuth2Client, OAuth2ClientCreated, PaginatedResponse } from '@zenith/shared';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { request } from '@/utils/request';
import { SearchToolbar } from '@/components/SearchToolbar';
import ConfigurableTable from '@/components/ConfigurableTable';
import { usePermission } from '@/hooks/usePermission';

const { Text, Paragraph } = Typography;

const GRANT_TYPE_LABELS: Record<string, string> = {
  authorization_code: '授权码',
  client_credentials: '客户端凭证',
  implicit: '隐式（已废弃）',
  refresh_token: '刷新令牌',
};

const SCOPE_LABELS: Record<string, string> = {
  openid: 'OpenID（确认身份）',
  profile: 'Profile（基本信息）',
  email: 'Email（邮箱）',
  offline_access: 'Offline Access（离线访问）',
};

type FormValues = {
  name: string;
  description?: string;
  logoUrl?: string;
  redirectUris: string[];
  allowedScopes: string[];
  grantTypes: string[];
  isPublic: boolean;
  status?: 'enabled' | 'disabled';
};

export default function OAuth2AppsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission('system:oauth2-apps:manage');

  const [data, setData] = useState<OAuth2Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<OAuth2Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<FormApi>(null);

  // 一次性 Secret 展示
  const [secretModal, setSecretModal] = useState(false);
  const [oneTimeSecret, setOneTimeSecret] = useState('');
  const [oneTimeClientId, setOneTimeClientId] = useState('');

  const fetchData = useCallback(async (pg = page, kw = submittedKeyword) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(pg),
        pageSize: String(pageSize),
        ...(kw ? { keyword: kw } : {}),
      }).toString();
      const res = await request.get<PaginatedResponse<OAuth2Client>>(`/api/oauth2/clients?${qs}`);
      setData(res.data?.list ?? []);
      setTotal(res.data?.total ?? 0);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, submittedKeyword]);

  const handleSearch = () => {
    setPage(1);
    setSubmittedKeyword(keyword);
    fetchData(1, keyword);
  };

  const handleReset = () => {
    setKeyword('');
    setSubmittedKeyword('');
    setPage(1);
    fetchData(1, '');
  };

  const openCreate = () => {
    setEditing(null);
    formRef.current?.reset?.();
    setModalVisible(true);
  };

  const openEdit = (row: OAuth2Client) => {
    setEditing(row);
    setModalVisible(true);
    setTimeout(() => {
      formRef.current?.setValues({
        name: row.name,
        description: row.description ?? '',
        logoUrl: row.logoUrl ?? '',
        redirectUris: row.redirectUris,
        allowedScopes: row.allowedScopes,
        grantTypes: row.grantTypes,
        isPublic: row.isPublic,
        status: row.status,
      });
    }, 0);
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await request.put(`/api/oauth2/clients/${editing.id}`, values);
        Toast.success('更新成功');
        setModalVisible(false);
        fetchData();
      } else {
        const res = await request.post<OAuth2ClientCreated>('/api/oauth2/clients', values);
        setModalVisible(false);
        fetchData();
        if (res.data?.clientSecret) {
          setOneTimeClientId(res.data.clientId);
          setOneTimeSecret(res.data.clientSecret);
          setSecretModal(true);
        }
      }
    } catch {
      // handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/api/oauth2/clients/${id}`);
      Toast.success('删除成功');
      fetchData();
    } catch {
      // handled
    }
  };

  const handleRegenerate = async (row: OAuth2Client) => {
    try {
      const res = await request.post<{ clientId: string; clientSecret: string }>(`/api/oauth2/clients/${row.id}/regenerate-secret`);
      if (res.data?.clientSecret) {
        setOneTimeClientId(res.data.clientId);
        setOneTimeSecret(res.data.clientSecret);
        setSecretModal(true);
      }
    } catch {
      // handled
    }
  };

  const columns: ColumnProps<OAuth2Client>[] = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '应用名称', dataIndex: 'name', width: 160 },
    {
      title: 'Client ID',
      dataIndex: 'clientId',
      width: 260,
      render: (v: string) => <Text copyable={{ content: v }}>{v}</Text>,
    },
    {
      title: 'Secret 前缀',
      dataIndex: 'clientSecretPrefix',
      width: 140,
      render: (v: string | null) => v ?? <Text type="tertiary">（公开客户端）</Text>,
    },
    {
      title: '授权类型',
      dataIndex: 'grantTypes',
      width: 240,
      render: (v: string[]) => (
        <Space wrap>
          {v?.map((t) => <Tag key={t} size="small">{GRANT_TYPE_LABELS[t] ?? t}</Tag>)}
        </Space>
      ),
    },
    {
      title: '权限范围',
      dataIndex: 'allowedScopes',
      width: 220,
      render: (v: string[]) => (
        <Space wrap>
          {v?.map((s) => <Tag key={s} color="blue" size="small">{s}</Tag>)}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={v === 'enabled' ? 'green' : 'grey'}>{v === 'enabled' ? '启用' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 160 },
    {
      title: '操作',
      fixed: 'right' as const,
      width: 180,
      render: (_: unknown, record: OAuth2Client) => (
        <Space>
          <Button theme="borderless" size="small" onClick={() => openEdit(record)}>编辑</Button>
          {canManage && !record.isPublic && (
            <Popconfirm title="重置 client_secret？此操作不可撤销" onConfirm={() => handleRegenerate(record)}>
              <Button theme="borderless" size="small">重置 Secret</Button>
            </Popconfirm>
          )}
          {canManage && (
            <Popconfirm title="确定要删除此应用吗？" onConfirm={() => handleDelete(record.id)}>
              <Button theme="borderless" type="danger" size="small">删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SearchToolbar>
        <Input
          prefix={<Search size={14} />}
          placeholder="搜索应用名称"
          value={keyword}
          onChange={setKeyword}
          onEnterPress={handleSearch}
          showClear
        />
        <Button type="primary" icon={<Search size={14} />} onClick={handleSearch}>查询</Button>
        <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={handleReset}>重置</Button>
        {canManage && (
          <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>新增</Button>
        )}
      </SearchToolbar>

      <ConfigurableTable
        bordered
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{
          currentPage: page,
          pageSize,
          total,
          onChange: (p) => { setPage(p); fetchData(p); },
        }}
      />

      {/* 新建 / 编辑弹窗 */}
      <Modal
        title={editing ? '编辑 OAuth2 应用' : '新建 OAuth2 应用'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form<FormValues> getFormApi={(api) => { (formRef as { current: FormApi }).current = api; }} onSubmit={handleSubmit}>
          <Form.Input field="name" label="应用名称" rules={[{ required: true, message: '必填' }]} />
          <Form.TextArea field="description" label="应用描述" />
          <Form.Input field="logoUrl" label="Logo URL" />
          <Form.TagInput
            field="redirectUris"
            label="回调 URL 列表（回车添加）"
            placeholder="https://yourapp.com/callback"
            rules={[{ required: true, message: '至少填写一个回调 URL' }]}
          />
          <Form.CheckboxGroup
            field="allowedScopes"
            label="允许的 scope"
            rules={[{ required: true, message: '至少选择一个' }]}
          >
            {OAUTH2_SCOPES.map((s) => (
              <Checkbox key={s} value={s}>{SCOPE_LABELS[s] ?? s}</Checkbox>
            ))}
          </Form.CheckboxGroup>
          <Form.CheckboxGroup
            field="grantTypes"
            label="授权类型"
            rules={[{ required: true, message: '至少选择一个' }]}
          >
            {OAUTH2_GRANT_TYPES.map((t) => (
              <Checkbox key={t} value={t}>{GRANT_TYPE_LABELS[t] ?? t}</Checkbox>
            ))}
          </Form.CheckboxGroup>
          <Form.Switch field="isPublic" label="公开客户端（不使用 client_secret）" />
          {editing && (
            <Form.Select
              field="status"
              label="状态"
              optionList={[
                { value: 'enabled', label: '启用' },
                { value: 'disabled', label: '禁用' },
              ]}
            />
          )}
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editing ? '保存' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 一次性 Secret 展示弹窗 */}
      <Modal
        title="请复制保存 client_secret"
        visible={secretModal}
        onCancel={() => setSecretModal(false)}
        footer={<Button type="primary" onClick={() => setSecretModal(false)}>我已复制，关闭</Button>}
        closeOnEsc={false}
        maskClosable={false}
      >
        <Banner
          type="warning"
          description="此 client_secret 仅显示一次，关闭后将无法再次查看。请立即复制并妥善保存。"
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 8 }}>
          <Text strong>Client ID：</Text>
        </div>
        <Paragraph copyable style={{ wordBreak: 'break-all', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
          {oneTimeClientId}
        </Paragraph>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <Text strong>Client Secret：</Text>
        </div>
        <Paragraph copyable style={{ wordBreak: 'break-all', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
          {oneTimeSecret}
        </Paragraph>
      </Modal>
    </div>
  );
}
