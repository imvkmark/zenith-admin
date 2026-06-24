ALTER TABLE "channel_auto_replies" ADD COLUMN "reply_type" "channel_message_type" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_auto_replies" ADD COLUMN "reply_extra" jsonb;--> statement-breakpoint
ALTER TABLE "channel_auto_replies" ADD COLUMN "hit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD COLUMN "retracted_at" timestamp with time zone;