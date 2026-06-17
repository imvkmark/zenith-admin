import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@douyinfe/semi-ui';
import { Coins, Wallet, Ticket, Crown, UserCog, Lock } from 'lucide-react';
import type { MemberPointAccount, MemberWallet, MemberCoupon, PaginatedResponse } from '@zenith/shared';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';
import { formatYuan } from '../../utils/format';

const GRID = [
  { key: '/points', label: '我的积分', icon: Coins },
  { key: '/wallet', label: '我的钱包', icon: Wallet },
  { key: '/coupons', label: '我的卡券', icon: Ticket },
  { key: '/level', label: '等级权益', icon: Crown },
  { key: '/profile/edit', label: '编辑资料', icon: UserCog },
  { key: '/profile/password', label: '修改密码', icon: Lock },
] as const;

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
    <MemberPage title="会员中心">
      {/* 用户信息 */}
      <div className="m-card">
        <div className="m-profile-head">
          <Avatar size="medium" src={member?.avatar ?? undefined} style={{ background: 'var(--m-primary)' }}>
            {member?.nickname?.[0] ?? 'U'}
          </Avatar>
          <div className="m-profile-meta">
            <div className="m-profile-name">{member?.nickname ?? '会员'}</div>
            <div className="m-profile-sub">{member?.phone ?? member?.email ?? member?.username ?? '—'}</div>
          </div>
          {member?.levelName ? (
            <span className="m-level-badge">
              <Crown size={12} />
              {member.levelName}
            </span>
          ) : null}
        </div>
      </div>

      {/* 资产卡 */}
      <div className="m-asset-card">
        <div className="m-asset-row">
          <button type="button" className="m-asset-item" onClick={() => navigate('/points')}>
            <div className="m-asset-value">{points ?? '—'}</div>
            <div className="m-asset-label">积分</div>
          </button>
          <button type="button" className="m-asset-item" onClick={() => navigate('/wallet')}>
            <div className="m-asset-value">{wallet === null ? '—' : formatYuan(wallet)}</div>
            <div className="m-asset-label">余额</div>
          </button>
          <button type="button" className="m-asset-item" onClick={() => navigate('/coupons')}>
            <div className="m-asset-value">{couponCount ?? '—'}</div>
            <div className="m-asset-label">卡券</div>
          </button>
        </div>
      </div>

      {/* 功能宫格 */}
      <div className="m-card">
        <div className="m-grid">
          {GRID.map((g) => {
            const Icon = g.icon;
            return (
              <button type="button" key={g.key} className="m-grid-item" onClick={() => navigate(g.key)}>
                <span className="m-grid-icon">
                  <Icon size={20} />
                </span>
                {g.label}
              </button>
            );
          })}
        </div>
      </div>
    </MemberPage>
  );
}
