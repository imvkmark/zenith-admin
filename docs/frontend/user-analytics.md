# 用户行为埋点分析

Zenith Admin 内置了一套对标 GA4 / PostHog / 神策 / Sentry 的前端数据分析与错误监控系统，无需任何外部服务即可完成**行为采集、多维分析、错误监控与告警**。

## 能力总览

| 模块 | 能力 |
|------|------|
| 采集 SDK | 自动采集（页面/点击）、自定义事件、属性袋、Web Vitals 性能、API 请求监控、离线缓存重试、匿名→登录身份合并、UTM/来源/设备上下文、远程配置（开关/采样/黑名单/DNT） |
| 行为分析 | 概览 KPI、PV/UV/会话/事件趋势、实时、页面停留、功能使用、会话分析、漏斗、留存、路径、用户行为时间线、维度分布、Web Vitals、点击热力图 |
| 数据管理 | 事件明细（多维筛选 + 日期范围 + 详情 + 导出 Excel/CSV）、事件字典治理、每日聚合、采集设置、数据保留策略 |
| 错误监控 | Issue 分组模型、状态流转/指派/备注、趋势与影响面、行为面包屑、UA 解析、Source Map 堆栈还原、告警规则（邮件/Webhook/站内） |

---

## 架构

```text
前端 Tracker SDK (utils/tracker.ts)
  · 自动采集 + Web Vitals + API 监控 + 离线重试 + 远程配置
        ↓ 批量上报（匿名/登录均可）
POST /api/analytics/events           埋点事件
POST /api/frontend-errors            错误上报（含面包屑/上下文）
        ↓ 服务端解析 UA / IP、计算指纹、维护会话
PostgreSQL
  user_events / analytics_sessions / analytics_daily_rollup
  analytics_event_meta / analytics_settings
  error_groups / error_events / error_alert_rules / source_maps
        ↓ 聚合分析接口
GET /api/analytics/*                 概览/趋势/会话/漏斗/留存/路径/维度/实时…
GET /api/frontend-errors/*           概览/分组/详情(还原)/事件/告警…
        ↓ 定时任务（pg-boss）
analyticsRollupDaily / analyticsRetention / evaluateErrorAlerts
```

所有数据均与 `userId` / `tenantId` 关联，支持多租户隔离。采集端点支持匿名上报（登录前埋点），错误指纹含租户因子保证全局唯一。

---

## 前端接入

### 1. 自动采集（零代码）

SDK 在 `App` 启动时通过 `initTracker()` 自动初始化（已内置）。启用后自动采集：

- **页面浏览**：路由进入/离开（`usePageTracker` 已覆盖主要页面）。
- **元素点击**：自动捕获 `button` / `a` / `[role=button]` / `[data-track]`，无需逐个埋点。
- **Web Vitals**：LCP / INP / CLS / FCP / TTFB。
- **API 监控**：拦截 fetch/XHR，记录慢请求与 4xx/5xx，5xx 自动转为错误上报。

给元素加 `data-track` / `data-track-label` / `data-area` 可自定义自动采集的标识：

```tsx
<Button data-track="user-export" data-track-label="导出用户" data-area="toolbar">导出</Button>
```

### 2. 手动埋点（精细化）

```tsx
import { trackFeature, trackEvent, trackAreaClick } from '@/utils/tracker';

// 功能点击
trackFeature('export-btn', '导出', 'search-toolbar');

// 自定义事件（带属性）
trackEvent('order_submit', { amount: 199, channel: 'wechat' });

// 区域点击（热力图）
const ref = useRef<HTMLDivElement>(null);
<div ref={ref} onClick={(e) => ref.current && trackAreaClick(e, ref.current, 'table')}>…</div>
```

### 3. 身份与配置

- 登录后自动 `identify(userId, username)`，退出 `resetIdentity()`（已在 `App` 中接入）。
- SDK 启动时拉取 `GET /api/analytics/config` 应用远程配置（采集开关、采样率、路径黑名单、是否尊重 DNT）。
- 上报失败/断网时事件落 `localStorage` 队列并自动重试，页面卸载时通过 `fetch keepalive` 兜底。

---

## 错误监控

- 全局兜底：`useGlobalErrorHandler` 捕获 JS 错误、Promise 拒绝、资源加载失败、`console.error`、白屏，并附带最近行为面包屑上报。
- **Issue 模型**：相同错误按指纹聚合为 `error_group`，每次发生记录为 `error_event`；支持未解决/已解决/已忽略/已静音状态流转、指派处理人、备注；已解决错误再次发生自动重开（回归检测）。
- **Source Map 还原**：在「错误监控 → Source Map」上传打包产物的 `.map`（按 `release` + 文件名），详情页自动将压缩堆栈还原为源码位置。
- **告警**：在「错误监控 → 告警规则」配置阈值/激增/新错误条件，命中后经邮件 / Webhook / 站内通知，由 `evaluateErrorAlerts` 定时任务（每 5 分钟）评估。

---

## 后台页面

| 页面 | 路径 | 权限 |
|------|------|------|
| 行为分析 | `/analytics/behavior` | `analytics:view` |
| 数据管理 | `/analytics/data` | `analytics:manage` / `analytics:export` |
| 错误监控 | `/analytics/errors` | `monitor:error:list` / `monitor:error:manage` / `monitor:alert:*` |

---

## 数据保留与聚合

- 「数据管理 → 采集设置」可配置埋点/错误数据保留天数、采样率、采集开关、路径黑名单、会话超时。
- 定时任务：`analyticsRollupDaily`（每日 01:00 预聚合）、`analyticsRetention`（每日 02:00 按保留策略清理）。
- 趋势查询默认实时计算；每日聚合表 `analytics_daily_rollup` 供长周期/大数据量提速，可在「数据聚合」面板手动重建。

---

## 数据模型

| 表 | 说明 |
|----|------|
| `user_events` | 原始事件流（含属性袋、UTM、设备、地域、性能指标） |
| `analytics_sessions` | 会话聚合（时长/页数/入口出口/跳出） |
| `analytics_daily_rollup` | 每日预聚合指标 |
| `analytics_event_meta` | 事件字典 / 埋点元数据治理 |
| `analytics_settings` | 采集与保留配置（SDK 远程配置来源） |
| `error_groups` | 错误分组（Issue，指纹全局唯一） |
| `error_events` | 单次错误事件（堆栈/面包屑/上下文/解析后 UA） |
| `error_alert_rules` | 错误告警规则 |
| `source_maps` | 上传的 Source Map（堆栈还原） |

> 修改这些表后需 `npm run db:generate && npm run db:migrate`，并在 `packages/shared/src/seed-data.ts` 同步菜单/权限。
