CREATE TABLE "workflow_simulation_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"definition_id" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"starter_user_id" integer,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_simulation_cases_name_uniq" UNIQUE("definition_id","name")
);
--> statement-breakpoint
ALTER TABLE "workflow_simulation_cases" ADD CONSTRAINT "workflow_simulation_cases_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_simulation_cases" ADD CONSTRAINT "workflow_simulation_cases_starter_user_id_users_id_fk" FOREIGN KEY ("starter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_simulation_cases" ADD CONSTRAINT "workflow_simulation_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_simulation_cases" ADD CONSTRAINT "workflow_simulation_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_simulation_cases" ADD CONSTRAINT "workflow_simulation_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;