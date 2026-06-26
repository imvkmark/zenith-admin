CREATE TABLE "api_scopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"scope_group" varchar(64) DEFAULT 'general' NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_scopes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "open_api_call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"app_name" varchar(100),
	"method" varchar(10) NOT NULL,
	"path" varchar(256) NOT NULL,
	"status_code" integer NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(256),
	"scope" varchar(128),
	"error_message" varchar(512),
	"request_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"qps_limit" integer DEFAULT 10 NOT NULL,
	"daily_quota" integer DEFAULT 0 NOT NULL,
	"monthly_quota" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rate_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD COLUMN "rate_plan_id" integer;--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD COLUMN "sign_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api_scopes" ADD CONSTRAINT "api_scopes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_scopes" ADD CONSTRAINT "api_scopes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "open_api_call_logs_client_idx" ON "open_api_call_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "open_api_call_logs_created_idx" ON "open_api_call_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "open_api_call_logs_path_idx" ON "open_api_call_logs" USING btree ("path");--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD CONSTRAINT "oauth2_clients_rate_plan_id_rate_plans_id_fk" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE set null ON UPDATE no action;