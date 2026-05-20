# 请求上下文与当前用户工具

`packages/server/src/lib/context.ts` 提供了一套基于 `hono/context-storage` 的零参工具函数，可在 Service 层任意位置获取当前登录用户信息，无需将 Hono `Context` 或 `user` 对象层层传递。

## 前提条件

`contextStorage()` 中间件已在 `src/index.ts` 全局挂载，所有工具函数在认证请求的生命周期内均可直接调用。

---

## 基础上下文函数

### `getCtx()`

获取当前请求的 Hono Context。脱离请求作用域（如定时任务、后台 Worker）时会抛出错误。

### `currentUser()`

获取当前已登录用户的 JWT Payload，若未登录则抛出错误。

```ts
import { currentUser } from '../lib/context';

const user = currentUser();
// { userId, username, roles: string[], tenantId, ... }
```

### `currentUserOrNull()`

与 `currentUser()` 相同，但未登录时返回 `undefined`，适用于匿名可访问接口。

---

## 角色判断工具（无需 DB）

以下函数直接读取 JWT Payload 中的 `roles` 字段，**无需查询数据库**，适合在 Service 层高频调用。

### `currentUserId()`

快捷获取当前登录用户 ID。

```ts
const id = currentUserId(); // 等价于 currentUser().userId
```

### `currentUserRoles()`

获取当前用户的角色 code 数组（来自 JWT）。

```ts
const roles = currentUserRoles(); // ['admin', 'editor']
```

### `hasRole(...codes)`

判断当前用户是否拥有指定角色（任意一个匹配即返回 `true`）。

```ts
if (hasRole('admin')) {
  // 仅管理员可执行
}

if (hasRole('admin', 'editor')) {
  // 管理员或编辑均可执行
}
```

### `isSuperAdmin()`

判断当前用户是否为超级管理员（拥有 `super_admin` 角色）。

```ts
if (isSuperAdmin()) {
  // 超管专属逻辑
}
```

---

## 完整用户详情（需要 DB 查询）

以下函数需要查询数据库，用于获取 JWT 中未携带的信息（部门、岗位等）。

### `currentUserDetail()`

获取当前用户的完整信息，包含部门、岗位列表和角色完整信息（含 dataScope）。

```ts
const detail = await currentUserDetail();
if (!detail) return; // 用户已被删除等异常情况

console.log(detail.department);  // { id, name, code, parentId } | null
console.log(detail.positions);   // [{ id, name, code }, ...]
console.log(detail.roles);       // [{ id, name, code, dataScope }, ...]
```

**返回类型 `CurrentUserDetail`：**

```ts
interface CurrentUserDetail {
  id: number;
  username: string;
  nickname: string;
  department: { id: number; name: string; code: string; parentId: number } | null;
  positions: { id: number; name: string; code: string }[];
  roles: { id: number; name: string; code: string; dataScope: string }[];
}
```

> **性能提示：** 每次调用均执行一次 DB 查询。同一请求内多次使用时，建议在 Service 层将结果缓存到局部变量。

### `hasPosition(...codes)`

判断当前用户是否拥有指定岗位（任意一个匹配即返回 `true`）。

```ts
if (await hasPosition('hr_manager', 'cto')) {
  // HR 经理或 CTO 可执行
}
```

### `isInDepartment(departmentId, includeDescendants?)`

判断当前用户是否属于指定部门。

```ts
// 精确匹配（仅本部门）
if (await isInDepartment(5)) { ... }

// 包含子部门
if (await isInDepartment(5, true)) { ... }
```

---

## 审计日志快照

### `setAuditBefore(data)`

在 Service 层写入"操作前实体快照"，供审计日志 diff 展示使用。

```ts
const before = await getUser(id);
setAuditBefore(before); // 路由完成后自动 diff
await updateUser(id, body);
```

---

## 完整导入示例

```ts
import {
  currentUserId,
  currentUserRoles,
  hasRole,
  isSuperAdmin,
  currentUserDetail,
  hasPosition,
  isInDepartment,
  setAuditBefore,
} from '../lib/context';
```
