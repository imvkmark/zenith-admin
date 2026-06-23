CREATE TYPE "public"."mp_auto_reply_match" AS ENUM('exact', 'contain');--> statement-breakpoint
CREATE TYPE "public"."mp_auto_reply_type" AS ENUM('subscribe', 'keyword', 'default');--> statement-breakpoint
CREATE TYPE "public"."mp_menu_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."mp_reply_content_type" AS ENUM('text', 'image');--> statement-breakpoint
CREATE TABLE "mp_auto_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"reply_type" "mp_auto_reply_type" NOT NULL,
	"keyword" varchar(64),
	"match_type" "mp_auto_reply_match" DEFAULT 'contain' NOT NULL,
	"content_type" "mp_reply_content_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"media_id" varchar(128),
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"buttons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "mp_menu_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mp_menus_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "mp_auto_replies" ADD CONSTRAINT "mp_auto_replies_account_id_mp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_auto_replies" ADD CONSTRAINT "mp_auto_replies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_auto_replies" ADD CONSTRAINT "mp_auto_replies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_auto_replies" ADD CONSTRAINT "mp_auto_replies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_menus" ADD CONSTRAINT "mp_menus_account_id_mp_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_menus" ADD CONSTRAINT "mp_menus_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_menus" ADD CONSTRAINT "mp_menus_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_menus" ADD CONSTRAINT "mp_menus_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_auto_replies_account_type_idx" ON "mp_auto_replies" USING btree ("account_id","reply_type");