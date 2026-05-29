CREATE TABLE "oauth2_authorization_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"user_id" integer NOT NULL,
	"redirect_uri" text NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"code_challenge" varchar(256),
	"code_challenge_method" varchar(10),
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth2_authorization_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "oauth2_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"client_secret_hash" varchar(128),
	"client_secret_prefix" varchar(20),
	"name" varchar(100) NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"redirect_uris" text[] DEFAULT '{}' NOT NULL,
	"allowed_scopes" text[] DEFAULT '{}' NOT NULL,
	"grant_types" text[] DEFAULT '{}' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'enabled' NOT NULL,
	"owner_id" integer,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth2_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth2_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_type" varchar(20) NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"token_prefix" varchar(20),
	"client_id" varchar(64) NOT NULL,
	"user_id" integer,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth2_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "oauth2_user_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth2_user_grants_user_client_unique" UNIQUE("user_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "oauth2_authorization_codes" ADD CONSTRAINT "oauth2_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD CONSTRAINT "oauth2_clients_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD CONSTRAINT "oauth2_clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth2_clients" ADD CONSTRAINT "oauth2_clients_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth2_tokens" ADD CONSTRAINT "oauth2_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth2_user_grants" ADD CONSTRAINT "oauth2_user_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;