import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { guard } from '../middleware/guard';
import {
  jsonContent, validationHook, commonErrorResponses, ok, okPaginated, okMsg,
  IdParam, PaginationQuery, okBody,
} from '../lib/openapi-schemas';
import { createChannelSchema, updateChannelSchema, publishChannelSchema } from '@zenith/shared';
import { ChannelDTO, ChannelMessageDTO, ChannelAdminDTO } from '../lib/openapi-dtos';
import {
  listMyChannels, listChannelMessages, markChannelRead,
  listChannelsAdmin, createChannel, updateChannel, deleteChannel, publishToChannel,
  subscribeChannel, unsubscribeChannel, listDiscoverableChannels,
} from '../services/channel.service';

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

// ─── 管理后台 ────────────────────────────────────────────────────────────────

const adminList = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/admin', tags: ['Channels'], summary: '频道管理列表（含订阅/消息数）',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'channel:channel:list' })] as const,
    request: { query: PaginationQuery.extend({ keyword: z.string().optional() }) },
    responses: { ...commonErrorResponses, ...okPaginated(ChannelAdminDTO, '频道列表') },
  }),
  handler: async (c) => {
    const { page, pageSize, keyword } = c.req.valid('query');
    return c.json(okBody(await listChannelsAdmin(page, pageSize, keyword)), 200);
  },
});

const create = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/', tags: ['Channels'], summary: '新建运营号',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'channel:channel:create', audit: { description: '新建频道', module: '消息中心' } })] as const,
    request: { body: { content: jsonContent(createChannelSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(ChannelAdminDTO, '创建成功') },
  }),
  handler: async (c) => c.json(okBody(await createChannel(c.req.valid('json')), '创建成功'), 200),
});

const update = defineOpenAPIRoute({
  route: createRoute({
    method: 'put', path: '/{id}', tags: ['Channels'], summary: '编辑频道',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'channel:channel:update', audit: { description: '编辑频道', module: '消息中心' } })] as const,
    request: { params: IdParam, body: { content: jsonContent(updateChannelSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(ChannelAdminDTO, '更新成功') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    return c.json(okBody(await updateChannel(id, c.req.valid('json')), '更新成功'), 200);
  },
});

const remove = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete', path: '/{id}', tags: ['Channels'], summary: '删除频道',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'channel:channel:delete', audit: { description: '删除频道', module: '消息中心' } })] as const,
    request: { params: IdParam },
    responses: { ...commonErrorResponses, ...okMsg('删除成功') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    await deleteChannel(id);
    return c.json(okBody(null, '删除成功'), 200);
  },
});

const publish = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/{id}/publish', tags: ['Channels'], summary: '向频道群发消息',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'channel:message:publish', audit: { description: '频道群发', module: '消息中心' } })] as const,
    request: { params: IdParam, body: { content: jsonContent(publishChannelSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(ChannelMessageDTO, '已发布') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    return c.json(okBody(await publishToChannel(id, c.req.valid('json')), '已发布'), 200);
  },
});

// ─── 订阅（运营号） ───────────────────────────────────────────────────────────

const discoverable = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/discoverable', tags: ['Channels'], summary: '可订阅的运营号列表',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    responses: { ...commonErrorResponses, ...ok(z.array(ChannelDTO), '可订阅频道') },
  }),
  handler: async (c) => c.json(okBody(await listDiscoverableChannels()), 200),
});

const subscribe = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/{id}/subscribe', tags: ['Channels'], summary: '订阅运营号',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { params: IdParam },
    responses: { ...commonErrorResponses, ...okMsg('已订阅') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    await subscribeChannel(id);
    return c.json(okBody(null, '已订阅'), 200);
  },
});

const unsubscribe = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete', path: '/{id}/subscribe', tags: ['Channels'], summary: '退订运营号',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { params: IdParam },
    responses: { ...commonErrorResponses, ...okMsg('已退订') },
  }),
  handler: async (c) => {
    const { id } = c.req.valid('param');
    await unsubscribeChannel(id);
    return c.json(okBody(null, '已退订'), 200);
  },
});

channelsRoute.openapiRoutes([listMine, listMessages, read, adminList, create, update, remove, publish, discoverable, subscribe, unsubscribe] as const);

export default channelsRoute;
