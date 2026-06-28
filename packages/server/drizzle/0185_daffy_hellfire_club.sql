CREATE TYPE "public"."workflow_token_status" AS ENUM('active', 'consumed', 'dead');--> statement-breakpoint
CREATE TABLE "workflow_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"node_key" varchar(64) NOT NULL,
	"status" "workflow_token_status" DEFAULT 'active' NOT NULL,
	"branch_path" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parent_token_id" integer,
	"scope_key" varchar(128),
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"consumed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "workflow_tokens" ADD CONSTRAINT "workflow_tokens_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_tokens" ADD CONSTRAINT "workflow_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_tokens_instance_status_idx" ON "workflow_tokens" USING btree ("instance_id","status");--> statement-breakpoint
CREATE INDEX "workflow_tokens_parent_idx" ON "workflow_tokens" USING btree ("parent_token_id");