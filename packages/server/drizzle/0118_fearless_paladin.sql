CREATE TYPE "public"."monitor_alert_event_status" AS ENUM('firing', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."monitor_alert_level" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."monitor_alert_operator" AS ENUM('gt', 'gte', 'lt', 'lte');--> statement-breakpoint
CREATE TYPE "public"."monitor_alert_state" AS ENUM('ok', 'firing');--> statement-breakpoint
CREATE TYPE "public"."monitor_metric" AS ENUM('cpu', 'memory', 'disk', 'swap', 'load1', 'procCpu', 'heap', 'loopLag', 'qps', 'errorRate', 'netRxBps', 'netTxBps', 'diskReadBps', 'diskWriteBps');--> statement-breakpoint
CREATE TABLE "monitor_alert_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"rule_id" integer,
	"rule_name" varchar(128) NOT NULL,
	"metric" "monitor_metric" NOT NULL,
	"level" "monitor_alert_level" DEFAULT 'warning' NOT NULL,
	"operator" "monitor_alert_operator" NOT NULL,
	"threshold" real NOT NULL,
	"value" real NOT NULL,
	"status" "monitor_alert_event_status" DEFAULT 'firing' NOT NULL,
	"message" text NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "monitor_alert_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(128) NOT NULL,
	"metric" "monitor_metric" NOT NULL,
	"operator" "monitor_alert_operator" DEFAULT 'gt' NOT NULL,
	"threshold" real NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"level" "monitor_alert_level" DEFAULT 'warning' NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"webhook_url" varchar(512),
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"silence_minutes" integer DEFAULT 30 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"state" "monitor_alert_state" DEFAULT 'ok' NOT NULL,
	"breaching_since" timestamp with time zone,
	"last_triggered_at" timestamp with time zone,
	"last_value" real,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_metric_samples" (
	"id" serial PRIMARY KEY NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu" real DEFAULT 0 NOT NULL,
	"memory" real DEFAULT 0 NOT NULL,
	"disk" real DEFAULT 0 NOT NULL,
	"swap" real DEFAULT 0 NOT NULL,
	"load1" real DEFAULT 0 NOT NULL,
	"proc_cpu" real DEFAULT 0 NOT NULL,
	"heap" real DEFAULT 0 NOT NULL,
	"loop_lag" real DEFAULT 0 NOT NULL,
	"qps" real DEFAULT 0 NOT NULL,
	"error_rate" real DEFAULT 0 NOT NULL,
	"net_rx_bps" real DEFAULT 0 NOT NULL,
	"net_tx_bps" real DEFAULT 0 NOT NULL,
	"disk_read_bps" real DEFAULT 0 NOT NULL,
	"disk_write_bps" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitor_alert_events" ADD CONSTRAINT "monitor_alert_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_alert_events" ADD CONSTRAINT "monitor_alert_events_rule_id_monitor_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."monitor_alert_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_alert_rules" ADD CONSTRAINT "monitor_alert_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_alert_rules" ADD CONSTRAINT "monitor_alert_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_alert_rules" ADD CONSTRAINT "monitor_alert_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "monitor_alert_events_rule_idx" ON "monitor_alert_events" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "monitor_alert_events_status_idx" ON "monitor_alert_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "monitor_alert_events_triggered_idx" ON "monitor_alert_events" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "monitor_alert_events_tenant_idx" ON "monitor_alert_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "monitor_alert_rules_tenant_idx" ON "monitor_alert_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "monitor_alert_rules_enabled_idx" ON "monitor_alert_rules" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "system_metric_samples_at_idx" ON "system_metric_samples" USING btree ("sampled_at");