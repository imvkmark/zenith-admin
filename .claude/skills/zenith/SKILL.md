---
name: zenith
description: "Zenith Admin 项目专属开发辅助。Use when: 开发新模块、实现 CRUD 功能、新增页面、配置菜单权限、实现增删改查、新建后台功能模块、新增管理功能、发布新版本。包含 CRUD 完整代码生成流程与版本发布流程。"
argument-hint: "要开发的功能描述，例如：部门管理 CRUD、公告管理页面；或发布操作：发布 v0.2.0"
---

# Zenith Admin 开发辅助 Skill

## 已支持的工作流

| 场景 | 触发方式 | 参考文档 |
| --- | --- | --- |
| CRUD 模块（增删改查） | 「实现 XXX 的 CRUD」「新增 XXX 模块」「开发 XXX 功能」 | [CRUD 流程](#crud-模块开发流程) |
| 发布新版本 | 「发布 vX.Y.Z」「准备发布」「release X.Y.Z」 | [references/release.md](references/release.md) |

---

## CRUD 模块开发流程

### Step 0：信息收集与澄清

**在生成任何代码之前，必须先向用户收集以下信息。对于未提供或不明确的项，通过问题向用户确认，不要擅自假设。**

#### 必须明确的信息

| 信息项 | 说明 | 若未提供，则提问 |
| --- | --- | --- |
| **模块中文名** | 如「部门管理」 | 「请问这个模块的中文名称是什么？」 |
| **实体英文名**（单数首字母大写 + 小写） | 如 Department / department | 「实体的英文名是？（如 Department）」 |
| **API 路径前缀** | 如 `/api/departments` | 根据实体名推导，确认：「API 路径是 `/api/xxx` 吗？」 |
| **数据库表名** | 如 `departments` | 根据英文名复数推导，确认：「表名是 `xxx` 吗？」 |
| **权限前缀** | 如 `system:department` | 根据模块名推导，确认：「权限码前缀是 `system:xxx` 吗？」 |
| **主要字段列表** | 字段名、类型、是否必填、是否唯一 | 「请描述该模块需要哪些字段？（如：名称 string 必填、描述 string 可选）」 |
| **父菜单 ID** | 该菜单挂在哪个父菜单下 | 「该页面挂在哪个一级菜单下？（如系统管理 = id:2）」 |

#### 需要用户选择的可选项

以下选项**不要默认开启**，主动询问用户：

1. **是否需要 MSW Mock 数据？**（Demo 演示模式使用，若用户不提，询问：「是否需要同步添加 MSW Mock 数据以支持 Demo 演示模式？」）
2. **是否有状态字段？**（如 `status: active/disabled`，若有请确认使用现有 `statusEnum` 还是新建枚举）
3. **是否有关联实体？**（如外键关联部门、角色等，若有需了解关联方式：多对一 FK 还是多对多联表）
4. **是否需要数据导出（Excel）？**（若需要，后端需加 `/export` 端点）
5. **是否需要时间范围筛选？**（列表页搜索栏是否加时间范围）
6. **是否需要数据权限过滤？**（见下方「数据权限规范」）
7. **是否需要表格批量操作？**（见下方「批量操作规范」）
8. **是否需要租户隔离？**（多租户模式下的业务数据需添加 `tenant_id`，见下方「多租户感知规范」）

收集完所有信息后，向用户展示汇总确认，再开始实现。

---

### 数据权限规范（dataScope）

#### 何时需要过滤

| 模块类型 | 是否需要 | 说明 |
| --- | --- | --- |
| **业务数据**（用户、员工、订单等） | ✅ 需要 | 按角色 dataScope 过滤可见范围 |
| **配置数据**（角色、菜单、字典等） | ❌ 不需要 | 全局共享 |
| **日志数据** | 视需求而定 | 管理员可看全部，普通用户看自己 |

> Step 0 信息收集时，若新模块属于"业务数据"，必须询问：「该模块是否需要按数据权限（部门/本人）过滤可见范围？」

实现代码详见 [crud-backend.md — 数据权限过滤（dataScope）](./references/crud-backend.md)。

---

### 批量操作规范

> 在 Step 0 信息收集时主动询问：「是否需要表格批量操作功能（如批量删除）？」
> 前端实现见 [crud-frontend.md — 批量操作前端模板](./references/crud-frontend.md)，后端实现见 [crud-backend.md — 批量操作后端路由](./references/crud-backend.md)。

---

### 多租户感知规范（tenantScope）

> 仅当 `MULTI_TENANT_MODE=true` 时生效；关闭时工具函数返回 `undefined`/`null`，与单实例行为完全兼容。

| 模块类型 | 是否需要租户隔离 | 说明 |
| --- | --- | --- |
| **业务数据** | ✅ 需要 | 各租户数据互不可见 |
| **配置数据** | ❌ 不需要 | 全局共享 |
| **平台级功能** | ❌ 不需要 | 仅平台超管可访问 |

实现代码详见 [crud-backend.md — 多租户隔离（tenantScope）](./references/crud-backend.md)。

---

### Step 1～10：实现步骤

收集完信息并用户确认后，按以下顺序实现：

#### 后端（参考 [crud-backend.md](./references/crud-backend.md)）

| 步骤 | 文件 | 说明 |
| --- | --- | --- |
| **Step 1** | `packages/server/src/db/schema.ts` | 用 `pgTable` 定义表；新枚举用 `pgEnum`（三端同步）；导出 `XxxRow` / `NewXxx` infer 类型 |
| **Step 2** | 终端 | `npm run db:generate && npm run db:migrate` |
| **Step 3** | `packages/shared/src/validation.ts` | 添加 `createXxxSchema` + `updateXxxSchema = createXxxSchema.partial()` |
| **Step 4** | `packages/shared/src/types.ts` | 添加 `Xxx` interface（含关联冗余字段，时间字段序列化为 `string`） |
| **Step 5** | `packages/server/src/routes/xxx.ts` | 创建 OpenAPIHono Router；实体 DTO 先加入对应 `src/lib/dtos/` 子文件再导入；实现 5 个标准端点 |
| **Step 6** | `packages/server/src/index.ts` | `app.route('/api/xxxs', xxxRoutes)` |

> Step 6b：`@hono/zod-openapi` 自动生成 OpenAPI Spec，无需手动维护 `openapi.ts`。

#### 前端（参考 [crud-frontend.md](./references/crud-frontend.md)）

| 步骤 | 文件 | 说明 |
| --- | --- | --- |
| **Step 7** | `packages/web/src/pages/xxx/XxxPage.tsx` | 创建页面；`SearchToolbar` + `<Table bordered>` + 新增/编辑共用 `<Modal>` |

#### 菜单 & 权限（参考 [menu-seed.md](./references/menu-seed.md)）

| 步骤 | 文件 | 说明 |
| --- | --- | --- |
| **Step 8** | `packages/shared/src/seed-data.ts` | 添加 `type: 'menu'` 条目 + `type: 'button'` 权限条目 |
| **Step 9** | `packages/server/src/db/seed.ts` | 添加初始数据，使用 `onConflictDoNothing()` 保证幂等 |

#### 可选：MSW Mock（参考 [crud-mock.md](./references/crud-mock.md)）

| 步骤 | 说明 |
| --- | --- |
| **Step 10** | 仅当用户确认需要 Demo 演示模式时执行：`data/xxx.ts` + `handlers/xxx.ts` + 注册到 `handlers/index.ts` |

---

### 核心规范约束（每步必须遵守）

> 这些约束在 AGENTS.md 中有完整说明，实现时务必检查。

| 约束 | 规则 |
| --- | --- |
| **commonErrorResponses** | 所有路由的 `responses:` 块必须包含 `...commonErrorResponses`（涵盖 400/401/403/404/500），从 `'../lib/openapi-schemas'` 导入 |
| **枚举三端同步** | `pgEnum` / TS union type / Zod enum 保持完全一致 |
| **操作列固定** | 所有表格操作列必须 `fixed: 'right'` |
| **树形表格展开控制** | 使用 `children` 字段渲染树形表格时，必须在搜索栏添加「全部展开/全部折叠」按钮，使用受控 `expandedRowKeys` + `onExpandedRowsChange`；图标：已展开用 `ChevronsDownUp`，未展开用 `ChevronsUpDown` |
| **时间格式** | 时间显示统一使用 `formatDateTime()`，禁止原生 `toLocaleString()` 等 |
| **图标库** | 统一使用 `lucide-react`，禁止 `@douyinfe/semi-icons` |
| **操作按钮样式** | `theme="borderless" size="small"`，删除加 `type="danger"` |
| **无图标文字按钮** | 操作列按钮只用纯文字，不加图标 |
| **搜索栏布局** | 使用 `SearchToolbar` 组件（`components/SearchToolbar.tsx`），参考 `UsersPage.tsx` |
| **表格样式** | 统一 `<Table bordered>` |
| **响应码规范** | 成功 `{ code: 0 as const, message: 'ok', data: T }`（必须 `as const`），失败 `{ code: 400, message: '...', data: null }`，每个 `c.json(...)` 第二参数必须显式带状态码 `, 200)` |
| **分页格式** | 列表接口返回 `{ list, total, page, pageSize }` |
| **数据权限** | 业务数据模块在 Step 0 必须询问是否需要 dataScope 过滤；配置数据（角色/菜单/字典）无需过滤 |
| **多租户隔离** | 业务数据表添加 `tenantId` 字段，查询用 `tenantCondition(table, user)`，创建用 `getCreateTenantId(user)`；关闭多租户时两者均返回 `null`/`undefined`，无需额外判断 |
| **批量操作路由顺序** | `DELETE /batch` 必须注册在 `DELETE /:id` 之前，防止路由冲突 |
| **批量按钮显示时机** | 批量操作按钮仅在 `selectedRowKeys.length > 0` 时显示，放在查询/重置按钮之后 |
| **updatedAt 自动维护** | schema 中所有表的 `updatedAt` 已配置 `.$onUpdate(() => new Date())`，**禁止**在 `db.update().set({})` 中手动传入 `updatedAt: new Date()` |
| **计数查询** | 单表计数统一使用 `db.$count(table, where)`，禁止 `db.select({ total: count() }).from(table).where(where)` |
| **事务** | 多步写操作（replace 模式 delete+insert、写主表+关联表）必须用 `db.transaction()`；辅助写函数接受 `executor: DbTransaction \| typeof db` 参数；副作用（WebSocket、邮件）不放入事务 |

---

## 发布新版本流程

> 详细步骤请参阅 [references/release.md](references/release.md)。

触发时机：用户说「发布 vX.Y.Z」「准备发布」「release X.Y.Z」时，立即读取 `references/release.md` 并按步骤执行。
