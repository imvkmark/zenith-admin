import { useEffect, useState } from 'react';
import { Spin, Tag } from '@douyinfe/semi-ui';
import { Crown, Check } from 'lucide-react';
import type { MemberLevel } from '@zenith/shared';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';

function discountText(discount: number): string {
  if (discount >= 100) return '无折扣';
  return `${discount / 10} 折`;
}

export default function LevelPage() {
  const { member } = useMemberAuth();
  const [levels, setLevels] = useState<MemberLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberRequest.get<MemberLevel[]>('/api/member/levels', { silent: true }).then((r) => {
      setLoading(false);
      if (r.code === 0) setLevels(r.data);
    });
  }, []);

  return (
    <MemberPage title="等级权益" showBack noTabbar>
      <div className="m-asset-card">
        <div className="m-profile-head">
          <Crown size={32} color="#ffd75e" />
          <div className="m-profile-meta">
            <div className="m-profile-name" style={{ color: '#fff' }}>
              {member?.levelName ?? '普通会员'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>当前成长值 {member?.growthValue ?? 0}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="m-loading-wrap"><Spin /></div>
      ) : (
        levels.map((lv) => {
          const current = member?.levelId === lv.id;
          return (
            <div key={lv.id} className="m-card" style={current ? { border: '1px solid var(--m-primary)' } : undefined}>
              <div className="m-card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {lv.name}
                  {current && <Tag color="green" size="small">当前等级</Tag>}
                </span>
                <span style={{ fontSize: 13, color: 'var(--m-text-secondary)' }}>
                  成长值 ≥ {lv.growthThreshold}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', marginBottom: 8 }}>
                消费折扣：{discountText(lv.discount)}
              </div>
              {lv.benefits.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lv.benefits.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <Check size={14} color="var(--m-primary)" />
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </MemberPage>
  );
}
