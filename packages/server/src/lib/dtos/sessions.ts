/**
 * 会话相关 DTO：在线会话（管理员视角）、用户登录会话（用户自身视角）
 */
import { z } from '@hono/zod-openapi';

export const OnlineSessionDTO = z
  .object({
    tokenId: z.string(),
    userId: z.number().int(),
    username: z.string(),
    nickname: z.string(),
    ip: z.string(),
    browser: z.string(),
    os: z.string(),
    loginAt: z.string(),
  })
  .openapi('OnlineSession');

export const SessionDTO = z
  .object({
    tokenId: z.string().openapi({ example: 'abcdef123456' }),
    ip: z.string().openapi({ example: '127.0.0.1' }),
    browser: z.string().openapi({ example: 'Chrome 120.0' }),
    os: z.string().openapi({ example: 'macOS 14.0' }),
    loginAt: z.string(),
    lastActiveAt: z.string(),
    isCurrent: z.boolean(),
  })
  .openapi('UserSession');
