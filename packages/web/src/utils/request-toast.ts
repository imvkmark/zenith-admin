import { Toast } from '@douyinfe/semi-ui';

type RequestToastType = 'error' | 'warning';

const REQUEST_TOAST_DURATION = 4;
const DUPLICATE_WINDOW_MS = 2_000;

let activeToastId: string | null = null;
let lastToastKey = '';
let lastToastAt = 0;

function showRequestToast(type: RequestToastType, content: string): void {
  const now = Date.now();
  const key = `${type}:${content}`;

  if (activeToastId && key === lastToastKey && now - lastToastAt < DUPLICATE_WINDOW_MS) {
    return;
  }

  if (activeToastId) {
    Toast.close(activeToastId);
    activeToastId = null;
  }

  lastToastKey = key;
  lastToastAt = now;

  let toastId = '';
  const options = {
    content,
    duration: REQUEST_TOAST_DURATION,
    onClose: () => {
      if (activeToastId === toastId) {
        activeToastId = null;
      }
    },
  };

  toastId = type === 'error' ? Toast.error(options) : Toast.warning(options);
  activeToastId = toastId;
}

export function showRequestErrorToast(content: string): void {
  showRequestToast('error', content);
}

export function showRequestWarningToast(content: string): void {
  showRequestToast('warning', content);
}
