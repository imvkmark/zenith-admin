/**
 * 公众号管理 DTO
 */
import { z } from '@hono/zod-openapi';
import { auditFields } from './_audit';

export const MpAccountDTO = z
  .object({
    id: z.number().int(),
    name: z.string(),
    account: z.string().nullable(),
    appId: z.string(),
    appSecret: z.string().optional(), // 脱敏：列表返回 '******'，编辑返回 ''
    token: z.string(),
    encodingAesKey: z.string().nullable(),
    encryptMode: z.enum(['plaintext', 'compatible', 'safe']),
    type: z.enum(['subscribe', 'service', 'test']),
    qrCodeUrl: z.string().nullable(),
    isDefault: z.boolean(),
    status: z.enum(['enabled', 'disabled']),
    remark: z.string().nullable(),
    ...auditFields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('MpAccount');

export const MpConnectionTestDTO = z
  .object({
    success: z.boolean(),
    message: z.string(),
  })
  .openapi('MpConnectionTest');

export const MpTagDTO = z
  .object({
    id: z.number().int(),
    accountId: z.number().int(),
    wechatTagId: z.number().int().nullable(),
    name: z.string(),
    fansCount: z.number().int(),
    ...auditFields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('MpTag');

export const MpTagSyncResultDTO = z
  .object({
    success: z.boolean(),
    created: z.number().int(),
    updated: z.number().int(),
    total: z.number().int(),
  })
  .openapi('MpTagSyncResult');

export const MpFanDTO = z
  .object({
    id: z.number().int(),
    accountId: z.number().int(),
    openid: z.string(),
    nickname: z.string().nullable(),
    avatar: z.string().nullable(),
    sex: z.number().int(),
    country: z.string().nullable(),
    province: z.string().nullable(),
    city: z.string().nullable(),
    language: z.string().nullable(),
    subscribe: z.enum(['subscribed', 'unsubscribed']),
    subscribeTime: z.string().nullable(),
    remark: z.string().nullable(),
    tagIds: z.array(z.number().int()),
    ...auditFields,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('MpFan');

export const MpFanSyncResultDTO = z
  .object({
    success: z.boolean(),
    synced: z.number().int(),
    total: z.number().int(),
  })
  .openapi('MpFanSyncResult');
