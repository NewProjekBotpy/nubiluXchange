-- Add pending TOTP fields for 2FA setup flow
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_totp_secret" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_totp_expiry" timestamp;
