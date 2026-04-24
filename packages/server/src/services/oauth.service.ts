import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { users, userOauthAccounts } from '../db/schema';
import { getOAuthProvider, isProviderConfigured } from '../lib/oauth';
import { AppError } from '../lib/errors';
import { OAUTH_PROVIDERS, type OAuthProviderType } from '@zenith/shared';

const VALID_PROVIDERS = new Set<string>(OAUTH_PROVIDERS);

export function isValidOAuthProvider(p: string | undefined): p is OAuthProviderType {
  return !!p && VALID_PROVIDERS.has(p);
}

export async function ensureProviderUsable(provider: string): Promise<OAuthProviderType> {
  if (!isValidOAuthProvider(provider)) throw new AppError('不支持的 OAuth 提供方', 400);
  if (!(await isProviderConfigured(provider))) throw new AppError('该 OAuth 提供方尚未配置，请联系管理员', 400);
  return provider;
}

export async function listOAuthAccounts(userId: number) {
  const accounts = await db
    .select({
      id: userOauthAccounts.id,
      provider: userOauthAccounts.provider,
      openId: userOauthAccounts.openId,
      nickname: userOauthAccounts.nickname,
      avatar: userOauthAccounts.avatar,
      createdAt: userOauthAccounts.createdAt,
    })
    .from(userOauthAccounts)
    .where(eq(userOauthAccounts.userId, userId));
  return accounts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
}

export async function generateAuthUrl(provider: string) {
  const p = await ensureProviderUsable(provider);
  const state = crypto.randomBytes(16).toString('hex');
  const oauthProvider = await getOAuthProvider(p);
  const authUrl = oauthProvider.getAuthUrl(state);
  return { authUrl, state };
}

export interface OAuthResolved {
  kind: 'resolved';
  user: typeof users.$inferSelect;
}
export interface OAuthNeedBind {
  kind: 'needBind';
  oauthInfo: { provider: string; openId: string; nickname: string; avatar?: string | null };
}
export type OAuthCallbackResult = OAuthResolved | OAuthNeedBind;

export async function resolveOAuthCallback(provider: string, code: string): Promise<OAuthCallbackResult> {
  const p = await ensureProviderUsable(provider);
  if (!code) throw new AppError('缺少授权码', 400);

  const oauthProvider = await getOAuthProvider(p);
  const tokenResult = await oauthProvider.getToken(code);
  const userInfo = await oauthProvider.getUserInfo(tokenResult);

  const [existingBind] = await db
    .select()
    .from(userOauthAccounts)
    .where(and(eq(userOauthAccounts.provider, p), eq(userOauthAccounts.openId, userInfo.openId)))
    .limit(1);

  let userId: number;
  if (existingBind) {
    userId = existingBind.userId;
    await db
      .update(userOauthAccounts)
      .set({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken || null,
        expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar || null,
      })
      .where(eq(userOauthAccounts.id, existingBind.id));
  } else {
    const emailUser = userInfo.email
      ? (await db.select().from(users).where(eq(users.email, userInfo.email)).limit(1))[0]
      : undefined;
    if (!emailUser) {
      return {
        kind: 'needBind',
        oauthInfo: { provider: p, openId: userInfo.openId, nickname: userInfo.nickname, avatar: userInfo.avatar },
      };
    }
    userId = emailUser.id;
    await db.insert(userOauthAccounts).values({
      userId,
      provider: p,
      openId: userInfo.openId,
      unionId: userInfo.unionId || null,
      nickname: userInfo.nickname,
      avatar: userInfo.avatar || null,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken || null,
      expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
      raw: JSON.stringify(userInfo),
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status === 'disabled') throw new AppError('账号已被禁用', 403);
  return { kind: 'resolved', user };
}

export async function bindOAuthAccount(userId: number, provider: string, code: string) {
  if (!provider || !code) throw new AppError('缺少参数', 400);
  const p = await ensureProviderUsable(provider);
  const oauthProvider = await getOAuthProvider(p);
  const tokenResult = await oauthProvider.getToken(code);
  const userInfo = await oauthProvider.getUserInfo(tokenResult);

  const [existing] = await db
    .select()
    .from(userOauthAccounts)
    .where(and(eq(userOauthAccounts.provider, p), eq(userOauthAccounts.openId, userInfo.openId)))
    .limit(1);

  if (existing) {
    if (existing.userId === userId) throw new AppError('该账号已绑定', 400);
    throw new AppError('该第三方账号已被其他用户绑定', 400);
  }

  const [myBind] = await db
    .select()
    .from(userOauthAccounts)
    .where(and(eq(userOauthAccounts.userId, userId), eq(userOauthAccounts.provider, p)))
    .limit(1);
  if (myBind) throw new AppError('您已绑定该类型账号，请先解绑', 400);

  await db.insert(userOauthAccounts).values({
    userId,
    provider: p,
    openId: userInfo.openId,
    unionId: userInfo.unionId || null,
    nickname: userInfo.nickname,
    avatar: userInfo.avatar || null,
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken || null,
    expiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
    raw: JSON.stringify(userInfo),
  });
}

export async function unbindOAuthAccount(userId: number, provider: string) {
  if (!isValidOAuthProvider(provider)) throw new AppError('不支持的 OAuth 提供方', 400);
  const result = await db
    .delete(userOauthAccounts)
    .where(and(eq(userOauthAccounts.userId, userId), eq(userOauthAccounts.provider, provider)))
    .returning();
  if (result.length === 0) throw new AppError('未找到该绑定', 404);
}
