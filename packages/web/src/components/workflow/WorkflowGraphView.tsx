/**
 * 流程图只读预览
 * 复用设计器的 FlowRenderer，强制 readOnly。
 */
import FlowRenderer from '@/pages/workflow/designer/components/FlowRenderer';
import type { FlowProcess } from '@/pages/workflow/designer/types';
import '@/pages/workflow/designer/styles/flow-designer.css';

interface Props {
  flowData: { process?: unknown } | null | undefined;
  height?: number | string;
}

export default function WorkflowGraphView({ flowData, height = 480 }: Readonly<Props>) {
  const process = flowData?.process as FlowProcess | undefined;
  if (!process?.initiator) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
        无流程图数据
      </div>
    );
  }
  return (
    <div
      style={{
        maxHeight: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto',
        padding: 16,
        background: 'var(--semi-color-fill-0)',
        borderRadius: 8,
      }}
    >
      <FlowRenderer process={process} readOnly />
    </div>
  );
}
