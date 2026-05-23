-- Extend workflow_node_type with new node kinds used by the Feishu/DingTalk-style designer.
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'handler';
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'inclusiveGateway';
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'routeGateway';
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'delay';
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'trigger';
ALTER TYPE "public"."workflow_node_type" ADD VALUE IF NOT EXISTS 'subProcess';
