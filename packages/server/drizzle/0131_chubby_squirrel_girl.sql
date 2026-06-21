CREATE TYPE "public"."checkin_milestone_reward_type" AS ENUM('points', 'coupon');--> statement-breakpoint
CREATE TABLE "checkin_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(64) NOT NULL,
	"cumulative_days" integer NOT NULL,
	"reward_type" "checkin_milestone_reward_type" DEFAULT 'points' NOT NULL,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"coupon_id" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"remark" varchar(256),
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkin_milestones_cumulative_days_unique" UNIQUE("cumulative_days")
);
--> statement-breakpoint
CREATE TABLE "checkin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"makeup_enabled" boolean DEFAULT true NOT NULL,
	"makeup_cost_points" integer DEFAULT 20 NOT NULL,
	"makeup_max_days" integer DEFAULT 7 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_checkin_milestone_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"milestone_id" integer NOT NULL,
	"cumulative_days" integer NOT NULL,
	"reward_type" "checkin_milestone_reward_type" NOT NULL,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"coupon_id" integer,
	"member_coupon_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_checkin_milestone_awards_member_id_milestone_id_unique" UNIQUE("member_id","milestone_id")
);
--> statement-breakpoint
ALTER TABLE "member_checkins" ADD COLUMN "is_makeup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "checkin_milestones" ADD CONSTRAINT "checkin_milestones_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_milestones" ADD CONSTRAINT "checkin_milestones_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_milestones" ADD CONSTRAINT "checkin_milestones_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_settings" ADD CONSTRAINT "checkin_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_settings" ADD CONSTRAINT "checkin_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_checkin_milestone_awards" ADD CONSTRAINT "member_checkin_milestone_awards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_checkin_milestone_awards" ADD CONSTRAINT "member_checkin_milestone_awards_milestone_id_checkin_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."checkin_milestones"("id") ON DELETE cascade ON UPDATE no action;