import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, Wallet, Ticket, User } from 'lucide-react';

const TABS = [
  { key: '/home', label: '首页', icon: House },
  { key: '/wallet', label: '钱包', icon: Wallet },
  { key: '/coupons', label: '卡券', icon: Ticket },
  { key: '/profile', label: '我的', icon: User },
] as const;

/**
 * 会员前台外层布局：移动优先容器 + 底部 TabBar（仅主 tab 页显示）。
 */
export default function MemberLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const showTabbar = TABS.some((t) => t.key === location.pathname);

  return (
    <div className="member-app">
      <Outlet />
      {showTabbar && (
        <nav className="member-tabbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = location.pathname === t.key;
            return (
              <button
                type="button"
                key={t.key}
                className={`member-tab-item${active ? ' active' : ''}`}
                onClick={() => navigate(t.key)}
              >
                <Icon size={22} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
