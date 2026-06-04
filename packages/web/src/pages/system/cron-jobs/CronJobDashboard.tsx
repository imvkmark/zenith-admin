import { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Table, Typography, Tag, Empty, Spin } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { CronExpressionParser } from 'cron-parser';
import type { CronJob } from '@zenith/shared';
import { request } from '@/utils/request';
import dayjs from 'dayjs';

interface CronJobStatsPerJob {
  jobId: number;
  jobName: string;
  totalRuns: number;
  successCount: number;
  failCount: number;
  successRate: number;
}

interface CronJobStats {
  totalJobs: number;
  enabledJobs: number;
  todayRuns: number;
  todaySuccesses: number;
  todayFails: number;
  perJob: CronJobStatsPerJob[];
}

interface UpcomingItem {
  key: string;
  jobId: number;
  jobName: string;
  time: Date;
  timeStr: string;
  dateLabel: string;
}

interface Props {
  jobs: CronJob[];
}

function calcUpcoming(jobs: CronJob[], total = 30): UpcomingItem[] {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const results: UpcomingItem[] = [];
  const enabled = jobs.filter((j) => j.status === 'enabled');
  const perJob = Math.ceil(total / Math.max(enabled.length, 1)) + 3;

  for (const job of enabled) {
    try {
      const interval = CronExpressionParser.parse(job.cronExpression);
      for (let i = 0; i < perJob; i++) {
        const d = interval.next().toDate();
        const dateStr = dayjs(d).format('YYYY-MM-DD');
        let dateLabel: string;
        if (dateStr === today) dateLabel = '今天';
        else if (dateStr === tomorrow) dateLabel = '明天';
        else dateLabel = dayjs(d).format('MM月DD日');
        results.push({ key: `${job.id}-${i}`, jobId: job.id, jobName: job.name, time: d, timeStr: dayjs(d).format('HH:mm:ss'), dateLabel });
      }
    } catch { /* skip invalid expressions */ }
  }

  return results.toSorted((a, b) => a.time.getTime() - b.time.getTime()).slice(0, total);
}

export default function CronJobDashboard({ jobs }: Readonly<Props>) {
  const [stats, setStats] = useState<CronJobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const upcoming = useMemo(() => calcUpcoming(jobs, 30), [jobs]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get<CronJobStats>('/api/cron-jobs/stats');
      if (res.code === 0) setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const successRate =
    stats && stats.todayRuns > 0 ? Math.round((stats.todaySuccesses / stats.todayRuns) * 100) : null;

  let rateColor: string | undefined;
  if (successRate !== null) {
    if (successRate < 80) rateColor = 'var(--semi-color-warning)';
    else if (successRate >= 95) rateColor = 'var(--semi-color-success)';
  }

  const rateValue = successRate === null ? '—' : `${successRate}%`;

  const statItems = [
    { label: '任务总数', value: stats?.totalJobs ?? '—', sub: `启用中 ${stats?.enabledJobs ?? 0}`, color: undefined },
    { label: '今日执行', value: stats?.todayRuns ?? '—', sub: null as string | null, color: undefined },
    { label: '今日成功', value: stats?.todaySuccesses ?? '—', sub: null as string | null, color: 'var(--semi-color-success)' },
    { label: '今日成功率', value: rateValue, sub: null as string | null, color: rateColor },
  ];

  const perJobColumns: ColumnProps<CronJobStatsPerJob>[] = [
    { title: '任务名称', dataIndex: 'jobName' },
    { title: '总执行', dataIndex: 'totalRuns', width: 80, align: 'right' },
    {
      title: '成功', dataIndex: 'successCount', width: 70, align: 'right',
      render: (v: number) => <span style={{ color: 'var(--semi-color-success)' }}>{v}</span>,
    },
    {
      title: '失败', dataIndex: 'failCount', width: 70, align: 'right',
      render: (v: number) => {
        if (v > 0) return <span style={{ color: 'var(--semi-color-danger)' }}>{v}</span>;
        return <span>{v}</span>;
      },
    },
    {
      title: '成功率', dataIndex: 'successRate', width: 90, align: 'right',
      render: (v: number, record: CronJobStatsPerJob) => {
        if (record.totalRuns === 0) return '—';
        let tagColor: 'green' | 'orange' | 'red' = 'red';
        if (v >= 90) tagColor = 'green';
        else if (v >= 70) tagColor = 'orange';
        return <Tag color={tagColor} size="small">{v}%</Tag>;
      },
    },
  ];

  // Group upcoming by dateLabel
  const groupedUpcoming: Array<{ dateLabel: string; items: UpcomingItem[] }> = [];
  for (const item of upcoming) {
    const last = groupedUpcoming.at(-1);
    if (last?.dateLabel === item.dateLabel) {
      last.items.push(item);
    } else {
      groupedUpcoming.push({ dateLabel: item.dateLabel, items: [item] });
    }
  }

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statItems.map((s) => (
          <Col span={6} key={s.label}>
            <Card bodyStyle={{ textAlign: 'center', padding: '16px 12px 12px' }}>
              <Typography.Text type="tertiary" size="small">{s.label}</Typography.Text>
              <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3, marginTop: 6, color: s.color }}>
                {String(s.value)}
              </div>
              <Typography.Text type="tertiary" size="small">{s.sub ?? '\u00A0'}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="任务执行统计">
            <Table
              size="small"
              rowKey="jobId"
              dataSource={stats?.perJob ?? []}
              columns={perJobColumns}
              pagination={false}
              empty={<Empty description="暂无执行记录" />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title={`调度预览（接下来 ${upcoming.length} 次执行）`}>
            {upcoming.length === 0 ? (
              <Empty description="无启用中的任务" />
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {groupedUpcoming.map((group) => (
                  <div key={group.dateLabel} style={{ marginBottom: 8 }}>
                    <div style={{
                      padding: '3px 4px',
                      marginBottom: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--semi-color-text-2)',
                      borderBottom: '1px solid var(--semi-color-border)',
                    }}>
                      {group.dateLabel}
                    </div>
                    {group.items.map((item) => (
                      <div key={item.key} style={{
                        display: 'flex',
                        gap: 12,
                        padding: '5px 4px',
                        alignItems: 'center',
                        borderRadius: 4,
                      }}>
                        <Typography.Text style={{ fontFamily: 'monospace', minWidth: 68, flexShrink: 0, color: 'var(--semi-color-primary)' }}>
                          {item.timeStr}
                        </Typography.Text>
                        <Typography.Text ellipsis={{ showTooltip: true }} style={{ flex: 1 }}>
                          {item.jobName}
                        </Typography.Text>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Spin>
  );
}
