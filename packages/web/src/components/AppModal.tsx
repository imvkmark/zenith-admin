import { useState } from 'react';
import { Modal } from '@douyinfe/semi-ui';
import type { ModalReactProps } from '@douyinfe/semi-ui/lib/es/modal';
import { Maximize2, Minimize2, X } from 'lucide-react';
import './AppModal.css';

export interface AppModalProps extends Omit<ModalReactProps, 'header' | 'closable' | 'closeIcon' | 'fullScreen'> {
  /** 是否显示全屏切换按钮，默认 true */
  fullscreenable?: boolean;
}

/**
 * 带全屏切换能力的 Modal 封装。
 * 右上角同时展示「全屏/还原」按钮和「关闭」按钮。
 * 所有 Semi Modal props（width、footer、onOk 等）均透传。
 */
export function AppModal({
  title,
  onCancel,
  fullscreenable = true,
  children,
  ...rest
}: Readonly<AppModalProps>) {
  const [fullscreen, setFullscreen] = useState(false);

  const header = (
    <div className="app-modal-header">
      <span className="app-modal-title">{title}</span>
      <div className="app-modal-actions">
        {fullscreenable && (
          <button
            type="button"
            className="app-modal-icon-btn"
            aria-label={fullscreen ? '还原' : '全屏'}
            onClick={() => setFullscreen((s) => !s)}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
        <button
          type="button"
          className="app-modal-icon-btn"
          aria-label="关闭"
          onClick={(e) => onCancel?.(e)}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      header={header}
      closable={false}
      fullScreen={fullscreen}
      onCancel={onCancel}
      {...rest}
    >
      {children}
    </Modal>
  );
}

export default AppModal;
