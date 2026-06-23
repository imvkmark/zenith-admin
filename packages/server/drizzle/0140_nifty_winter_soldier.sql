CREATE TYPE "public"."mp_account_type" AS ENUM('subscribe', 'service', 'test');--> statement-breakpoint
CREATE TYPE "public"."mp_encrypt_mode" AS ENUM('plaintext', 'compatible', 'safe');--> statement-breakpoint
CREATE TABLE "mp_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"account" varchar(100),
	"app_id" varchar(64) NOT NULL,
	"app_secret" varchar(128) DEFAULT '' NOT NULL,
	"token" varchar(64) DEFAULT '' NOT NULL,
	"encoding_aes_key" varchar(64),
	"encrypt_mode" "mp_encrypt_mode" DEFAULT 'plaintext' NOT NULL,
	"type" "mp_account_type" DEFAULT 'service' NOT NULL,
	"qr_code_url" varchar(500),
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"remark" text,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mp_accounts_app_id_unique" UNIQUE("app_id")
);
--> statement-breakpoint
ALTER TABLE "mp_accounts" ADD CONSTRAINT "mp_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_accounts" ADD CONSTRAINT "mp_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_accounts" ADD CONSTRAINT "mp_accounts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_accounts_tenant_idx" ON "mp_accounts" USING btree ("tenant_id");