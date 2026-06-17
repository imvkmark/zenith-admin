CREATE TYPE "public"."coupon_template_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('amount', 'percent');--> statement-breakpoint
CREATE TYPE "public"."coupon_valid_type" AS ENUM('fixed', 'relative');--> statement-breakpoint
CREATE TYPE "public"."member_coupon_status" AS ENUM('unused', 'used', 'expired', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'banned');--> statement-breakpoint
CREATE TYPE "public"."point_tx_type" AS ENUM('earn', 'redeem', 'expire', 'adjust', 'refund');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('recharge', 'consume', 'refund', 'adjust');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"type" "coupon_type" NOT NULL,
	"face_value" integer NOT NULL,
	"threshold" integer DEFAULT 0 NOT NULL,
	"max_discount" integer,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"issued_quantity" integer DEFAULT 0 NOT NULL,
	"per_limit" integer DEFAULT 1 NOT NULL,
	"valid_type" "coupon_valid_type" DEFAULT 'fixed' NOT NULL,
	"valid_start" timestamp with time zone,
	"valid_end" timestamp with time zone,
	"valid_days" integer,
	"status" "coupon_template_status" DEFAULT 'draft' NOT NULL,
	"description" varchar(256),
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"code" varchar(32) NOT NULL,
	"status" "member_coupon_status" DEFAULT 'unused' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"biz_type" varchar(64),
	"biz_id" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "member_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(32) NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"growth_threshold" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 100 NOT NULL,
	"icon" varchar(256),
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" varchar(256),
	"sort" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_levels_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "member_point_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"frozen" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"type" "point_tx_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"biz_type" varchar(64),
	"biz_id" varchar(128),
	"remark" varchar(256),
	"operator_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"biz_type" varchar(64),
	"biz_id" varchar(128),
	"payment_order_id" integer,
	"remark" varchar(256),
	"operator_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"frozen" integer DEFAULT 0 NOT NULL,
	"total_recharge" integer DEFAULT 0 NOT NULL,
	"total_consume" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(32),
	"phone" varchar(20),
	"email" varchar(128),
	"password" varchar(128),
	"nickname" varchar(32) NOT NULL,
	"avatar" varchar(256),
	"gender" varchar(20),
	"birthday" varchar(20),
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"level_id" integer,
	"growth_value" integer DEFAULT 0 NOT NULL,
	"register_source" varchar(32) DEFAULT 'web' NOT NULL,
	"register_ip" varchar(64),
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(64),
	"remark" varchar(256),
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coupons" ADD CONSTRAINT "member_coupons_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_coupons" ADD CONSTRAINT "member_coupons_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_levels" ADD CONSTRAINT "member_levels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_levels" ADD CONSTRAINT "member_levels_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_point_accounts" ADD CONSTRAINT "member_point_accounts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_point_transactions" ADD CONSTRAINT "member_point_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_point_transactions" ADD CONSTRAINT "member_point_transactions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallet_transactions" ADD CONSTRAINT "member_wallet_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallet_transactions" ADD CONSTRAINT "member_wallet_transactions_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallet_transactions" ADD CONSTRAINT "member_wallet_transactions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_level_id_member_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."member_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupons_status_idx" ON "coupons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_coupons_member_idx" ON "member_coupons" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_coupons_coupon_idx" ON "member_coupons" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "member_coupons_status_idx" ON "member_coupons" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "member_point_accounts_member_unique" ON "member_point_accounts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_point_tx_member_idx" ON "member_point_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_point_tx_biz_idx" ON "member_point_transactions" USING btree ("biz_type","biz_id");--> statement-breakpoint
CREATE INDEX "member_wallet_tx_member_idx" ON "member_wallet_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_wallet_tx_biz_idx" ON "member_wallet_transactions" USING btree ("biz_type","biz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_wallets_member_unique" ON "member_wallets" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_phone_unique" ON "members" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "members_username_unique" ON "members" USING btree ("username");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");