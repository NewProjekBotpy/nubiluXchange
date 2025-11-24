CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"transaction_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"is_verified" boolean DEFAULT false,
	"is_public" boolean DEFAULT true,
	"moderation_status" text DEFAULT 'approved',
	"moderated_by" integer,
	"moderated_at" timestamp,
	"moderation_notes" text,
	"helpful_votes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_seller_id_idx" ON "reviews" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "reviews_buyer_id_idx" ON "reviews" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "reviews_rating_created_at_idx" ON "reviews" USING btree ("rating","created_at");--> statement-breakpoint
CREATE INDEX "reviews_moderation_status_idx" ON "reviews" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "reviews_product_moderation_public_idx" ON "reviews" USING btree ("product_id","moderation_status","is_public","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_buyer_product_review" ON "reviews" USING btree ("buyer_id","product_id");