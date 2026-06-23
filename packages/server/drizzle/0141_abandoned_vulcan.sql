CREATE TYPE "public"."mp_fan_subscribe" AS ENUM('subscribed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "mp_fans" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"openid" varchar(64) NOT NULL,
	"nickname" varchar(128),
	"avatar" varchar(512),
	"sex" smallint DEFAULT 0 NOT NULL,
	"country" varchar(64),
	"province" varchar(64),
	"city" varchar(64),
	"language" varchar(16),
	"subscribe" "mp_fan_subscribe" DEFAULT 'subscribed' NOT NULL,
	"subscribe_time" timestamp with time zone,
	"remark" varchar(128),
	"tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"wechat_tag_id" integer,
	"name" varchar(30) NOT NULL,
	"fans_count" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_fans" ADD CONSTRAINT "mp_fans_account_id_mp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_fans" ADD CONSTRAINT "mp_fans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_fans" ADD CONSTRAINT "mp_fans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_fans" ADD CONSTRAINT "mp_fans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_tags" ADD CONSTRAINT "mp_tags_account_id_mp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_tags" ADD CONSTRAINT "mp_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_tags" ADD CONSTRAINT "mp_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_tags" ADD CONSTRAINT "mp_tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mp_fans_account_openid_uq" ON "mp_fans" USING btree ("account_id","openid");--> statement-breakpoint
CREATE INDEX "mp_fans_account_idx" ON "mp_fans" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_tags_account_name_uq" ON "mp_tags" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "mp_tags_account_idx" ON "mp_tags" USING btree ("account_id");