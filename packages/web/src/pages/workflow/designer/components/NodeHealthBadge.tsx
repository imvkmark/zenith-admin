/**
 * NodeHealthBadge — 设计态画布上的节点体检角标。
 * 有 critical → 红点；仅 warning → 橙点；仅 info → 蓝点。hover 展示问题清单 + 修复建议。
 */
import { Popover, Tag, Typography } from '@douyinfe/semi-ui';
import { AlertTriangle, Info } from 'lucide-react';
import type { NodeHealthInfo } from '../types';

const SEVERITY_META: Record<string, { text: string; color: 'red' | 'orange' | 'blue' }> = {
  critical: { text: '严重', color: 'red' },
  warning: { text: '警告', color: 'orange' },
  info: { text: '提示', color: 'blue' },
};

export default function NodeHealthBadge({ health }: Readonly<{ health?: NodeHealthInfo }>) {
  if (!health || (health.error === 0 && health.warn === 0 && health.info === 0)) return null;
  const tone = health.error > 0 ? 'error' : health.warn > 0 ? 'warn' : 'info';
  const color = tone === 'error' ? 'var(--semi-color-danger)' : tone === 'warn' ? 'var(--semi-color-warning)' : 'var(--semi-color-info)';
  const count = health.error + health.warn + health.info;

  const content = (
    <div style={{ maxWidth: 280, padding: '4px 2px' }}>
      {health.issues.map((iss, idx) => {
        const sm = SEVERITY_META[iss.severity] ?? SEVERITY_META.info;
        return (
          <div key={idx} style={{ padding: '4px 0', borderBottom: idx < health.issues.length - 1 ? '1px dashed var(--semi-color-border)' : undefined }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Tag size="small" color={sm.color}>{sm.text}</Tag>
              <div style={{ flex: 1 }}>
                <Typography.Text size="small">{iss.message}</Typography.Text>
                {iss.suggestion && (
                  <Typography.Paragraph size="small" type="tertiary" style={{ margin: '2px 0 0' }}>建议：{iss.suggestion}</Typography.Paragraph>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Popover content={content} position="top" showArrow trigger="hover">
      <span
        role="none"
        className="fd-node-health-badge"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color, cursor: 'help' }}
        onClick={(e) => e.stopPropagation()}
      >
        {tone === 'info' ? <Info size={13} /> : <AlertTriangle size={13} />}
        <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{count}</span>
      </span>
    </Popover>
  );
}
