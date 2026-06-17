/**
 * 会员认证中间件（与管理员 authMiddleware 完全隔离）。
 *
 * 关键安全隔离：会员 JWT 的 payload 带 `type: 'member'`，本中间件强制校验该字段；
 * 同时管理员 authMiddleware 会拒绝带 `type: 'member'` 的 token，杜绝两套体系互窜。
 */
import { createMiddleware } from 'hono/factory';
import { jwt, type JwtVariables } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { isMemberTokenBlacklisted, touchMemberSession, registerMemberSession } from '../lib/member-session-manager';
import { getClientIp, parseUserAgent } from '../lib/request-helpers';
import { db } from '../db';
import { members } from '../db/schema';
import { config } from '../config';
import { errBody } from '../lib/openapi-schemas';
import logger from '../lib/logger';

export interface MemberJwtPayload {
  memberId: number;
  /** 主标识（手机号 / 用户名 / 邮箱之一），用于日志展示 */
  identifier: string;
  /** 固定为 'member'，用于与管理员 token 严格区分 */
  type: 'member';
  tenantId: number | null;
  jti?: string;
}

/** Hono Env 类型——声明 Variables 中的 member 字段类型 */
export type MemberAuthEnv = {
  Variables: JwtVariables<MemberJwtPayload> & {
    member: MemberJwtPayload;
  };
};

const jwtMiddleware = jwt({
  secret: config.jwtSecret,
  alg: 'HS256',
});

export const memberAuthMiddleware = createMiddleware<MemberAuthEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return c.json(errBody('未登录', 401), 401);
  }

  try {
    await jwtMiddleware(c, async () => {});
    const payload = c.get('jwtPayload') as MemberJwtPayload;

    // 关键隔离：必须是会员 token（管理员 token 无 type='member'）
    if (payload.type !== 'member' || !payload.memberId) {
      return c.json(errBody('无效的会员令牌', 401), 401);
    }

    // 强制下线检查（best-effort）
    if (payload.jti) {
      try {
        if (await isMemberTokenBlacklisted(payload.jti)) {
          return c.json(errBody('会话已被强制下线', 401), 401);
        }
      } catch (redisErr) {
        logger.warn('[MemberAuth] Redis blacklist check failed, allowing request:', redisErr);
      }
    }

    // 刷新会话活跃度（best-effort，Redis 重启后懒重注册）
    if (payload.jti) {
      try {
        const existed = await touchMemberSession(payload.jti);
        if (!existed) {
          const ip = getClientIp(c);
          const ua = c.req.header('user-agent') ?? '';
          const { browser, os } = parseUserAgent(ua);
          const [m] = await db.select({ nickname: members.nickname }).from(members).where(eq(members.id, payload.memberId)).limit(1);
          if (m) {
            registerMemberSession({
              tokenId: payload.jti,
              memberId: payload.memberId,
              identifier: payload.identifier,
              nickname: m.nickname,
              tenantId: payload.tenantId ?? null,
              ip,
              browser,
              os,
              location: null,
              loginAt: new Date(),
            }).catch(() => { /* best-effort */ });
          }
        }
      } catch (redisErr) {
        logger.warn('[MemberAuth] Redis session touch failed, allowing request:', redisErr);
      }
    }

    c.set('member', payload);
    await next();
  } catch (err) {
    logger.warn('[MemberAuth] JWT verification failed:', err);
    return c.json(errBody('登录已过期', 401), 401);
  }
});

/**
 * 全局 ContextVariableMap 扩展：让 c.get('member') 在所有会员路由处理器中类型安全访问。
 * 与 middleware/auth.ts 的 user/auditBeforeData 声明合并（declaration merging）。
 */
declare module 'hono' {
  interface ContextVariableMap {
    member: MemberJwtPayload;
  }
}
