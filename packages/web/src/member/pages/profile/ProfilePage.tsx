import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Modal } from '@douyinfe/semi-ui';
import { UserCog, Lock, Crown, ChevronRight, LogOut } from 'lucide-react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { MemberPage } from '../../components/MemberPage';

const MENU = [
  { key: '/profile/edit', label: '编辑资料', icon: UserCog },
  { key: '/profile/password', label: '修改密码', icon: Lock },
  { key: '/level', label: '等级权益', icon: Crown },
] as const;

export default function ProfilePage() {
  const navigate = useNavigate();
  const { member, logout } = useMemberAuth();

  const handleLogout = () => {
    Modal.confirm({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        logout();
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <MemberPage title="我的">
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

      <div className="m-card">
        {MENU.map((m) => {
          const Icon = m.icon;
          return (
            <button type="button" key={m.key} className="m-list-item" style={{ width: '100%' }} onClick={() => navigate(m.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={18} color="var(--m-text-secondary)" />
                {m.label}
              </div>
              <ChevronRight size={18} color="var(--m-text-tertiary)" />
            </button>
          );
        })}
      </div>

      <Button
        block
        size="large"
        type="danger"
        theme="light"
        icon={<LogOut size={16} />}
        onClick={handleLogout}
        style={{ marginTop: 8 }}
      >
        退出登录
      </Button>
    </MemberPage>
  );
}
