# 事件订阅（HTTP Webhook）

事件订阅用于把工作流事件以 HTTP POST 形式投递到外部系统，由 `webhook` 订阅者监听总线后按数据库配置分发。

## 订阅表字段（`workflow_event_subscriptions`）

| 字段 | 说明 |
| --- | --- |
| `name` | 订阅名称 |
| `description` | 订阅描述 |
| `url` | 投递目标 URL |
| `definitionId` | `null` = 订阅所有流程；非空 = 仅订阅指定流程定义 |
| `events` | 订阅的事件类型数组（JSON）；接口支持事件总线 15 种事件 |
| `signMode` | `hmacSha256 \| none` |
| `secret` | HMAC 密钥 |
| `headers` | 附加请求头 JSON |
| `enabled` | 是否启用 |
| `tenantId` | 租户隔离 |

> 当前订阅表 **不支持按 `nodeKey` 过滤**，需在接收方按 payload 内 `nodeKey` 自行筛选。

## 投递记录（`workflow_event_deliveries`）

每次投递写入一条记录，包含：订阅 ID、实例 ID、任务 ID、事件 ID、事件类型、payload、状态（`pending / success / failed / retrying`）、请求 URL、请求头、响应码、响应体、错误信息、耗时、尝试次数、下次重试时间、开始/结束时间。

投递层固定使用 10 秒超时。非 2xx 响应或网络异常会进入阶梯重试：约 5 分钟、30 分钟、3 小时、12 小时后再次投递；重试耗尽后状态为 `failed`。投递记录支持手动重试，手动重试会把记录置为 `retrying` 并立即进入重试队列。

## 签名

`signMode === 'hmacSha256'` 且订阅配置了 `secret` 时，请求头会带：

```http
X-Zenith-Signature: t={timestamp},v1={hex_hmac}
```

请求还会包含以下头：

```http
X-Zenith-Event: {eventType}
X-Zenith-Event-Id: {eventId}
X-Zenith-Delivery-Id: {deliveryId}
X-Zenith-Attempt: {attempt}
```

签名内容为 `${timestamp}.${rawBody}`，密钥为订阅记录的 `secret`，算法 `HMAC-SHA256`。接收方应：

1. 校验 `timestamp` 与当前时间偏差（建议 ≤ 5 分钟）；
2. 用相同密钥重算 HMAC 并比对 `v1`。

## REST API

所有接口位于 `/api/workflows/event-subscriptions`：

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/workflows/event-subscriptions` | `workflow:event-subscription:view` | 订阅列表，支持 `keyword` / `definitionId` / `enabled` 过滤 |
| GET | `/api/workflows/event-subscriptions/:id` | `workflow:event-subscription:view` | 订阅详情 |
| GET | `/api/workflows/event-subscriptions/:id/secret` | `workflow:event-subscription:view` | 查看订阅 secret 明文 |
| POST | `/api/workflows/event-subscriptions` | `workflow:event-subscription:create` | 新建订阅 |
| PUT | `/api/workflows/event-subscriptions/:id` | `workflow:event-subscription:edit` | 更新订阅 |
| DELETE | `/api/workflows/event-subscriptions/:id` | `workflow:event-subscription:delete` | 删除订阅 |
| PATCH | `/api/workflows/event-subscriptions/:id/toggle` | `workflow:event-subscription:edit` | 启用/禁用订阅 |
| GET | `/api/workflows/event-subscriptions/deliveries/list` | `workflow:event-delivery:view` | 投递记录列表，支持 `subscriptionId` / `instanceId` / `status` 过滤 |
| GET | `/api/workflows/event-subscriptions/deliveries/:id` | `workflow:event-delivery:view` | 投递记录详情 |
| POST | `/api/workflows/event-subscriptions/deliveries/:id/retry` | `workflow:event-delivery:retry` | 重试单条投递 |
| POST | `/api/workflows/event-subscriptions/deliveries/batch-retry` | `workflow:event-delivery:retry` | 批量重试投递 |

## 管理 UI

前端位于「工作流 → 事件订阅」。列表支持维护订阅、启停、查看密钥，并通过侧边抽屉查看该订阅的投递记录与手动重试。
