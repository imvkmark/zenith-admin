import { useState, useCallback, useEffect } from 'react';
import { Input, Button, Select, Toast, SplitButtonGroup, Dropdown, Modal } from '@douyinfe/semi-ui';
import { Search, RotateCcw, Trash2, ChevronDown } from 'lucide-react';
import { request } from '@/utils/request';
import { SearchToolbar } from '@/components/SearchToolbar';
import { ConfigurableTable } from '@/components/ConfigurableTable';
import { usePageTracker } from '@/hooks/usePageTracker';
import type { PaginatedResponse } from '@zenith/shared';

interface EventListItem {
  id: number;
  userId: number | null;
  username: string | null;
  eventType: 'page_view' | 'page_leave' | 'feature_use' | 'area_click';
  pagePath: string;
  pageTitle: string | null;
  elementKey: string | null;
  elementLabel: string | null;
  componentArea: string | null;
  durationMs: number | null;
  createdAt: string;
}

const EVENT_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  page_view:    { label: '页面进入', color: 'blue' },
  page_leave:   { label: '页面离开', color: 'teal' },
  feature_use:  { label: '功能点击', color: 'green' },
  area_click:   { label: '区域点击', color: 'orange' },
};

function msToReadable(ms: number | null): string {
  if (ms == null) return '–';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

const CLEAR_OPTIONS: { days: number; label: string }[] = [
  { days: 30,  label: '清除 30 天前的数据' },
  { days: 90,  label: '清除 90 天前的数据' },
  { days: 180, label: '清除 180 天前的数据' },
  { days: 365, label: '清除 1 年前的数据' },
];

interface SearchParams {
  eventType: string;
  username: string;
  pagePath: string;
}

const defaultSearchParams: SearchParams = { eventType: '', username: '', pagePath: '' };

export default function AnalyticsDataPage() {
  usePageTracker('埋点数据管理');

  const [searchParams, setSearchParams] = useState<SearchParams>(defaultSearchParams);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [data, setData] = useState<EventListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const fetchData = useCallback(async (p = page, params = searchParams) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(p),
        pageSize: String(pageSize),
        ...(params.eventType ? { eventType: params.eventType } : {}),
        ...(params.username ? { username: params.username } : {}),
        ...(params.pagePath ? { pagePath: params.pagePath } : {}),
      });
      const res = await request.get<PaginatedResponse<EventListItem>>(`/api/analytics/events?${query}`);
      if (res.code === 0 && res.data) {
        setData(res.data.list);
        setTotal(res.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchParams]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSearch = () => { setPage(1); void fetchData(1); };
  const handleReset = () => { setSearchParams(defaultSearchParams); setPage(1); void fetchData(1, defaultSearchParams); };

  const handleClear = async (days: number) => {
    const isAll = days === 0;
    Modal.confirm({
      title: isAll ? '清除全部埋点数据' : `清除 ${days} 天前的埋点数据`,
      content: isAll
        ? '此操作将删除全部埋点事件数据，不可恢复，请谨慎操作！'
        : `此操作将删除 ${days} 天前的埋点事件数据，不可恢复，请谨慎操作！`,
      okText: '确认清除',
      okButtonProps: { type: 'danger' },
      onOk: async () => {
        setClearLoading(true);
        try {
          const res = await request.delete(`/api/analytics/clean?days=${days}`);
          if (res.code === 0) {
            Toast.success(res.message || '清除成功');
            setPage(1);
            void fetchData(1);
          }
        } finally {
          setClearLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 110,
      render: (v: string) => {
        const { label, color } = EVENT_TYPE_LABEL[v] ?? { label: v, color: 'grey' };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <span style={{ color: `var(--semi-color-${color})`, fontWeight: 500, fontSize: 13 }} data-color={color as any}>{label}</span>;
      },
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (v: string | null) => v ?? <span style={{ color: 'var(--semi-color-text-3)' }}>–</span>,
    },
    {
      title: '页面',
      dataIndex: 'pagePath',
      key: 'pagePath',
      render: (_: unknown, record: EventListItem) => (
        <div>
          <span style={{ fontWeight: 500 }}>{record.pageTitle ?? record.pagePath}</span>
          {record.pageTitle && <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12, marginLeft: 6 }}>{record.pagePath}</span>}
        </div>
      ),
    },
    {
      title: '功能 / 区域',
      dataIndex: 'elementKey',
      key: 'elementKey',
      width: 200,
      render: (_: unknown, record: EventListItem) => {
        const label = record.elementLabel ?? record.elementKey;
        const area = record.componentArea;
        if (!label && !area) return <span style={{ color: 'var(--semi-color-text-3)' }}>–</span>;
        return (
          <span>
            {label && <span style={{ fontWeight: 500 }}>{label}</span>}
            {area && <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12, marginLeft: 4 }}>{area}</span>}
          </span>
        );
      },
    },
    {
      title: '停留时长',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (v: number | null) => msToReadable(v),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => <span style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>{v}</span>,
    },
  ];

  return (
    <div className="page-container">
      <SearchToolbar>
        <Select
          placeholder="事件类型"
          value={searchParams.eventType || undefined}
          onChange={(v) => setSearchParams({ ...searchParams, eventType: v as string ?? '' })}
          style={{ width: 130 }}
          showClear
        >
          {Object.entries(EVENT_TYPE_LABEL).map(([k, { label }]) => (
            <Select.Option key={k} value={k}>{label}</Select.Option>
          ))}
        </Select>
        <Input
          prefix={<Search size={14} />}
          placeholder="用户名"
          value={searchParams.username}
          onChange={(v) => setSearchParams({ ...searchParams, username: v })}
          onEnterPress={handleSearch}
          style={{ width: 140 }}
          showClear
        />
        <Input
          prefix={<Search size={14} />}
          placeholder="页面路径"
          value={searchParams.pagePath}
          onChange={(v) => setSearchParams({ ...searchParams, pagePath: v })}
          onEnterPress={handleSearch}
          style={{ width: 160 }}
          showClear
        />
        <Button type="primary" icon={<Search size={14} />} onClick={handleSearch}>查询</Button>
        <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={handleReset}>重置</Button>
        <SplitButtonGroup>
          <Button
            type="danger"
            theme="light"
            icon={<Trash2 size={14} />}
            loading={clearLoading}
            onClick={() => handleClear(30)}
          >
            清除数据
          </Button>
          <Dropdown
            trigger="click"
            position="bottomRight"
            clickToHide
            render={
              <Dropdown.Menu>
                {CLEAR_OPTIONS.map(({ days, label }) => (
                  <Dropdown.Item key={days} onClick={() => handleClear(days)}>{label}</Dropdown.Item>
                ))}
                <Dropdown.Divider />
                <Dropdown.Item type="danger" onClick={() => handleClear(0)}>清除全部数据</Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button type="danger" theme="light" icon={<ChevronDown size={14} />} loading={clearLoading} />
          </Dropdown>
        </SplitButtonGroup>
      </SearchToolbar>

      <ConfigurableTable
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        bordered
        onRefresh={() => void fetchData()}
        refreshLoading={loading}
        pagination={{
          currentPage: page,
          pageSize,
          total,
          onChange: (p) => { setPage(p); void fetchData(p); },
        }}
      />
    </div>
  );
}
