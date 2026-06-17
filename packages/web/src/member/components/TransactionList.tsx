import { useEffect, useState, useCallback } from 'react';
import { Button, Spin } from '@douyinfe/semi-ui';
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
  /** 流水分页接口地址（不含分页参数） */
  fetchUrl: string;
  /** 类型枚举 → 中文标签 */
  typeLabels: Record<string, string>;
  /** 金额格式化（接收绝对值，正负号由组件统一渲染） */
  formatAmount: (absAmount: number) => string;
}

const PAGE_SIZE = 15;

/**
 * 会员前台通用流水列表：积分明细 / 钱包明细共用。
 * 分页“加载更多”模式，正数绿色（+），负数灰色（-）。
 */
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
        setList((prev) => (p === 1 ? res.data.list : [...prev, ...res.data.list]));
        setTotal(res.data.total);
        setPage(p);
      }
    },
    [fetchUrl],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading && list.length === 0) {
    return (
      <div className="m-loading-wrap">
        <Spin />
      </div>
    );
  }
  if (list.length === 0) {
    return <div className="m-empty">暂无记录</div>;
  }

  const hasMore = list.length < total;

  return (
    <div className="m-card">
      {list.map((t) => {
        const positive = t.amount >= 0;
        return (
          <div key={t.id} className="m-list-item">
            <div className="m-list-main">
              <div className="m-list-title">
                {typeLabels[t.type] ?? t.type}
                {t.remark ? ` · ${t.remark}` : ''}
              </div>
              <div className="m-list-sub">{formatDateTime(t.createdAt)}</div>
            </div>
            <div className={`m-list-amount ${positive ? 'plus' : 'minus'}`}>
              {positive ? '+' : '-'}
              {formatAmount(Math.abs(t.amount))}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <div style={{ textAlign: 'center', paddingTop: 12 }}>
          <Button theme="borderless" loading={loading} onClick={() => load(page + 1)}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
