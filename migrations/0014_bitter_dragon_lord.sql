ALTER TABLE "status_updates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "duration" integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "background_color" text;