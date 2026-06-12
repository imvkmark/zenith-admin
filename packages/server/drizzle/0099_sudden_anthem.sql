CREATE TABLE "terminal_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) DEFAULT '' NOT NULL,
	"user_id" integer NOT NULL,
	"tenant_id" integer,
	"shell" varchar(64),
	"cols" integer DEFAULT 80 NOT NULL,
	"rows" integer DEFAULT 24 NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terminal_recordings" ADD CONSTRAINT "terminal_recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminal_recordings" ADD CONSTRAINT "terminal_recordings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;