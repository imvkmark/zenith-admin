CREATE TYPE "public"."workflow_form_type" AS ENUM('designer', 'custom');--> statement-breakpoint
ALTER TABLE "workflow_definition_versions" ADD COLUMN "form_type" "workflow_form_type" DEFAULT 'designer' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_definition_versions" ADD COLUMN "custom_form" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD COLUMN "form_type" "workflow_form_type" DEFAULT 'designer' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD COLUMN "custom_form" jsonb;