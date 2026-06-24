ALTER TABLE "mp_accounts" ADD COLUMN "auto_create_member" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mp_fans" ADD COLUMN "unionid" varchar(64);--> statement-breakpoint
ALTER TABLE "mp_fans" ADD COLUMN "member_id" integer;--> statement-breakpoint
ALTER TABLE "mp_fans" ADD CONSTRAINT "mp_fans_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_fans_member_idx" ON "mp_fans" USING btree ("member_id");