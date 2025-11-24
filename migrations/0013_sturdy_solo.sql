ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_rating" numeric(3, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "seller_review_count" integer DEFAULT 0;