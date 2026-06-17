/**
 * 乐观锁重试工具。
 *
 * 用于积分 / 钱包账户的并发安全记账：账户表带 version 字段，
 * 更新时校验 version 未变；冲突时抛 OptimisticLockError 并由本工具重试整个事务。
 */
import { HTTPException } from 'hono/http-exception';

export class OptimisticLockError extends Error {
  constructor(message = 'Optimistic lock conflict') {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

/** 包装一个含乐观锁更新的操作，冲突时重试。重试耗尽后抛 409。 */
export async function withOptimisticRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof OptimisticLockError && i < retries - 1) continue;
      if (e instanceof OptimisticLockError) break;
      throw e;
    }
  }
  throw new HTTPException(409, { message: '操作过于频繁，请稍后重试' });
}
