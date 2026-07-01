ALTER TYPE "public"."workflow_job_type" ADD VALUE 'compensation_action';--> statement-breakpoint
CREATE TABLE "workflow_compensation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"compensation_id" integer NOT NULL,
	"action" varchar(16) NOT NULL,
	"note" text,
	"attachments" jsonb,
	"operator_id" integer,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_compensations" ADD COLUMN "compensation_action_status" varchar(16) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_compensations" ADD COLUMN "failed_node_key" varchar(64);--> statement-breakpoint
ALTER TABLE "workflow_compensations" ADD COLUMN "action_payload" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_compensation_logs" ADD CONSTRAINT "workflow_compensation_logs_compensation_id_workflow_compensations_id_fk" FOREIGN KEY ("compensation_id") REFERENCES "public"."workflow_compensations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_compensation_logs" ADD CONSTRAINT "workflow_compensation_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_compensation_logs" ADD CONSTRAINT "workflow_compensation_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wf_compensation_log_cid_idx" ON "workflow_compensation_logs" USING btree ("compensation_id");