import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import {
  jsonContent, validationHook, commonErrorResponses, ok, okPaginated, okMsg,
  IdParam, PaginationQuery, okBody,
} from '../lib/openapi-schemas';
import { ChannelDTO, ChannelMessageDTO } from '../lib/openapi-dtos';
import { listMyChannels, listChannelMessages, markChannelRead } from '../services/channel.service';

const channelsRoute = new OpenAPIHono({ defaultHook: validationHook });

const listMine = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/mine', tags: ['Channels'], summary: '我的频道列表（含未读数）',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    responses: { ...commonErrorResponses, ...ok(z.array(ChannelDTO), '频道列表') },
  }),
  handler: async (c) => c.json(okBody(await listMyChannels()), 200),
});

const listMessages = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/{id}/messages', tags: ['Channels'], summary: '频道消息流（分页）',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { params: IdParam, query: PaginationQuery },
    responses: { ...commonErrorResponses, ...okPaginated(ChannelMessageDTO, '消息列表') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    const { page, pageSize } = c.req.valid('query');
    return c.json(okBody(await listChannelMessages(id, page, pageSize)), 200);
  },
});

const read = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/{id}/read', tags: ['Channels'], summary: '标记频道已读',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { params: IdParam },
    responses: { ...commonErrorResponses, ...okMsg('已标记已读') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    await markChannelRead(id);
    return c.json(okBody(null, '已标记已读'), 200);
  },
});

channelsRoute.openapiRoutes([listMine, listMessages, read] as const);

export default channelsRoute;
