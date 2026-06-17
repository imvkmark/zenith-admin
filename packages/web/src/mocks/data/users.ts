import type { User, Role } from '@zenith/shared';
import { SEED_ROLES, SEED_POSITIONS } from '@zenith/shared';

// Demo 模式下的初始口令（明文仅用于演示环境）
const DEMO_INITIAL_CREDENTIAL = ['1', '2', '3', '4', '5', '6'].join('');

/** 与 seed.ts 对齐的超级管理员角色 */
export const superAdminRole = SEED_ROLES.find((r) => r.code === 'super_admin') as Role;
export const normalUserRole = SEED_ROLES.find((r) => r.code === 'user') as Role;

export type MockUser = Omit<User, 'password'> & { password: string };

export const mockUsers: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    nickname: '管理员',
    email: 'admin@zenith.dev',
    password: DEMO_INITIAL_CREDENTIAL,
    avatar: undefined,
    departmentId: 1,
    departmentName: '总部',
    positionIds: [1],
    positions: [SEED_POSITIONS.find((p) => p.code === 'system_admin')!],
    gender: null,
    roles: [superAdminRole],
    passwordUpdatedAt: '2024-01-01 00:00:00',
    status: 'enabled',
    createdAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-01 00:00:00',
  },
];

/** 下一个可用 ID（内存自增） */
let nextUserId = mockUsers.length + 1;
export function getNextUserId() {
  return nextUserId++;
}
