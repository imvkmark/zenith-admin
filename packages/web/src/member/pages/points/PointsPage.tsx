import { useEffect, useState } from 'react';
import type { MemberPointAccount } from '@zenith/shared';
import { POINT_TX_TYPE_LABELS } from '@zenith/shared';
import { Coins } from 'lucide-react';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';
import { TransactionList } from '../../components/TransactionList';

function StatCard({ label, value, accent }: Readonly<{ label: React.ReactNode; value: React.ReactNode; accent?: boolean }>) {
  return (
    <div style={{
      flex: 1,
      background: '#fff',
      borderRadius: 10,
      border: '1px solid var(--m-border)',
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? 'var(--m-primary)' : 'var(--m-text)' }}>
        {value}
      </div>
    </div>
  );
}

export default function PointsPage() {
  const [account, setAccount] = useState<MemberPointAccount | null>(null);

  useEffect(() => {
    memberRequest.get<MemberPointAccount>('/api/member/points/account', { silent: true }).then((r) => {
      if (r.code === 0) setAccount(r.data);
    });
  }, []);

  return (
    <MemberPage title="我的积分" showBack noTabbar>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <StatCard
          label={<><Coins size={13} color="var(--m-primary)" />当前积分</>}
          value={account?.balance ?? '—'}
          accent
        />
        <StatCard label="累计获得" value={account?.totalEarned ?? '—'} />
        <StatCard label="累计消耗" value={account?.totalSpent ?? '—'} />
      </div>

      <div className="mc-card-title">积分明细</div>
      <TransactionList
        fetchUrl="/api/member/points/transactions"
        typeLabels={POINT_TX_TYPE_LABELS}
        formatAmount={(n) => String(n)}
      />
    </MemberPage>
  );
}
