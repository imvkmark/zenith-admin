export interface AdvancedSettingsData {
  allowWithdraw: boolean;
  allowResubmit: boolean;
  notifyInitiator: boolean;
  autoApproveIfSameUser: boolean;
  timeoutAction: 'none' | 'auto-approve' | 'auto-reject' | 'notify';
}

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettingsData = {
  allowWithdraw: true,
  allowResubmit: false,
  notifyInitiator: true,
  autoApproveIfSameUser: false,
  timeoutAction: 'none',
};
