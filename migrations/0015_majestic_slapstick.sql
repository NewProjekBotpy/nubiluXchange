ALTER TABLE "status_updates" ADD COLUMN "stickers" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "text_overlays" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "trim_start" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "trim_end" numeric(10, 2);