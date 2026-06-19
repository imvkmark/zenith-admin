import { createMiddleware } from 'hono/factory';
import { jwt } from 'hono/jwt';
import { config } from '../config';
import type { AuthEnv, JwtPayload } from './auth';

const jwtMiddleware = jwt({ secret: config.jwtSecret, alg: 'HS256' });

/**
 * 可选认证中间件：用于既支持匿名又支持登录的采集类接口（埋点上报 / 错误上报）。
 * - 携带有效 Bearer token 时解析并注入 `user`（会员 token 视为匿名）。
 * - 无 token 或 token 无效时不报错，按匿名继续。
 */
export const optionalAuthMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    try {
      await jwtMiddleware(c, async () => {});
      const payload = c.get('jwtPayload') as JwtPayload & { type?: string };
      if (payload && payload.type !== 'member') {
        c.set('user', payload);
      }
    } catch {
      // 忽略无效 token，按匿名处理
    }
  }
  await next();
});
