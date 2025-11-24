CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'file', 'audio', 'video');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_type" SET DATA TYPE message_type USING "message_type"::message_type;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE message_status USING "status"::message_status;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "backup_codes" SET DEFAULT '{}';--> statement-breakpoint
UPDATE "users" SET "backup_codes" = '{}' WHERE "backup_codes" IS NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb;