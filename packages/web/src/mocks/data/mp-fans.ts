import type { MpFan } from '@zenith/shared';
import { SEED_MP_FANS } from '@zenith/shared';

export const mockMpFans: MpFan[] = SEED_MP_FANS.map((f) => ({ ...f, tagIds: [...f.tagIds] }));
