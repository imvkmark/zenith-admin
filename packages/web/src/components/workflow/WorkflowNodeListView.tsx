/**
 * 流程节点列表预览（线性化展示流程中所有节点）。
 */
import { List, Tag, Typography } from '@douyinfe/semi-ui';
import type { FlowNode, FlowProcess } from '@/pages/workflow/designer/types';
import { ADDABLE_NODE_TYPES } from '@/pages/workflow/designer/constants';

interface Props {
  flowData: { process?: unknown } | null | undefined;
}

interface FlatNode {
  node: FlowNode;
  level: number;
  branchName?: string;
}

function flatten(node: FlowNode | undefined, level: number, branchName: string | undefined, out: FlatNode[]): void {
  if (!node) return;
  out.push({ node, level, branchName });
  if (node.branches?.length) {
    for (const br of node.branches) {
      flatten(br.children, level + 1, br.name, out);
    }
  }
  if (node.children) {
    flatten(node.children, level, undefined, out);
  }
}

function getNodeMeta(type: FlowNode['type']) {
  return ADDABLE_NODE_TYPES.find(n => n.type === type);
}

export default function WorkflowNodeListView({ flowData }: Readonly<Props>) {
  const process = flowData?.process as FlowProcess | undefined;
  if (!process?.initiator) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
        无节点数据
      </div>
    );
  }
  const all: FlatNode[] = [];
  // initiator
  all.push({ node: process.initiator, level: 0 });
  flatten(process.initiator.children, 0, undefined, all);

  return (
    <List
      dataSource={all}
      renderItem={(item) => {
        const meta = getNodeMeta(item.node.type);
        const Icon = meta?.icon;
        return (
          <List.Item
            main={(
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: item.level * 16 }}>
                {Icon ? <Icon size={14} /> : null}
                <Typography.Text strong>{item.node.name || meta?.label || item.node.type}</Typography.Text>
                <Tag size="small" color="grey">{meta?.label ?? item.node.type}</Tag>
                {item.branchName ? <Tag size="small" color="blue">{item.branchName}</Tag> : null}
              </div>
            )}
          />
        );
      }}
    />
  );
}
