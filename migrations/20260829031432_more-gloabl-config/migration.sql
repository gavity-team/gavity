ALTER TABLE "global_config" ADD COLUMN "allowed_user_email_regex" text;--> statement-breakpoint
ALTER TABLE "global_config" ADD COLUMN "default_email_sender" text;--> statement-breakpoint
ALTER TABLE "global_config" ADD COLUMN "verification_email_sender" text;--> statement-breakpoint
ALTER TABLE "global_config" DROP COLUMN "app_url";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" DROP DEFAULT;