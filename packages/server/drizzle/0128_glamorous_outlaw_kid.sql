CREATE TYPE "public"."payment_ledger_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."payment_ledger_type" AS ENUM('payment', 'refund', 'fee', 'settlement', 'adjust');--> statement-breakpoint
CREATE TYPE "public"."payment_recon_result" AS ENUM('matched', 'local_only', 'channel_only', 'amount_diff', 'status_diff');--> statement-breakpoint
CREATE TYPE "public"."payment_recon_status" AS ENUM('pending', 'comparing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_refund_approval_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_webhook_delivery_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "payment_ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_no" varchar(64) NOT NULL,
	"direction" "payment_ledger_direction" NOT NULL,
	"type" "payment_ledger_type" NOT NULL,
	"amount" integer NOT NULL,
	"order_no" varchar(64),
	"refund_no" varchar(64),
	"channel" "payment_channel",
	"biz_type" varchar(64),
	"remark" varchar(256),
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_ledger_entries_entry_no_unique" UNIQUE("entry_no")
);
--> statement-breakpoint
CREATE TABLE "payment_recon_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_no" varchar(64) NOT NULL,
	"channel" "payment_channel" NOT NULL,
	"bill_date" varchar(10) NOT NULL,
	"status" "payment_recon_status" DEFAULT 'pending' NOT NULL,
	"local_count" integer DEFAULT 0 NOT NULL,
	"local_amount" integer DEFAULT 0 NOT NULL,
	"channel_count" integer DEFAULT 0 NOT NULL,
	"channel_amount" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"diff_count" integer DEFAULT 0 NOT NULL,
	"remark" varchar(256),
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_recon_batches_batch_no_unique" UNIQUE("batch_no")
);
--> statement-breakpoint
CREATE TABLE "payment_recon_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"order_no" varchar(64),
	"channel_trade_no" varchar(128),
	"local_amount" integer,
	"channel_amount" integer,
	"local_status" varchar(32),
	"channel_status" varchar(32),
	"result" "payment_recon_result" NOT NULL,
	"remark" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"order_no" varchar(64),
	"payload" text NOT NULL,
	"status" "payment_webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"http_status" integer,
	"response_body" varchar(1024),
	"last_error" varchar(512),
	"next_retry_at" timestamp with time zone,
	"tenant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"url" varchar(512) NOT NULL,
	"secret_encrypted" text,
	"biz_type" varchar(64),
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"remark" varchar(256),
	"tenant_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "approval_status" "payment_refund_approval_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "applied_by_id" integer;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "approver_id" integer;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD COLUMN "approval_remark" varchar(256);--> statement-breakpoint
ALTER TABLE "payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_recon_batches" ADD CONSTRAINT "payment_recon_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_recon_batches" ADD CONSTRAINT "payment_recon_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_recon_batches" ADD CONSTRAINT "payment_recon_batches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_recon_items" ADD CONSTRAINT "payment_recon_items_batch_id_payment_recon_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payment_recon_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_deliveries" ADD CONSTRAINT "payment_webhook_deliveries_endpoint_id_payment_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."payment_webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_deliveries" ADD CONSTRAINT "payment_webhook_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_endpoints" ADD CONSTRAINT "payment_webhook_endpoints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_endpoints" ADD CONSTRAINT "payment_webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_endpoints" ADD CONSTRAINT "payment_webhook_endpoints_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_ledger_order_idx" ON "payment_ledger_entries" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "payment_ledger_type_idx" ON "payment_ledger_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payment_recon_batches_date_idx" ON "payment_recon_batches" USING btree ("bill_date");--> statement-breakpoint
CREATE INDEX "payment_recon_items_batch_idx" ON "payment_recon_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_deliveries_endpoint_idx" ON "payment_webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_deliveries_status_idx" ON "payment_webhook_deliveries" USING btree ("status");--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_applied_by_id_users_id_fk" FOREIGN KEY ("applied_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;