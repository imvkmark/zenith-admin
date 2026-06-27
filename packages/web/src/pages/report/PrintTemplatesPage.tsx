import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Modal, Select, Switch, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form/interface';
import { Plus, RotateCcw, Search } from 'lucide-react';
import ConfigurableTable from '@/components/ConfigurableTable';
import { createOperationColumn } from '@/components/ResponsiveTableActions';
import { SearchToolbar } from '@/components/SearchToolbar';
import AppModal from '@/components/AppModal';
import ExportButton from '@/components/ExportButton';
import { request } from '@/utils/request';
import { formatDateTime } from '@/utils/date';
import { renderEllipsis } from '@/utils/table-columns';
import { usePermission } from '@/hooks/usePermission';
import { usePagination } from '@/hooks/usePagination';
import PrintReportView from './PrintReportView';
import type {
  CreateReportPrintTemplateInput,
  PaginatedResponse,
  ReportDataset,
  ReportPrintRenderResult,
  ReportPrintTemplate,
  UpdateReportPrintTemplateInput,
} from '@zenith/shared';

interface SearchParams { keyword: string; status: string }
const defaultSearchParams: SearchParams = { keyword: '', status: '' };

function defaultParamValues(template: ReportPrintTemplate) {
  const params: Record<string, unknown> = {};
  for (const param of template.params ?? []) {
    if (param.defaultValue !== undefined) params[param.name] = param.defaultValue;
  }
  return params;
}

