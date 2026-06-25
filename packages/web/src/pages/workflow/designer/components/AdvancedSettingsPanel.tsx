/**
 * 更多设置面板 — 步骤 ④ 更多设置
 */
import dayjs from 'dayjs';
import { Divider, Form, Radio, Typography } from '@douyinfe/semi-ui';
import type { WorkflowSerialNoConfig, WorkflowNotifyChannels } from '@zenith/shared';
import { WORKFLOW_APPROVER_DEDUP_OPTIONS, resolveApproverDedupMode } from '@zenith/shared';
import type { AdvancedSettingsData } from './advanced-settings';
import { DEFAULT_SERIAL_NO } from './advanced-settings';

export type { AdvancedSettingsData } from './advanced-settings';

interface AdvancedSettingsProps {
  settings: AdvancedSettingsData;
  onChange: (settings: AdvancedSettingsData) => void;
  readOnly?: boolean;
}

export default function AdvancedSettingsPanel({ settings, onChange, readOnly = false }: Readonly<AdvancedSettingsProps>) {
  const serialNo: Required<WorkflowSerialNoConfig> = { ...DEFAULT_SERIAL_NO, ...settings.serialNo };
  const notify: WorkflowNotifyChannels = settings.notifyChannels ?? {};

  const datePart = serialNo.dateFormat !== 'none' ? dayjs().format(serialNo.dateFormat) : '';
  const seqPart = '1'.padStart(serialNo.seqLength, '0');
  const preview = `${serialNo.prefix}${datePart}${seqPart}`;

  return (
    <div className="fd-basic-info">
      <div className="fd-basic-info__inner">
        <Form
          initValues={{
            ...settings,
            serialNo: { ...DEFAULT_SERIAL_NO, ...settings.serialNo },
            notifyChannels: settings.notifyChannels ?? {},
            approverDedupMode: resolveApproverDedupMode(settings),
          } as unknown as Record<string, unknown>}
          labelPosition="left"
          labelWidth={180}
          disabled={readOnly}
          onValueChange={(values: Record<string, unknown>) => {
            onChange({ ...settings, ...values });
          }}
        >
          <Form.Switch field="allowWithdraw" label="允许撤回" />
          <Form.Switch field="allowResubmit" label="允许驳回后重新提交" />
          <Form.Switch field="notifyInitiator" label="流程结束后通知发起人" />
          <Form.RadioGroup
            field="approverDedupMode"
            label="自动去重"
            direction="vertical"
            extraText="同一审批人在流程中重复出现时的处理方式"
          >
            {WORKFLOW_APPROVER_DEDUP_OPTIONS.map((o) => (
              <Radio key={o.value} value={o.value}>{o.label}</Radio>
            ))}
          </Form.RadioGroup>
          <Form.Switch field="allowComment" label="允许流程中评论" />

          {/* 业务编号 / 流水号 */}
          <Form.Slot>
            <Divider margin="8px 0" />
          </Form.Slot>
          <Form.Switch field="serialNo.enabled" label="启用业务编号" />

          <div style={{ display: serialNo.enabled ? undefined : 'none' }}>
            <Form.Input field="serialNo.prefix" label="前缀" placeholder="BX-" style={{ width: '100%' }} />
            <Form.Select
              field="serialNo.dateFormat"
              label="日期格式"
              style={{ width: '100%' }}
              optionList={[
                { value: 'none', label: '无' },
                { value: 'YYYYMMDD', label: '年月日（YYYYMMDD）' },
                { value: 'YYYYMM', label: '年月（YYYYMM）' },
                { value: 'YYYY', label: '年（YYYY）' },
              ]}
            />
            <Form.InputNumber field="serialNo.seqLength" label="序号位数" min={1} max={12} style={{ width: '100%' }} />
            <Form.Select
              field="serialNo.resetPeriod"
              label="重置周期"
              style={{ width: '100%' }}
              optionList={[
                { value: 'never', label: '不重置' },
                { value: 'daily', label: '每天' },
                { value: 'monthly', label: '每月' },
                { value: 'yearly', label: '每年' },
              ]}
            />
            <Form.Slot label="编号预览">
              <Typography.Text
                type="tertiary"
                style={{ lineHeight: '32px', fontFamily: 'monospace' }}
              >
                {preview || '（请设置前缀或日期格式）'}
              </Typography.Text>
            </Form.Slot>
          </div>

          {/* 多渠道通知 */}
          <Form.Slot>
            <Divider margin="8px 0" />
          </Form.Slot>
          <Form.Switch field="notifyChannels.email" label="邮件通知" />
          <Form.Switch field="notifyChannels.sms" label="短信通知" />
          <div style={{ display: notify.sms ? undefined : 'none' }}>
            <Form.InputNumber field="notifyChannels.smsTemplateId" label="短信模板 ID" min={1} style={{ width: '100%' }} placeholder="短信模板库中的模板 ID" />
          </div>
          <Form.Slot>
            <Typography.Text type="tertiary" size="small">
              站内信始终发送；开启后额外向处理人/发起人发送邮件 / 短信（需先在系统中配置邮件服务 / 短信服务商）。
            </Typography.Text>
          </Form.Slot>
        </Form>
      </div>
    </div>
  );
}
