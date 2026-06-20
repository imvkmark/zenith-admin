# 节点类型与节点标识

## 设计器节点类型清单

`FlowNodeType` 联合（定义于 `packages/web/src/pages/workflow/designer/types.ts`）：

| 类型 | 含义 |
| --- | --- |
| `initiator` | 发起人节点（流程入口） |
| `approver` | 审批人节点 |
| `handler` | 办理人节点（任务执行型） |
| `cc` | 抄送节点 |
| `delay` | 延迟器节点 |
| `trigger` | 触发器节点（详见 [触发器节点](./trigger-nodes.md)） |
| `subProcess` | 子流程节点 |
| `conditionBranch` | 条件分支（互斥单走） |
| `parallelBranch` | 并行分支（全部走） |
| `inclusiveBranch` | 包容分支（满足条件的全部走） |
| `routeBranch` | 路由分支（按表达式路由） |

分支节点子集 `BranchNodeType`：`conditionBranch | parallelBranch | inclusiveBranch | routeBranch`。

## 运行态节点类型映射

流程保存后会转换为后端引擎使用的节点类型（定义于 `@zenith/shared`）：

| 设计器类型 | 运行态类型 | 说明 |
| --- | --- | --- |
| `initiator` | `start` | 流程起点 |
| `approver` | `approve` | 审批人节点 |
| `handler` | `handler` | 办理人节点 |
| `cc` | `ccNode` | 抄送节点 |
| `conditionBranch` | `exclusiveGateway` | 条件分支，互斥命中一条分支 |
| `parallelBranch` | `parallelGateway` | 并行分支，所有分支并行执行 |
| `inclusiveBranch` | `inclusiveGateway` | 包容分支，满足条件的分支并行执行 |
| `routeBranch` | `routeGateway` | 路由分支，按表达式选择分支 |
| `delay` | `delay` | 延迟器节点 |
| `trigger` | `trigger` | 触发器节点 |
| `subProcess` | `subProcess` | 子流程节点 |
| — | `end` | 引擎内部的流程结束节点 |
| — | `catchNode` | 引擎支持的异常捕获节点，不在设计器加号面板中直接添加 |

## 节点标识（nodeKey）

每个节点除了系统生成的 `id` 外，还可以设置一个可读的 `key` 字段，用于：

- 在事件订阅的接收方代码中按节点过滤；
- 在 `WorkflowNodeConfig.rejectToNodeKey` 中作为驳回目标的稳定引用；
- 在 webhook payload 与外部审批回调中显示为 `nodeKey`。

约束（在设计器 `NodeConfigDrawer` 中校验）：

- 正则 `^[a-zA-Z][a-zA-Z0-9_]*$`，字母开头，仅字母/数字/下划线；
- 保留字 `start` / `end` 不允许；
- 同一流程内唯一；
- 留空时回退到节点 `id`（设计器 `treeToFlat` 中 `node.key || node.id`）。

> 设置后保存的流程定义中 `process` 字段会保留 `node.key`；事件 payload 的 `nodeKey` 字段会优先使用它。
