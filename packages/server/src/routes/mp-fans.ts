import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { guard, setAuditBeforeData } from '../middleware/guard';
import {
  PaginationQuery, jsonContent, validationHook, commonErrorResponses,
  ok, okPaginated, IdParam, okBody,
} from '../lib/openapi-schemas';
import { updateMpFanSchema } from '@zenith/shared';
import { MpFanDTO, MpFanSyncResultDTO } from '../lib/openapi-dtos';
import {
  listMpFans, updateMpFan, getMpFanBeforeAudit, syncMpFans,
} from '../services/mp-fan.service';

const mpFansRouter = new OpenAPIHono({ defaultHook: validationHook });

const syncBodySchema = z.object({ accountId: z.number().int().positive() });

const listRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/', tags: ['公众号粉丝'], summary: '粉丝列表',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'mp:fan:list' })] as const,
    request: {
      query: PaginationQuery.extend({
        accountId: z.coerce.number().int().positive(),
        keyword: z.string().optional(),
        subscribe: z.enum(['subscribed', 'unsubscribed']).optional(),
        tagId: z.coerce.number().int().positive().optional(),
      }),
    },
    responses: { ...commonErrorResponses, ...okPaginated(MpFanDTO, '粉丝列表') },
  }),
  handler: async (c) => c.json(okBody(await listMpFans(c.req.valid('query'))), 200),
});

const syncRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/sync', tags: ['公众号粉丝'], summary: '从微信同步粉丝',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'mp:fan:sync', audit: { description: '同步公众号粉丝', module: '公众号粉丝' } })] as const,
    request: { body: { content: jsonContent(syncBodySchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(MpFanSyncResultDTO, '同步完成') },
  }),
  handler: async (c) => c.json(okBody(await syncMpFans(c.req.valid('json').accountId), '同步完成'), 200),
});

const updateRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'put', path: '/{id}', tags: ['公众号粉丝'], summary: '更新粉丝备注/标签',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'mp:fan:update', audit: { description: '更新公众号粉丝', module: '公众号粉丝' } })] as const,
    request: { params: IdParam, body: { content: jsonContent(updateMpFanSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(MpFanDTO, '更新成功') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    setAuditBeforeData(c, await getMpFanBeforeAudit(id));
    return c.json(okBody(await updateMpFan(id, c.req.valid('json')), '更新成功'), 200);
  },
});

mpFansRouter.openapiRoutes([listRoute, syncRoute, updateRoute] as const);

export default mpFansRouter;
