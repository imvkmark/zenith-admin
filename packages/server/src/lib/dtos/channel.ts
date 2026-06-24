/**
 * Channel（站内公众号 / 系统号）相关 DTO
 */
import { z } from '@hono/zod-openapi';
import { ChatMessageExtraDTO } from './chat';

export const ChannelMessageDTO = z
  .object({
    id: z.number().int(),
    channelId: z.number().int(),
    audienceType: z.enum(['broadcast', 'targeted']),
    type: z.enum(['text', 'card']),
    title: z.string().nullable(),
    content: z.string(),
    extra: ChatMessageExtraDTO.nullable().optional(),
    publishedById: z.number().int().nullable(),
    isRead: z.boolean(),
    createdAt: z.string(),
  })
  .openapi('ChannelMessage');

export const ChannelDTO = z
  .object({
    id: z.number().int(),
    code: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
    description: z.string().nullable(),
    type: z.enum(['system', 'business']),
    builtin: z.boolean(),
    status: z.enum(['enabled', 'disabled']),
    unreadCount: z.number().int(),
    lastMessage: ChannelMessageDTO.nullable(),
    isMuted: z.boolean(),
    isSubscribed: z.boolean(),
    tenantId: z.number().int().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Channel');

export const ChannelAdminDTO = z
  .object({
    id: z.number().int(),
    code: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
    description: z.string().nullable(),
    type: z.enum(['system', 'business']),
    builtin: z.boolean(),
    status: z.enum(['enabled', 'disabled']),
    subscriberCount: z.number().int(),
    messageCount: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('ChannelAdmin');
