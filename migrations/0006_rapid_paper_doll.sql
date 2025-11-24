CREATE TABLE "review_helpful_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer,
	"interaction_type" text NOT NULL,
	"interaction_value" text,
	"session_id" text,
	"device_type" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"preferred_categories" jsonb DEFAULT '[]'::jsonb,
	"price_range" jsonb,
	"excluded_sellers" jsonb DEFAULT '[]'::jsonb,
	"content_filters" jsonb DEFAULT '{}'::jsonb,
	"notification_settings" jsonb DEFAULT '{}'::jsonb,
	"fyp_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"reported_user_id" integer,
	"reported_product_id" integer,
	"report_type" text NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"game_data" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"action_taken" text,
	"admin_notes" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_product_id_products_id_fk" FOREIGN KEY ("reported_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_review_vote" ON "review_helpful_votes" USING btree ("user_id","review_id");--> statement-breakpoint
CREATE INDEX "review_helpful_votes_review_idx" ON "review_helpful_votes" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_helpful_votes_user_idx" ON "review_helpful_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_interactions_user_type_idx" ON "user_interactions" USING btree ("user_id","interaction_type");--> statement-breakpoint
CREATE INDEX "user_interactions_product_type_idx" ON "user_interactions" USING btree ("product_id","interaction_type");--> statement-breakpoint
CREATE INDEX "user_interactions_created_at_idx" ON "user_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_interactions_session_idx" ON "user_interactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_reports_reporter_idx" ON "user_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "user_reports_reported_user_idx" ON "user_reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "user_reports_reported_product_idx" ON "user_reports" USING btree ("reported_product_id");--> statement-breakpoint
CREATE INDEX "user_reports_status_priority_idx" ON "user_reports" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "user_reports_type_status_idx" ON "user_reports" USING btree ("report_type","status");--> statement-breakpoint
CREATE INDEX "user_reports_created_at_idx" ON "user_reports" USING btree ("created_at");