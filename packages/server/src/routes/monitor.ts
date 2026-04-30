import { OpenAPIHono, createRoute, defineOpenAPIRoute } from '@hono/zod-openapi';
import { streamSSE } from 'hono/streaming';
import { authMiddleware } from '../middleware/auth';
import { guard } from '../middleware/guard';
import { validationHook, commonErrorResponses, ok, okBody } from '../lib/openapi-schemas';
import { MonitorDTO, MonitorTimeseriesDTO } from '../lib/openapi-dtos';
import { getMonitorStatus, getMonitorTimeseries } from '../services/monitor.service';
import { metricsSampler } from '../lib/metrics-sampler';

const monitorRouter = new OpenAPIHono({ defaultHook: validationHook });

const statusRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/',
    tags: ['Monitor'],
    summary: '获取服务器监控信息',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'system:monitor:view' })] as const,
    responses: { ...ok(MonitorDTO, '监控数据'), ...commonErrorResponses },
  }),
  handler: async (c) => c.json(okBody(await getMonitorStatus(), 'success'), 200),
});

const timeseriesRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/timeseries',
    tags: ['Monitor'],
    summary: '获取最近 1h 监控时序数据',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'system:monitor:view' })] as const,
    responses: { ...ok(MonitorTimeseriesDTO, '时序数据'), ...commonErrorResponses },
  }),
  handler: (c) => c.json(okBody(getMonitorTimeseries(), 'success'), 200),
});

monitorRouter.openapiRoutes([statusRoute, timeseriesRoute] as const);

/**
 * 非 OpenAPI 路由：SSE 实时推送监控指标。
 * 客户端订阅后，在每个采样周期（默认 10s）会收到一次 `metrics` 事件，
 * 数据为完整的 MonitorStatus（与 GET /api/monitor 一致），避免轮询带来的额外开销。
 */
monitorRouter.get(
  '/stream',
  authMiddleware,
  guard({ permission: 'system:monitor:view' }),
  (c) => streamSSE(c, async (stream) => {
    // 立刻推一次当前快照，便于前端首屏渲染
    try {
      const initial = await getMonitorStatus();
      await stream.writeSSE({ data: JSON.stringify(initial), event: 'metrics' });
    } catch {
      // ignore
    }

    // 每次采样器产生新样本时同步推送（延迟约 10s，与采样周期一致）
    let pending = false;
    const unsubscribe = metricsSampler.subscribe(async () => {
      if (pending) return;
      pending = true;
      try {
        const data = await getMonitorStatus();
        await stream.writeSSE({ data: JSON.stringify(data), event: 'metrics' });
      } catch {
        // ignore
      } finally {
        pending = false;
      }
    });

    // 心跳：每 30s 发送一次注释行，防止中间代理超时关闭连接
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: '', event: 'ping' }).catch(() => undefined);
    }, 30_000);

    const cleanup = () => {
      unsubscribe();
      clearInterval(heartbeat);
    };

    c.req.raw.signal.addEventListener('abort', cleanup);

    // 持续保持连接：只要 signal 没有 abort 就 sleep 等待
    await new Promise<void>((resolve) => {
      if (c.req.raw.signal.aborted) {
        cleanup();
        resolve();
        return;
      }
      c.req.raw.signal.addEventListener('abort', () => {
        cleanup();
        resolve();
      });
    });
  }),
);

export default monitorRouter;
