/**
 * 会员请求上下文（基于 hono/context-storage，与管理员 currentUser() 并存）。
 *
 * 会员路由经 memberAuthMiddleware 注入 c.set('member', payload) 后，
 * Service 层可零参调用 currentMember() 获取当前登录会员，无需透传 Context。
 */
import { tryGetContext } from 'hono/context-storage';
import type { MemberAuthEnv, MemberJwtPayload } from '../middleware/member-auth';

/** 获取当前登录会员；未走会员认证中间件时返回 undefined。 */
export function currentMemberOrNull(): MemberJwtPayload | undefined {
  return tryGetContext<MemberAuthEnv>()?.get('member');
}

/** 获取当前登录会员；不存在则抛错（仅用于已鉴权场景）。 */
export function currentMember(): MemberJwtPayload {
  const m = currentMemberOrNull();
  if (!m) {
    throw new Error('currentMember() called outside an authenticated member request context');
  }
  return m;
}

/** 快捷获取当前登录会员 ID。 */
export function currentMemberId(): number {
  return currentMember().memberId;
}
