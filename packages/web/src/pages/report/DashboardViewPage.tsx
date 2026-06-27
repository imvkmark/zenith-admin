import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Button, Empty, SideSheet, Space, Spin, TextArea, Toast, Typography } from '@douyinfe/semi-ui';
import { ArrowLeft, RotateCcw, PencilRuler, Maximize, Image, MessageSquare, Send, Trash2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import './report-grid.css';
import './report-screen.css';
import { request } from '@/utils/request';
import { formatDateTime } from '@/utils/date';
import { usePermission } from '@/hooks/usePermission';
import { ScreenCanvas } from './widgets/ScreenCanvas';
import { useWidgetData } from './widgets/useWidgetData';
import { FilterBar } from './widgets/FilterBar';
import type { ReportDashboard, ReportWidget, ReportFilter, ReportGridItem, ReportCanvasItem, ReportDashboardComment } from '@zenith/shared';

function defaultFilterValue(f: ReportFilter): unknown {
  if (f.defaultValue !== undefined) return f.defaultValue;
  return f.type === 'multiSelect' ? [] : undefined;
}

export default function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const dashboardId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermission();

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ReportDashboard | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<ReportDashboardComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const widgets = useMemo(() => dashboard?.widgets ?? [], [dashboard]);
  const filters = dashboard?.filters ?? [];
  const isDark = dashboard?.config?.theme === 'dark';
  const isCanvas = dashboard?.config?.layoutMode === 'canvas';
  const screen = dashboard?.config?.screenConfig;
  const aspect = isCanvas ? `${screen?.width || 1920} / ${screen?.height || 1080}` : undefined;

  const { get: getData, refresh } = useWidgetData(widgets, filterValues);

  useEffect(() => {
    if (!dashboardId) return;
    setLoading(true);
    request.get<ReportDashboard>(`/api/report/dashboards/${dashboardId}`).then((res) => {
      if (res.code === 0) {
        const fv: Record<string, unknown> = {};
        for (const f of res.data.filters ?? []) {
          const fromUrl = searchParams.get(f.id);
          fv[f.id] = fromUrl != null ? fromUrl : defaultFilterValue(f);
        }
        setDashboard(res.data);
        setFilterValues(fv);
      } else Toast.error(res.message || '加载失败');
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId]);

  // 自动刷新
  useEffect(() => {
    const sec = dashboard?.config?.refreshInterval ?? 0;
    if (!sec || sec <= 0) return;
    const t = setInterval(() => refresh(), sec * 1000);
    return () => clearInterval(t);
  }, [dashboard?.config?.refreshInterval, refresh]);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  function handleCategoryClick(w: ReportWidget, value: string) {
    if (w.interaction?.enabled && w.interaction.setFilterId) {
      setFilterValues((p) => ({ ...p, [w.interaction!.setFilterId as string]: value }));
    }
    if (w.drilldown?.enabled) {
      const dd = w.drilldown;
      if (dd.type === 'url' && dd.url) { window.open(dd.url.replace('{value}', encodeURIComponent(value)), '_blank'); }
      else if (dd.targetDashboardId) {
        const q = dd.paramName ? `?${encodeURIComponent(dd.paramName)}=${encodeURIComponent(value)}` : '';
        navigate(`/report/dashboards/${dd.targetDashboardId}/view${q}`);
      }
    }
  }

  function toggleFullscreen() {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  async function handleExportPng() {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { backgroundColor: isDark ? '#0b1020' : '#ffffff', pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${dashboard?.name ?? 'dashboard'}.png`;
      a.click();
    } catch { Toast.error('导出失败，请重试'); } finally { setExporting(false); }
  }

  async function fetchComments() {
    if (!dashboardId) return;
    setCommentsLoading(true);
    try {
      const res = await request.get<ReportDashboardComment[]>(`/api/report/dashboards/${dashboardId}/comments`, { silent: true });
      if (res.code === 0) setComments(res.data);
      else Toast.error(res.message || '评论加载失败');
    } finally {
      setCommentsLoading(false);
    }
  }

  function openComments() {
    setCommentsVisible(true);
    void fetchComments();
  }

  async function submitComment() {
    const content = commentText.trim();
    if (!content) { Toast.warning('请输入评论内容'); return; }
    setCommentSubmitting(true);
    try {
      const res = await request.post<ReportDashboardComment>(
        `/api/report/dashboards/${dashboardId}/comments`,
        { widgetId: null, content },
        { silent: true },
      );
      if (res.code === 0) {
        setComments((prev) => [res.data, ...prev]);
        setCommentText('');
        Toast.success('发表成功');
      } else {
        Toast.error(res.message || '发表失败');
      }
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function deleteComment(commentId: number) {
    const res = await request.delete(`/api/report/dashboards/${dashboardId}/comments/${commentId}`, undefined, { silent: true });
    if (res.code === 0) {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      Toast.success('删除成功');
    } else {
      Toast.error(res.message || '删除失败');
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;

  const canvasState = (w: ReportWidget) => getData(w);

  return (
    <div
      ref={rootRef}
      className={`report-screen-root${isCanvas ? '' : ' report-view'}`}
      style={isCanvas ? { background: isDark ? '#060c1f' : 'var(--semi-color-fill-0)' } : (isDark ? { background: '#0b1020' } : undefined)}
    >
      <div className={`report-screen-header${isDark ? ' report-screen-header--dark' : ''}`} style={isCanvas ? undefined : { padding: 0, marginBottom: 12 }}>
        <Button icon={<ArrowLeft size={16} />} theme="borderless" onClick={() => navigate('/report/dashboards')}>返回</Button>
        <span className="report-screen-header__title" style={{ margin: 0, color: isDark ? '#eaf4ff' : 'var(--semi-color-text-0)', fontSize: isCanvas ? 20 : 18 }}>{dashboard?.name ?? '仪表盘'}</span>
        <div style={{ flex: 1 }} />
        <Button icon={<RotateCcw size={16} />} onClick={() => refresh()}>刷新</Button>
        <Button icon={<Image size={16} />} loading={exporting} onClick={handleExportPng}>图片</Button>
        <Button icon={<Maximize size={16} />} onClick={toggleFullscreen}>全屏</Button>
        {hasPermission('report:dashboard:list') && (
          <Button icon={<MessageSquare size={16} />} onClick={openComments}>评论</Button>
        )}
        {hasPermission('report:dashboard:update') && (
          <Button icon={<PencilRuler size={16} />} onClick={() => navigate(`/report/dashboards/${dashboardId}/design`)}>编辑</Button>
        )}
      </div>

      <div ref={exportRef} style={isCanvas ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined}>
        <div style={isCanvas ? { padding: '0 12px' } : undefined}>
          <FilterBar filters={filters} values={filterValues} onChange={(fid, val) => setFilterValues((p) => ({ ...p, [fid]: val }))} />
        </div>

        {widgets.length === 0 ? (
          <Empty description="该仪表盘还没有组件" style={{ paddingTop: 80 }} />
        ) : isCanvas ? (
          <div style={isFs ? { flex: 1, minHeight: 0 } : { width: '100%', aspectRatio: aspect, maxHeight: 'calc(100vh - 160px)' }}>
            <ScreenCanvas
              widgets={widgets}
              layout={(dashboard?.layout ?? []) as ReportGridItem[]}
              canvasLayout={(dashboard?.canvasLayout ?? []) as ReportCanvasItem[]}
              config={dashboard?.config ?? {}}
              filterValues={filterValues}
              getWidgetState={canvasState}
              onCategoryClick={handleCategoryClick}
            />
          </div>
        ) : (
          <ScreenCanvas
            widgets={widgets}
            layout={(dashboard?.layout ?? []) as ReportGridItem[]}
            canvasLayout={(dashboard?.canvasLayout ?? []) as ReportCanvasItem[]}
            config={dashboard?.config ?? {}}
            filterValues={filterValues}
            getWidgetState={canvasState}
            onCategoryClick={handleCategoryClick}
          />
        )}
      </div>

      <SideSheet
        title="仪表盘评论"
        visible={commentsVisible}
        onCancel={() => setCommentsVisible(false)}
        placement="right"
        width={420}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {commentsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
            ) : comments.length === 0 ? (
              <Empty description="暂无评论" style={{ padding: '32px 0' }} />
            ) : (
              <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar size="small" src={comment.userAvatar || undefined}>{comment.userName?.slice(0, 1) || '用'}</Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Typography.Text strong>{comment.userName || `用户 ${comment.userId}`}</Typography.Text>
                        <Typography.Text type="tertiary" size="small">{formatDateTime(comment.createdAt)}</Typography.Text>
                        <div style={{ flex: 1 }} />
                        <Button
                          theme="borderless"
                          type="danger"
                          size="small"
                          icon={<Trash2 size={14} />}
                          onClick={() => void deleteComment(comment.id)}
                          aria-label="删除评论"
                        />
                      </div>
                      <Typography.Paragraph style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{comment.content}</Typography.Paragraph>
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--semi-color-border)', padding: 16 }}>
            <TextArea
              value={commentText}
              onChange={setCommentText}
              placeholder="写下评论..."
              autosize={{ minRows: 3, maxRows: 5 }}
              maxCount={1000}
              showClear
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button type="primary" icon={<Send size={14} />} loading={commentSubmitting} onClick={() => void submitComment()}>发表</Button>
            </div>
          </div>
        </div>
      </SideSheet>
    </div>
  );
}
