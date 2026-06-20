CREATE TYPE "public"."ai_feedback_status" AS ENUM('pending', 'resolved', 'ignored');--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "model" varchar(100);--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "feedback_reason" varchar(200);--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "feedback_status" "ai_feedback_status";--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "feedback_remark" varchar(500);--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "feedback_handled_at" timestamp;