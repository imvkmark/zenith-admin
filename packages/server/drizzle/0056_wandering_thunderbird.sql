CREATE TABLE "ip_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(64) NOT NULL,
	"path" varchar(256) NOT NULL,
	"method" varchar(16) NOT NULL,
	"block_type" varchar(16) NOT NULL,
	"user_agent" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
