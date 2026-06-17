import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Modal } from '@douyinfe/semi-ui';
import { Crown, House, Coins, Wallet, Ticket, UserCog, Lock, LogOut } from 'lucide-react';
import { useMemberAuth } from '../hooks/useMemberAuth';

const NAV_ITEMS = [
  { key: '/home', label: '会员概览', icon: House },
  { key: '/points', label: '我的积分', icon: Coins },
  { key: '/wallet', label: '我的钱包', icon: Wallet },
  { key: '/coupons', label: '我的卡券', icon: Ticket },
  { key: '/level', label: '等级权益', icon: Crown },
  { key: '/profile/edit', label: '编辑资料', icon: UserCog },
  { key: '/profile/password', label: '修改密码', icon: Lock },
] as const;

export default function MemberLayout() {
  const { member, logout } = useMemberAuth();
  const navigate = useNavigate();

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
    <div className="mc-app">
      <aside className="mc-sidebar">
        <div className="mc-brand">
          <Crown size={18} color="var(--m-primary)" />
          <span>会员中心</span>
        </div>

        <div className="mc-member-info">
          <Avatar size="default" src={member?.avatar ?? undefined} style={{ background: 'var(--m-primary)', flexShrink: 0 }}>
            {member?.nickname?.[0] ?? 'U'}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <div className="mc-member-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member?.nickname ?? '会员'}
            </div>
            {member?.levelName && (
              <div className="mc-member-level">
                <Crown size={11} />
                {member.levelName}
              </div>
            )}
          </div>
        </div>

        <nav className="mc-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.key}
                className={({ isActive }) => `mc-nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mc-sidebar-footer">
          <button type="button" className="mc-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      </aside>

      <main className="mc-main">
        <Outlet />
      </main>
    </div>
  );
}
