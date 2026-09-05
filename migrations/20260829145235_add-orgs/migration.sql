CREATE TABLE "orgs" (
	"name" text NOT NULL,
	"avatar" text,
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_to_orgs" (
	"user_id" text,
	"org_id" text,
	"is_owner" boolean DEFAULT false NOT NULL,
	"id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_to_orgs_pkey" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_user_id_uidx" ON "orgs" ("user_id");--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;