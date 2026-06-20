import type { WorkflowSerialNoConfig } from '@zenith/shared';

export interface AdvancedSettingsData {
  allowWithdraw: boolean;
  allowResubmit: boolean;
  notifyInitiator: boolean;
  autoApproveIfSameUser: boolean;
  timeoutAction: 'none' | 'auto-approve' | 'auto-reject' | 'notify';
  allowComment?: boolean;
  serialNo?: WorkflowSerialNoConfig;
}

export const DEFAULT_SERIAL_NO: Required<WorkflowSerialNoConfig> = {
  enabled: false,
  prefix: '',
  dateFormat: 'none',
  seqLength: 4,
  resetPeriod: 'never',
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettingsData = {
  allowWithdraw: true,
  allowResubmit: false,
  notifyInitiator: true,
  autoApproveIfSameUser: false,
  timeoutAction: 'none',
  allowComment: true,
  serialNo: { ...DEFAULT_SERIAL_NO },
};
