CREATE TABLE "workflow_definition_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"definition_id" integer NOT NULL,
	"version" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"flow_data" jsonb,
	"form_fields" jsonb,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" integer,
	"tenant_id" integer,
	CONSTRAINT "workflow_def_versions_def_ver_uniq" UNIQUE("definition_id","version")
);
--> statement-breakpoint
ALTER TABLE "workflow_definition_versions" ADD CONSTRAINT "workflow_definition_versions_definition_id_workflow_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definition_versions" ADD CONSTRAINT "workflow_definition_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_definition_versions" ADD CONSTRAINT "workflow_definition_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;