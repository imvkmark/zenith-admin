CREATE TYPE "public"."analytics_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'bot', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."analytics_event_status" AS ENUM('active', 'deprecated', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."error_alert_condition" AS ENUM('new_error', 'threshold', 'spike');--> statement-breakpoint
CREATE TYPE "public"."error_level" AS ENUM('fatal', 'error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."error_status" AS ENUM('unresolved', 'resolved', 'ignored', 'muted');--> statement-breakpoint
ALTER TYPE "public"."frontend_error_type" ADD VALUE 'http_error';--> statement-breakpoint
ALTER TYPE "public"."frontend_error_type" ADD VALUE 'white_screen';--> statement-breakpoint
ALTER TYPE "public"."frontend_error_type" ADD VALUE 'crash';--> statement-breakpoint
ALTER TYPE "public"."user_behavior_event_type" ADD VALUE 'custom';--> statement-breakpoint
ALTER TYPE "public"."user_behavior_event_type" ADD VALUE 'perf';--> statement-breakpoint
ALTER TYPE "public"."user_behavior_event_type" ADD VALUE 'api_request';--> statement-breakpoint
ALTER TYPE "public"."user_behavior_event_type" ADD VALUE 'identify';--> statement-breakpoint
CREATE TABLE "analytics_daily_rollup" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer DEFAULT 0 NOT NULL,
	"stat_date" date NOT NULL,
	"metric" varchar(32) NOT NULL,
	"dim_type" varchar(32) DEFAULT 'overall' NOT NULL,
	"dim_value" varchar(256) DEFAULT '' NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_event_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"event_name" varchar(128) NOT NULL,
	"display_name" varchar(128),
	"category" varchar(64),
	"description" text,
	"property_schema" jsonb,
	"status" "analytics_event_status" DEFAULT 'active' NOT NULL,
	"event_count" bigint DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"session_id" varchar(36) NOT NULL,
	"distinct_id" varchar(64),
	"user_id" integer,
	"username" varchar(64),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"entry_page" varchar(256),
	"exit_page" varchar(256),
	"referrer" varchar(512),
	"utm_source" varchar(128),
	"browser" varchar(48),
	"os" varchar(48),
	"device_type" "analytics_device_type",
	"country" varchar(64),
	"region" varchar(64),
	"is_bounce" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"sample_rate" real DEFAULT 1 NOT NULL,
	"track_pageviews" boolean DEFAULT true NOT NULL,
	"track_clicks" boolean DEFAULT true NOT NULL,
	"track_performance" boolean DEFAULT true NOT NULL,
	"track_errors" boolean DEFAULT true NOT NULL,
	"track_api" boolean DEFAULT true NOT NULL,
	"mask_inputs" boolean DEFAULT true NOT NULL,
	"respect_dnt" boolean DEFAULT false NOT NULL,
	"blacklist_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retention_days" integer DEFAULT 180 NOT NULL,
	"error_retention_days" integer DEFAULT 90 NOT NULL,
	"session_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"error_type" "frontend_error_type",
	"level" "error_level",
	"condition" "error_alert_condition" DEFAULT 'threshold' NOT NULL,
	"threshold_count" integer DEFAULT 10 NOT NULL,
	"window_minutes" integer DEFAULT 60 NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"webhook_url" varchar(512),
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"group_id" integer NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"error_type" "frontend_error_type" NOT NULL,
	"level" "error_level" DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"source_url" varchar(512),
	"line_no" integer,
	"col_no" integer,
	"page_url" varchar(512),
	"release" varchar(64),
	"user_agent" varchar(512),
	"browser" varchar(48),
	"browser_version" varchar(32),
	"os" varchar(48),
	"device_type" "analytics_device_type",
	"user_id" integer,
	"username" varchar(64),
	"session_id" varchar(36),
	"breadcrumbs" jsonb,
	"context" jsonb,
	"http_status" integer,
	"http_method" varchar(16),
	"http_url" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"fingerprint" varchar(64) NOT NULL,
	"error_type" "frontend_error_type" NOT NULL,
	"level" "error_level" DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"status" "error_status" DEFAULT 'unresolved' NOT NULL,
	"assignee_id" integer,
	"assignee_name" varchar(64),
	"release" varchar(64),
	"note" text,
	"count" bigint DEFAULT 0 NOT NULL,
	"affected_users" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"release" varchar(64) NOT NULL,
	"file_name" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "distinct_id" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "anonymous_id" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "event_name" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "scroll_depth" smallint;--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "properties" jsonb;--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "referrer" varchar(512);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "utm_source" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "utm_medium" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "utm_campaign" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "utm_term" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "utm_content" varchar(128);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "browser" varchar(48);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "browser_version" varchar(32);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "os" varchar(48);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "os_version" varchar(32);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "device_type" "analytics_device_type";--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "screen_w" integer;--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "screen_h" integer;--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "language" varchar(16);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "user_agent" varchar(512);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "ip" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "country" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "region" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "city" varchar(64);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "metric_name" varchar(32);--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "metric_value" real;--> statement-breakpoint
ALTER TABLE "analytics_event_meta" ADD CONSTRAINT "analytics_event_meta_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_event_meta" ADD CONSTRAINT "analytics_event_meta_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_settings" ADD CONSTRAINT "analytics_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_settings" ADD CONSTRAINT "analytics_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_alert_rules" ADD CONSTRAINT "error_alert_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_alert_rules" ADD CONSTRAINT "error_alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_alert_rules" ADD CONSTRAINT "error_alert_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_events" ADD CONSTRAINT "error_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_events" ADD CONSTRAINT "error_events_group_id_error_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."error_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_groups" ADD CONSTRAINT "error_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_groups" ADD CONSTRAINT "error_groups_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_groups" ADD CONSTRAINT "error_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_groups" ADD CONSTRAINT "error_groups_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_maps" ADD CONSTRAINT "source_maps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_maps" ADD CONSTRAINT "source_maps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_maps" ADD CONSTRAINT "source_maps_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_rollup_uq" ON "analytics_daily_rollup" USING btree ("tenant_id","stat_date","metric","dim_type","dim_value");--> statement-breakpoint
CREATE INDEX "analytics_rollup_date_idx" ON "analytics_daily_rollup" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "analytics_rollup_metric_idx" ON "analytics_daily_rollup" USING btree ("metric");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_event_meta_name_uq" ON "analytics_event_meta" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "analytics_event_meta_status_idx" ON "analytics_event_meta" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_sessions_sid_uq" ON "analytics_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_sessions_started_idx" ON "analytics_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "analytics_sessions_user_idx" ON "analytics_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_sessions_tenant_idx" ON "analytics_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "analytics_settings_tenant_idx" ON "analytics_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "error_alert_rules_tenant_idx" ON "error_alert_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "error_events_group_idx" ON "error_events" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "error_events_created_idx" ON "error_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_events_user_idx" ON "error_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_events_tenant_idx" ON "error_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "error_groups_fingerprint_uq" ON "error_groups" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "error_groups_status_idx" ON "error_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "error_groups_type_idx" ON "error_groups" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "error_groups_last_seen_idx" ON "error_groups" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "error_groups_tenant_idx" ON "error_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "error_groups_assignee_idx" ON "error_groups" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "source_maps_release_idx" ON "source_maps" USING btree ("release","file_name");--> statement-breakpoint
CREATE INDEX "source_maps_tenant_idx" ON "source_maps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_events_created_idx" ON "user_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_events_type_idx" ON "user_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "user_events_name_idx" ON "user_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "user_events_page_idx" ON "user_events" USING btree ("page_path");--> statement-breakpoint
CREATE INDEX "user_events_user_idx" ON "user_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_events_session_idx" ON "user_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_events_tenant_idx" ON "user_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_events_distinct_idx" ON "user_events" USING btree ("distinct_id");