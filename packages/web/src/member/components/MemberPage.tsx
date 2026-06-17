import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@douyinfe/semi-ui';
import { ChevronLeft } from 'lucide-react';

interface MemberPageProps {
  title: string;
  showBack?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
  /** no longer used in PC layout, kept for API compatibility */
  noTabbar?: boolean;
}

export function MemberPage({ title, showBack, rightSlot, children }: Readonly<MemberPageProps>) {
  const navigate = useNavigate();
  return (
    <div className="mc-page">
      <div className="mc-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {showBack && (
            <Button
              theme="borderless"
              size="small"
              icon={<ChevronLeft size={18} />}
              style={{ marginLeft: -8 }}
              onClick={() => navigate(-1)}
            />
          )}
          <h2 className="mc-page-title">{title}</h2>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
      <div className="mc-page-body">{children}</div>
    </div>
  );
}
