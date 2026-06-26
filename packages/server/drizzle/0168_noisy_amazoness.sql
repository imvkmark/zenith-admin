CREATE TABLE "report_dashboard_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"remark" varchar(256),
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_dashboard_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "report_dashboard_favorites" (
	"user_id" integer NOT NULL,
	"dashboard_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_dashboard_favorites_user_id_dashboard_id_pk" PRIMARY KEY("user_id","dashboard_id")
);
--> statement-breakpoint
CREATE TABLE "report_dashboard_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"dashboard_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"password_hash" varchar(100),
	"enabled" boolean DEFAULT true NOT NULL,
	"expire_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_dashboard_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "report_dashboard_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dashboard_id" integer NOT NULL,
	"cron" varchar(64) NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recipients" varchar(512),
	"enabled" boolean DEFAULT true NOT NULL,
	"remark" varchar(256),
	"last_run_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_dashboard_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dashboard_id" integer NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"remark" varchar(256),
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_dashboards" ADD COLUMN "filters" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report_dashboards" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report_dashboards" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "report_datasets" ADD COLUMN "params" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report_dashboard_categories" ADD CONSTRAINT "report_dashboard_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_categories" ADD CONSTRAINT "report_dashboard_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_favorites" ADD CONSTRAINT "report_dashboard_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_favorites" ADD CONSTRAINT "report_dashboard_favorites_dashboard_id_report_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."report_dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_shares" ADD CONSTRAINT "report_dashboard_shares_dashboard_id_report_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."report_dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_shares" ADD CONSTRAINT "report_dashboard_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_shares" ADD CONSTRAINT "report_dashboard_shares_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_subscriptions" ADD CONSTRAINT "report_dashboard_subscriptions_dashboard_id_report_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."report_dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_subscriptions" ADD CONSTRAINT "report_dashboard_subscriptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_subscriptions" ADD CONSTRAINT "report_dashboard_subscriptions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_versions" ADD CONSTRAINT "report_dashboard_versions_dashboard_id_report_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."report_dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_versions" ADD CONSTRAINT "report_dashboard_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_dashboard_versions" ADD CONSTRAINT "report_dashboard_versions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_dashboard_versions_dash_ver_uq" ON "report_dashboard_versions" USING btree ("dashboard_id","version");--> statement-breakpoint
ALTER TABLE "report_dashboards" ADD CONSTRAINT "report_dashboards_category_id_report_dashboard_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."report_dashboard_categories"("id") ON DELETE set null ON UPDATE no action;