/**
 * 缓存相关 DTO
 */
import { z } from '@hono/zod-openapi';

export const CacheItemDTO = z
  .object({
    key: z.string(),
    displayKey: z.string(),
    segment: z.string(),
    category: z.string(),
    type: z.string(),
    ttl: z.number(),
    size: z.number(),
    value: z.string().nullable(),
  })
  .openapi('CacheItem');