export default function PrintTemplatesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const formApi = useRef<FormApi | null>(null);

  const [data, setData] = useState<PaginatedResponse<ReportPrintTemplate> | null>(null);
  const [datasets, setDatasets] = useState<ReportDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const { page, pageSize, setPage, setPageSize, buildPagination } = usePagination();
  const [searchParams, setSearchParams] = useState<SearchParams>(defaultSearchParams);
  const searchParamsRef = useRef<SearchParams>(defaultSearchParams);
  searchParamsRef.current = searchParams;

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ReportPrintTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ReportPrintRenderResult | null>(null);
  const [previewParams, setPreviewParams] = useState<Record<string, unknown>>({});

  const fetchList = useCallback(async (p = page, ps = pageSize, params?: SearchParams) => {
    const active = params ?? searchParamsRef.current;
    setLoading(true);
    try {
      const q: Record<string, string> = { page: String(p), pageSize: String(ps) };
      if (active.keyword) q.keyword = active.keyword;
      if (active.status) q.status = active.status;
      const res = await request.get<PaginatedResponse<ReportPrintTemplate>>(`/api/report/print?${new URLSearchParams(q)}`);
      if (res.code === 0) { setData(res.data); setPage(res.data.page); setPageSize(res.data.pageSize); }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    void fetchList();
    request.get<PaginatedResponse<ReportDataset>>('/api/report/datasets?page=1&pageSize=200').then((res) => {
      if (res.code === 0) setDatasets(res.data.list.filter((d) => d.status === 'enabled'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() { setPage(1); void fetchList(1, pageSize); }
  function handleReset() { setSearchParams(defaultSearchParams); setPage(1); void fetchList(1, pageSize, defaultSearchParams); }

  function openCreate() { setEditing(null); setModalVisible(true); }
  function openEdit(record: ReportPrintTemplate) { setEditing(record); setModalVisible(true); }
  function closeModal() { setModalVisible(false); setEditing(null); }

  const formInitValues = editing
    ? {
        name: editing.name,
        datasetId: editing.datasetId ?? undefined,
        status: editing.status,
        remark: editing.remark ?? '',
      }
    : { status: 'enabled' };

  async function handleModalOk() {
    let values: Record<string, unknown>;
    try { values = await formApi.current?.validate() as Record<string, unknown>; }
    catch { throw new Error('validation'); }

    const basePayload = {
      name: String(values.name ?? '').trim(),
      datasetId: values.datasetId ? Number(values.datasetId) : null,
      status: values.status as ReportPrintTemplate['status'],
      remark: values.remark ? String(values.remark) : undefined,
    };
    setSubmitting(true);
    try {
      const res = editing
        ? await request.put<ReportPrintTemplate>(`/api/report/print/${editing.id}`, basePayload satisfies UpdateReportPrintTemplateInput)
        : await request.post<ReportPrintTemplate>('/api/report/print', basePayload satisfies CreateReportPrintTemplateInput);
      if (res.code === 0) {
        Toast.success(editing ? '更新成功' : '创建成功');
        closeModal();
        if (editing) void fetchList();
        else navigate(`/report/print/${res.data.id}/design`);
      } else {
        throw new Error(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await request.delete(`/api/report/print/${id}`);
    if (res.code === 0) { Toast.success('删除成功'); void fetchList(); }
  }

  function handleToggleStatus(record: ReportPrintTemplate, checked: boolean) {
    const doToggle = async () => {
      setTogglingIds((p) => new Set(p).add(record.id));
      try {
        await request.put(`/api/report/print/${record.id}`, { status: checked ? 'enabled' : 'disabled' });
        Toast.success(checked ? '已启用' : '已停用');
        void fetchList();
      } finally {
        setTogglingIds((p) => { const s = new Set(p); s.delete(record.id); return s; });
      }
    };
    if (checked) void doToggle();
    else Modal.confirm({ title: '确认停用', content: `停用后「${record.name}」将不可用于打印报表，确认停用？`, onOk: () => void doToggle() });
  }

  async function openPreview(record: ReportPrintTemplate) {
    setPreviewVisible(true);
    setPreviewResult(null);
    const params = defaultParamValues(record);
    setPreviewParams(params);
    setPreviewLoading(true);
    try {
      const res = await request.post<ReportPrintRenderResult>(`/api/report/print/${record.id}/render`, { params, limit: 100 }, { silent: true });
      if (res.code === 0) setPreviewResult(res.data);
      else Toast.error(res.message || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }

  const columns: ColumnProps<ReportPrintTemplate>[] = [
    { title: '名称', dataIndex: 'name', width: 200 },
    { title: '数据集', dataIndex: 'datasetName', width: 160, render: (v: string | null) => v || '-' },
    { title: '备注', dataIndex: 'remark', width: 200, render: renderEllipsis },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (t: string) => formatDateTime(t) },
    {
      title: '状态', dataIndex: 'status', width: 80, fixed: 'right',
      render: (_: unknown, record: ReportPrintTemplate) => (
        <Switch
          checked={record.status === 'enabled'}
          loading={togglingIds.has(record.id)}
          disabled={!hasPermission('report:print:update')}
          onChange={(checked) => handleToggleStatus(record, checked)}
          size="small"
        />
      ),
    },
    ...(hasPermission('report:print:list') ? [{
      title: '导出',
      dataIndex: 'id',
      width: 96,
      fixed: 'right' as const,
      render: (_: unknown, record: ReportPrintTemplate) => (
        <ExportButton entity="report.print" query={{ templateId: record.id }} formats={['xlsx']} variant="flat" />
      ),
    }] : []),
    createOperationColumn<ReportPrintTemplate>({
      width: 220,
      desktopInlineKeys: ['design', 'preview', 'edit', 'delete'],
      actions: (record) => [
        ...(hasPermission('report:print:update') ? [{ key: 'design', label: '设计', onClick: () => navigate(`/report/print/${record.id}/design`) }] : []),
        ...(hasPermission('report:print:list') ? [{ key: 'preview', label: '预览', onClick: () => void openPreview(record) }] : []),
        ...(hasPermission('report:print:update') ? [{ key: 'edit', label: '编辑', onClick: () => openEdit(record) }] : []),
        ...(hasPermission('report:print:delete') ? [{
          key: 'delete', label: '删除', danger: true,
          onClick: () => { Modal.confirm({ title: '确定要删除吗？', content: '删除后不可恢复', onOk: () => handleDelete(record.id) }); },
        }] : []),
      ],
    }),
  ];

  const renderKeyword = () => (
    <Input prefix={<Search size={14} />} placeholder="搜索名称/备注..." value={searchParams.keyword}
      onChange={(v) => setSearchParams((p) => ({ ...p, keyword: v }))} showClear style={{ width: 220 }} onEnterPress={handleSearch} />
  );
  const renderStatusFilter = () => (
    <Select placeholder="全部状态" value={searchParams.status || undefined} onChange={(v) => setSearchParams((p) => ({ ...p, status: (v as string) ?? '' }))}
      showClear style={{ width: 120 }} optionList={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} />
  );
  const renderSearchBtn = () => <Button type="primary" icon={<Search size={14} />} onClick={handleSearch}>查询</Button>;
  const renderResetBtn = () => <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={handleReset}>重置</Button>;
  const renderCreateBtn = () => hasPermission('report:print:create')
    ? <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>新增</Button> : null;

  return (
    <div className="page-container">
      <SearchToolbar
        primary={<>{renderKeyword()}{renderStatusFilter()}{renderSearchBtn()}{renderResetBtn()}</>}
        actions={renderCreateBtn()}
        mobilePrimary={<>{renderKeyword()}{renderSearchBtn()}{renderCreateBtn()}</>}
        mobileFilters={renderStatusFilter()}
        filterTitle="打印模板筛选"
        onFilterApply={handleSearch}
        onFilterReset={handleReset}
      />

      <ConfigurableTable
        bordered columns={columns} dataSource={data?.list ?? []} loading={loading} rowKey="id" size="small" empty="暂无数据"
        onRefresh={() => void fetchList()} refreshLoading={loading} pagination={buildPagination(data?.total ?? 0, fetchList)}
      />

      <AppModal
        title={editing ? '编辑打印模板' : '新增打印模板'}
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={closeModal}
        okButtonProps={{ loading: submitting }}
        width={560}
      >
        <Form key={editing?.id ?? 'new'} getFormApi={(api) => { formApi.current = api; }} initValues={formInitValues} labelPosition="left" labelWidth={72}>
          <Form.Input field="name" label="名称" rules={[{ required: true, message: '请输入名称' }]} maxLength={64} showClear placeholder="如：销售出库单" />
          <Form.Select
            field="datasetId"
            label="数据集"
            placeholder="可先不绑定，设计时再选择"
            optionList={datasets.map((d) => ({ value: d.id, label: d.name }))}
            style={{ width: '100%' }}
            showClear
          />
          <Form.Select field="status" label="状态" style={{ width: '100%' }}
            optionList={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} />
          <Form.TextArea field="remark" label="备注" maxLength={256} autosize={{ minRows: 1, maxRows: 3 }} />
        </Form>
      </AppModal>

      <AppModal
        title="打印预览"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="92vw"
        style={{ maxWidth: 1180 }}
      >
        {previewLoading && <div style={{ padding: 32, textAlign: 'center' }}>正在生成预览...</div>}
        {!previewLoading && previewResult && <PrintReportView result={previewResult} params={previewParams} />}
        {!previewLoading && !previewResult && <div style={{ padding: 32, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无预览内容</div>}
      </AppModal>
    </div>
  );
}
