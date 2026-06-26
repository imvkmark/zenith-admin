CREATE TYPE "public"."export_job_delete_reason" AS ENUM('expired', 'manual', 'file_missing');--> statement-breakpoint
CREATE TYPE "public"."export_job_execution_mode" AS ENUM('sync', 'async');--> statement-breakpoint
CREATE TYPE "public"."export_job_format" AS ENUM('xlsx', 'csv');--> statement-breakpoint
CREATE TYPE "public"."export_job_status" AS ENUM('pending', 'running', 'success', 'failed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "export_job_downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"downloaded_by" integer,
	"tenant_id" integer,
	"ip" varchar(64),
	"user_agent" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" varchar(64) NOT NULL,
	"module_name" varchar(64) NOT NULL,
	"format" "export_job_format" NOT NULL,
	"status" "export_job_status" DEFAULT 'pending' NOT NULL,
	"execution_mode" "export_job_execution_mode" DEFAULT 'async' NOT NULL,
	"query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"columns" jsonb,
	"row_count" integer,
	"file_id" uuid,
	"filename" varchar(256),
	"file_size" integer,
	"raw" boolean DEFAULT false NOT NULL,
	"masked" boolean DEFAULT true NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"watermark" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"expires_at" timestamp,
	"file_deleted_at" timestamp,
	"delete_reason" "export_job_delete_reason",
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_downloaded_at" timestamp,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "export_job_downloads" ADD CONSTRAINT "export_job_downloads_job_id_export_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."export_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_job_downloads" ADD CONSTRAINT "export_job_downloads_downloaded_by_users_id_fk" FOREIGN KEY ("downloaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_job_downloads" ADD CONSTRAINT "export_job_downloads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_file_id_managed_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."managed_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_job_downloads_job_idx" ON "export_job_downloads" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "export_job_downloads_downloaded_by_idx" ON "export_job_downloads" USING btree ("downloaded_by");--> statement-breakpoint
CREATE INDEX "export_jobs_entity_idx" ON "export_jobs" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "export_jobs_status_idx" ON "export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "export_jobs_created_by_idx" ON "export_jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "export_jobs_tenant_idx" ON "export_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "export_jobs_expires_at_idx" ON "export_jobs" USING btree ("expires_at");