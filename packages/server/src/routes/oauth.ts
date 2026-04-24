import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { UAParser } from 'ua-parser-js';
import { authMiddleware } from '../middleware/auth';
import { registerSession } from '../lib/session-manager';
import { ErrorResponse, jsonContent, validationHook, commonErrorResponses, ok, okMsg, okBody } from '../lib/openapi-schemas';
import { OAuthAccountDTO, OAuthAuthUrlDTO, LoginResultDTO } from '../lib/openapi-dtos';
import { getUserRoles, issueTokens } from '../services/auth.service';
import {
  listOAuthAccounts, generateAuthUrl, resolveOAuthCallback,
  bindOAuthAccount, unbindOAuthAccount,
} from '../services/oauth.service';

const oauth = new OpenAPIHono({ defaultHook: validationHook });

const accountsRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/accounts', tags: ['OAuth'], summary: '当前用户绑定列表',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    responses: { ...commonErrorResponses, ...ok(z.array(OAuthAccountDTO), 'ok') },
  }),
  handler: async (c) => c.json(okBody(await listOAuthAccounts(c.get('user').userId)), 200),
});

const authUrlRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/{provider}', tags: ['OAuth'], summary: '获取授权链接',
    security: [],
    request: { params: z.object({ provider: z.string().openapi({ param: { name: 'provider', in: 'path' }, example: 'github', description: 'OAuth 提供方' }) }) },
    responses: {
      ...commonErrorResponses,
      ...ok(OAuthAuthUrlDTO, 'ok'),
      400: { content: jsonContent(ErrorResponse), description: '参数错误' },
    },
  }),
  handler: async (c) => {
    const { provider } = c.req.valid('param');
    return c.json(okBody(await generateAuthUrl(provider)), 200);
  },
});

const callbackRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/{provider}/callback', tags: ['OAuth'], summary: 'OAuth 回调',
    security: [],
    request: {
      params: z.object({ provider: z.string().openapi({ param: { name: 'provider', in: 'path' }, example: 'github', description: 'OAuth 提供方' }) }),
      body: { content: jsonContent(z.object({ code: z.string() }).openapi('OAuthCallbackBody')), required: true },
    },
    responses: {
      ...commonErrorResponses,
      ...ok(LoginResultDTO, 'ok'),
      400: { content: jsonContent(ErrorResponse), description: '参数错误' },
      403: { content: jsonContent(ErrorResponse), description: '账号已禁用' },
      404: { content: jsonContent(z.object({ code: z.number(), message: z.string(), data: z.looseObject({}) })), description: '未找到匹配账号' },
    },
  }),
  handler: async (c) => {
    const { provider } = c.req.valid('param');
    const { code } = c.req.valid('json');
    const result = await resolveOAuthCallback(provider, code);

    if (result.kind === 'needBind') {
      return c.json({ code: 404, message: '未找到匹配账号，请先绑定', data: { needBind: true, oauthInfo: result.oauthInfo } }, 404);
    }

    const user = result.user;
    const userRoleList = await getUserRoles(user.id);
    const roleCodes = userRoleList.map((r) => r.code);
    const { accessToken, refreshToken, tokenId } = await issueTokens(user, roleCodes);

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
    const ua = c.req.header('user-agent') || '';
    const parser = new UAParser(ua);
    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();

    await registerSession({
      tokenId, userId: user.id, username: user.username, nickname: user.nickname,
      ip,
      browser: browserInfo.name ? `${browserInfo.name} ${browserInfo.version || ''}`.trim() : 'Unknown',
      os: osInfo.name ? `${osInfo.name} ${osInfo.version || ''}`.trim() : 'Unknown',
      loginAt: new Date(),
    });

    const { password: _pw, ...userInfoClean } = user;
    return c.json(okBody({
      user: { ...userInfoClean, roles: userRoleList, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() },
      token: { accessToken, refreshToken },
    }, '登录成功'), 200);
  },
});

const bindRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/bind', tags: ['OAuth'], summary: '绑定 OAuth 账号',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { body: { content: jsonContent(z.object({ provider: z.string(), code: z.string() }).openapi('OAuthBindBody')), required: true } },
    responses: {
      ...commonErrorResponses,
      ...okMsg('ok'),
      400: { content: jsonContent(ErrorResponse), description: '参数错误' },
    },
  }),
  handler: async (c) => {
    const { provider, code } = c.req.valid('json');
    await bindOAuthAccount(c.get('user').userId, provider, code);
    return c.json(okBody(null, '绑定成功'), 200);
  },
});

const unbindRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete', path: '/unbind/{provider}', tags: ['OAuth'], summary: '解绑 OAuth 账号',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: { params: z.object({ provider: z.string().openapi({ param: { name: 'provider', in: 'path' }, example: 'github', description: 'OAuth 提供方' }) }) },
    responses: {
      ...commonErrorResponses,
      ...okMsg('ok'),
      400: { content: jsonContent(ErrorResponse), description: '参数错误' },
      404: { content: jsonContent(ErrorResponse), description: '未找到' },
    },
  }),
  handler: async (c) => {
    const { provider } = c.req.valid('param');
    await unbindOAuthAccount(c.get('user').userId, provider);
    return c.json(okBody(null, '已解绑'), 200);
  },
});

oauth.openapiRoutes([accountsRoute, authUrlRoute, callbackRoute, bindRoute, unbindRoute] as const);

export default oauth;
