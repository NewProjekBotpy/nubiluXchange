-- Add stickers and text overlays columns to status_updates table
ALTER TABLE "status_updates" ADD COLUMN "stickers" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "status_updates" ADD COLUMN "text_overlays" jsonb DEFAULT '[]'::jsonb;
