/**
 * API Token 相关 DTO
 */
import { z } from '@hono/zod-openapi';

export const ApiTokenListItemDTO = z
  .object({
    id: z.number().int(),
    name: z.string(),
    tokenPrefix: z.string(),
    lastUsedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('ApiTokenListItem');

export const ApiTokenCreatedDTO = z
  .object({
    id: z.number().int(),
    name: z.string(),
    token: z.string(),
    createdAt: z.string(),
  })
  .openapi('ApiTokenCreated');
