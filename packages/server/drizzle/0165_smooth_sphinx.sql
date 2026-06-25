DROP INDEX "workflow_instances_biz_idx";--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "trigger_dispatch_status" "workflow_trigger_execution_status";--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "trigger_attempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "trigger_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "trigger_next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD COLUMN "trigger_last_error" text;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_instances_biz_key_uniq" ON "workflow_instances" USING btree ("biz_type","biz_id");