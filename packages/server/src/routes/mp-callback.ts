/**
 * 公众号消息回调（公开端点，无需登录，由微信服务器调用）。
 *
 *   GET  /api/public/mp/callback/{accountId}  — 服务器配置校验（返回 echostr）
 *   POST /api/public/mp/callback/{accountId}  — 接收消息/事件（阶段一仅验签占位）
 *
 * 校验逻辑见 lib/wechat/signature.ts。账号查询不做租户过滤（回调无登录上下文）。
 */
import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { validationHook } from '../lib/openapi-schemas';
import { getMpAccountForCallback } from '../services/mp-account.service';
import { verifyWechatSignature } from '../lib/wechat';

const router = new OpenAPIHono({ defaultHook: validationHook });

const CallbackParam = z.object({
  accountId: z.coerce.number().int().openapi({ param: { name: 'accountId', in: 'path' }, example: 1 }),
});

const CallbackQuery = z.object({
  signature: z.string().optional(),
  timestamp: z.string().optional(),
  nonce: z.string().optional(),
  echostr: z.string().optional(),
});

const textResponses = {
  200: { description: '处理结果（纯文本）', content: { 'text/plain': { schema: z.string() } } },
  403: { description: '签名校验失败', content: { 'text/plain': { schema: z.string() } } },
  404: { description: '公众号不存在', content: { 'text/plain': { schema: z.string() } } },
} as const;

const verifyRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/{accountId}',
    tags: ['公众号回调（公开）'],
    summary: '微信服务器配置校验（公开，无需登录）',
    description: '微信公众平台保存「服务器配置」时回调此端点，校验 signature 通过后原样返回 echostr。',
    request: { params: CallbackParam, query: CallbackQuery },
    responses: textResponses,
  }),
  handler: async (c) => {
    const { accountId } = c.req.valid('param');
    const { signature, timestamp, nonce, echostr } = c.req.valid('query');
    const account = await getMpAccountForCallback(accountId);
    if (!account) return c.text('', 404);
    if (!verifyWechatSignature(account.token, signature, timestamp, nonce)) return c.text('', 403);
    return c.text(echostr ?? '', 200);
  },
});

const receiveRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post',
    path: '/{accountId}',
    tags: ['公众号回调（公开）'],
    summary: '接收微信消息/事件（公开，无需登录）',
    description: '阶段一占位：验签通过后返回空串（微信视为成功，不被动回复）。消息落库与自动回复在后续阶段实现。',
    request: { params: CallbackParam, query: CallbackQuery },
    responses: textResponses,
  }),
  handler: async (c) => {
    const { accountId } = c.req.valid('param');
    const { signature, timestamp, nonce } = c.req.valid('query');
    const account = await getMpAccountForCallback(accountId);
    if (!account) return c.text('', 404);
    if (!verifyWechatSignature(account.token, signature, timestamp, nonce)) return c.text('', 403);
    return c.text('', 200);
  },
});

router.openapiRoutes([verifyRoute, receiveRoute] as const);

export default router;
