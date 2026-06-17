import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface MemberPageProps {
  title: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
  /** 无底部 tabbar 的二级页面，内容区底部 padding 减小 */
  noTabbar?: boolean;
}

/**
 * 会员前台通用页面容器：固定顶部栏（含可选返回） + 滚动内容区。
 */
export function MemberPage({ title, showBack, rightSlot, children, noTabbar }: Readonly<MemberPageProps>) {
  const navigate = useNavigate();
  return (
    <>
      <header className="member-header">
        {showBack && (
          <button type="button" className="m-header-left" aria-label="返回" onClick={() => navigate(-1)}>
            <ChevronLeft size={22} />
          </button>
        )}
        <span>{title}</span>
        {rightSlot ? <div className="m-header-right">{rightSlot}</div> : null}
      </header>
      <main className={`member-content${noTabbar ? ' no-tabbar' : ''}`}>{children}</main>
    </>
  );
}
