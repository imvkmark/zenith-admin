import { useEffect, useState, useCallback } from 'react';
import { Table, Typography } from '@douyinfe/semi-ui';
import type { PaginatedResponse } from '@zenith/shared';
import { memberRequest } from '../utils/member-request';
import { formatDateTime } from '@/utils/date';

interface TxRecord {
  id: number;
  type: string;
  amount: number;
  remark?: string | null;
  bizType?: string | null;
  createdAt: string;
}

interface TransactionListProps {
  fetchUrl: string;
  typeLabels: Record<string, string>;
  formatAmount: (absAmount: number) => string;
}

const PAGE_SIZE = 15;

export function TransactionList({ fetchUrl, typeLabels, formatAmount }: TransactionListProps) {
  const [list, setList] = useState<TxRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const sep = fetchUrl.includes('?') ? '&' : '?';
      const res = await memberRequest.get<PaginatedResponse<TxRecord>>(
        `${fetchUrl}${sep}page=${p}&pageSize=${PAGE_SIZE}`,
        { silent: true },
      );
      setLoading(false);
      if (res.code === 0) {
        setList(res.data.list);
        setTotal(res.data.total);
        setPage(p);
      }
    },
    [fetchUrl],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => typeLabels[type] ?? type,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (remark: string | null) => remark ?? '—',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (amount: number) => {
        const positive = amount >= 0;
        return (
          <Typography.Text style={{ color: positive ? 'var(--m-primary)' : 'var(--m-text)', fontWeight: 600 }}>
            {positive ? '+' : '-'}
            {formatAmount(Math.abs(amount))}
          </Typography.Text>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (v: string) => formatDateTime(v),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={list}
      loading={loading}
      rowKey="id"
      size="small"
      pagination={{
        total,
        pageSize: PAGE_SIZE,
        currentPage: page,
        showSizeChanger: false,
        onPageChange: (p: number) => load(p),
      }}
      empty={<div className="m-empty">暂无记录</div>}
    />
  );
}
