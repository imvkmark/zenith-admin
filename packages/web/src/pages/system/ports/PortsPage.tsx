import { useState, useCallback, useEffect } from 'react';
import { Button, Input, Tag, Select, Space, Popconfirm, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Search, RotateCcw } from 'lucide-react';
import { request } from '@/utils/request';
import { SearchToolbar } from '@/components/SearchToolbar';
import ConfigurableTable from '@/components/ConfigurableTable';
import { usePermission } from '@/hooks/usePermission';

interface PortEntry {
  protocol: string;
  localAddress: string;
  localPort: number;
  state: string;
  pid: number | null;
  processName: string | null;
  serviceName: string | null;
}

function localDisplay(entry: PortEntry): string {
  const addr = entry.localAddress === '0.0.0.0' || entry.localAddress === '::' || entry.localAddress === '*' ? '*' : entry.localAddress;
  return `${addr}:${entry.localPort}`;
}

const REFRESH_OPTIONS = [
  { label: '手动刷新', value: 0 },
  { label: '5 秒', value: 5000 },
  { label: '10 秒', value: 10000 },
  { label: '30 秒', value: 30000 },
];

export default function PortsPage() {
  const { hasPermission } = usePermission();
  const canKill = hasPermission('system:process:kill');
  const [all, setAll] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [protocol, setProtocol] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await request.get<PortEntry[]>('/api/ports', { silent: true });
    setLoading(false);
    if (res.code === 0 && res.data) setAll(res.data);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = globalThis.setInterval(() => void fetchData(), refreshInterval);
    return () => globalThis.clearInterval(timer);
  }, [refreshInterval, fetchData]);

  const handleReset = () => { setKeyword(''); setProtocol(''); void fetchData(); };

  async function handleKill(pid: number) {
    setKillingPid(pid);
    try {
      const res = await request.delete(`/api/ports/${pid}`);
      if (res.code === 0) {
        Toast.success('进程已结束');
        void fetchData();
      }
    } finally {
      setKillingPid(null);
    }
  }

  const kw = keyword.trim().toLowerCase();
  const data = all.filter((p) => {
    if (protocol && p.protocol !== protocol) return false;
    if (!kw) return true;
    return String(p.localPort).includes(kw)
      || (p.processName ?? '').toLowerCase().includes(kw)
      || (p.serviceName ?? '').toLowerCase().includes(kw)
      || p.localAddress.toLowerCase().includes(kw)
      || p.protocol.includes(kw);
  });

  const columns: ColumnProps<PortEntry>[] = [
    { title: '协议', dataIndex: 'protocol', width: 80, render: (v: string) => <Tag color="blue" size="small">{v.toUpperCase()}</Tag> },
    { title: '本地地址', width: 190, render: (_: unknown, r: PortEntry) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{localDisplay(r)}</span> },
    { title: '端口', dataIndex: 'localPort', width: 90, sorter: (a, b) => (a?.localPort ?? 0) - (b?.localPort ?? 0), render: (v: number) => <strong>{v}</strong> },
    { title: '服务', dataIndex: 'serviceName', width: 120, render: (v: string | null) => v ? <Tag color="cyan" size="small" type="light">{v}</Tag> : <span style={{ color: 'var(--semi-color-text-2)' }}>—</span> },
    { title: '状态', dataIndex: 'state', width: 100, render: (v: string) => <Tag color={v === 'LISTEN' ? 'green' : 'orange'} size="small">{v}</Tag> },
    { title: 'PID', dataIndex: 'pid', width: 80, render: (v: number | null) => v ?? '—' },
    { title: '进程名', dataIndex: 'processName', render: (v: string | null) => v ?? '—' },
    {
      title: '操作', fixed: 'right', width: 90,
      render: (_: unknown, r: PortEntry) => (
        canKill && r.pid ? (
          <Popconfirm title="结束该进程？" content={`将向 PID ${r.pid}（${r.processName ?? '未知'}）发送终止信号`} onConfirm={() => handleKill(r.pid as number)}>
            <Button theme="borderless" type="danger" size="small" loading={killingPid === r.pid}>结束进程</Button>
          </Popconfirm>
        ) : <span style={{ color: 'var(--semi-color-text-2)' }}>—</span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <SearchToolbar>
        <Input
          prefix={<Search size={14} />}
          placeholder="搜索端口/进程/服务/地址"
          value={keyword}
          onChange={setKeyword}
          showClear
          style={{ width: 240 }}
        />
        <Select placeholder="全部协议" value={protocol || undefined} onChange={(v) => setProtocol((v as string) ?? '')} showClear style={{ width: 120 }}
          optionList={[{ label: 'TCP', value: 'tcp' }, { label: 'UDP', value: 'udp' }]} />
        <Select prefix="自动刷新" value={refreshInterval} onChange={(v) => setRefreshInterval(v as number)} style={{ width: 150 }} optionList={REFRESH_OPTIONS} />
        <Button type="tertiary" icon={<RotateCcw size={14} />} onClick={handleReset}>重置</Button>
        <Space style={{ color: 'var(--semi-color-text-2)', fontSize: 12 }}>共 {data.length} 个监听端口</Space>
      </SearchToolbar>

      <ConfigurableTable
        bordered
        rowKey={(r) => `${r?.protocol}-${r?.localAddress}-${r?.localPort}`}
        dataSource={data}
        columns={columns}
        loading={loading}
        onRefresh={() => void fetchData()}
        refreshLoading={loading}
        empty="暂无监听端口数据"
        pagination={{ pageSize: 50, showSizeChanger: true }}
      />
    </div>
  );
}
