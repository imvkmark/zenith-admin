import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@douyinfe/semi-ui';
import { Coins, Wallet, Ticket, Crown } from 'lucide-react';
import type { MemberPointAccount, MemberWallet, MemberCoupon, PaginatedResponse } from '@zenith/shared';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';
import { formatYuan } from '../../utils/format';

export default function HomePage() {
  const navigate = useNavigate();
  const { member } = useMemberAuth();
  const [points, setPoints] = useState<number | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);

  useEffect(() => {
    memberRequest.get<MemberPointAccount>('/api/member/points/account', { silent: true }).then((r) => {
      if (r.code === 0) setPoints(r.data.balance);
    });
    memberRequest.get<MemberWallet>('/api/member/wallet', { silent: true }).then((r) => {
      if (r.code === 0) setWallet(r.data.balance);
    });
    memberRequest
      .get<PaginatedResponse<MemberCoupon>>('/api/member/coupons?status=unused&page=1&pageSize=1', { silent: true })
      .then((r) => {
        if (r.code === 0) setCouponCount(r.data.total);
      });
  }, []);

  return (
    <MemberPage title="会员概览">
      {/* 欢迎横幅 */}
      <div className="mc-welcome-banner">
        <Avatar size="large" src={member?.avatar ?? undefined} style={{ background: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {member?.nickname?.[0] ?? 'U'}
        </Avatar>
        <div className="mc-welcome-text">
          <h3>欢迎回来，{member?.nickname ?? '会员'}！</h3>
          <p>
            {member?.levelName ? (
              <>
                <Crown size={12} style={{ display: 'inline', marginRight: 4 }} />
                {member.levelName}
                {member.growthValue !== undefined ? `  · 成长值 ${member.growthValue}` : ''}
              </>
            ) : '普通会员'}
          </p>
        </div>
      </div>

      {/* 资产统计 */}
      <div className="mc-stat-row">
        <button type="button" className="mc-stat-card" onClick={() => navigate('/points')}>
          <div className="mc-stat-label">
            <Coins size={14} color="var(--m-primary)" />
            我的积分
          </div>
          <div className="mc-stat-value">{points ?? '—'}</div>
        </button>
        <button type="button" className="mc-stat-card" onClick={() => navigate('/wallet')}>
          <div className="mc-stat-label">
            <Wallet size={14} color="var(--m-primary)" />
            账户余额
          </div>
          <div className="mc-stat-value">{wallet === null ? '—' : formatYuan(wallet)}</div>
        </button>
        <button type="button" className="mc-stat-card" onClick={() => navigate('/coupons')}>
          <div className="mc-stat-label">
            <Ticket size={14} color="var(--m-primary)" />
            可用卡券
          </div>
          <div className="mc-stat-value">{couponCount ?? '—'}</div>
        </button>
      </div>
    </MemberPage>
  );
}
