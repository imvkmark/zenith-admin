import { useEffect, useState } from 'react';
import type { MemberPointAccount } from '@zenith/shared';
import { POINT_TX_TYPE_LABELS } from '@zenith/shared';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';
import { TransactionList } from '../../components/TransactionList';

export default function PointsPage() {
  const [account, setAccount] = useState<MemberPointAccount | null>(null);

  useEffect(() => {
    memberRequest.get<MemberPointAccount>('/api/member/points/account', { silent: true }).then((r) => {
      if (r.code === 0) setAccount(r.data);
    });
  }, []);

  return (
    <MemberPage title="我的积分" showBack noTabbar>
      <div className="m-asset-card">
        <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.85 }}>当前积分</div>
        <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, lineHeight: 1.3 }}>
          {account?.balance ?? '—'}
        </div>
        <div className="m-asset-row" style={{ marginTop: 8 }}>
          <div className="m-asset-item">
            <div className="m-asset-value" style={{ fontSize: 18 }}>{account?.totalEarned ?? '—'}</div>
            <div className="m-asset-label">累计获得</div>
          </div>
          <div className="m-asset-item">
            <div className="m-asset-value" style={{ fontSize: 18 }}>{account?.totalSpent ?? '—'}</div>
            <div className="m-asset-label">累计消耗</div>
          </div>
        </div>
      </div>

      <div className="m-card-title" style={{ padding: '0 4px' }}>积分明细</div>
      <TransactionList
        fetchUrl="/api/member/points/transactions"
        typeLabels={POINT_TX_TYPE_LABELS}
        formatAmount={(n) => String(n)}
      />
    </MemberPage>
  );
}
