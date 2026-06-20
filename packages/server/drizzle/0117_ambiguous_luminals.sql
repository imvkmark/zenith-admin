CREATE TABLE "workflow_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"task_id" integer,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_delegations" (
	"id" serial PRIMARY KEY NOT NULL,
	"principal_id" integer NOT NULL,
	"delegate_id" integer NOT NULL,
	"definition_id" integer,
	"reason" varchar(255),
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_quick_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"content" varchar(255) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_serial_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"definition_id" integer NOT NULL,
	"period_key" varchar(16) NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "workflow_serial_counters_def_period_uniq" UNIQUE("definition_id","period_key")
);
--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD COLUMN "serial_no" varchar(64);--> statement-breakpoint
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_task_id_workflow_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."workflow_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_principal_id_users_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_quick_phrases" ADD CONSTRAINT "workflow_quick_phrases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_quick_phrases" ADD CONSTRAINT "workflow_quick_phrases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_serial_counters" ADD CONSTRAINT "workflow_serial_counters_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;