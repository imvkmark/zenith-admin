CREATE TYPE "public"."workflow_approve_method" AS ENUM('and', 'or', 'sequential');--> statement-breakpoint
ALTER TYPE "public"."workflow_task_status" ADD VALUE 'waiting';--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "task_order" integer;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "approve_method" "workflow_approve_method";