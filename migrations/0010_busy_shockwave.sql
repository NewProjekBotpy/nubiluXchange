CREATE TABLE "security_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"user_id" integer,
	"ip_address" text,
	"user_agent" text,
	"description" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"detected_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_id" integer NOT NULL,
	"viewer_id" integer NOT NULL,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mimetype" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" integer NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"documents_required" text[] DEFAULT '{}' NOT NULL,
	"documents_uploaded" text[] DEFAULT '{}' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"verification_score" integer DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_views" ADD CONSTRAINT "status_views_status_id_status_updates_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_views" ADD CONSTRAINT "status_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_sessions" ADD CONSTRAINT "verification_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_alerts_type_status_idx" ON "security_alerts" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "security_alerts_user_id_idx" ON "security_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_alerts_severity_idx" ON "security_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_alerts_detected_at_idx" ON "security_alerts" USING btree ("detected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_status_viewer" ON "status_views" USING btree ("status_id","viewer_id");--> statement-breakpoint
CREATE INDEX "status_views_status_id_idx" ON "status_views" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "status_views_viewer_id_idx" ON "status_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "status_views_viewed_at_idx" ON "status_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "uploaded_files_uploaded_by_idx" ON "uploaded_files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "uploaded_files_category_idx" ON "uploaded_files" USING btree ("category");--> statement-breakpoint
CREATE INDEX "uploaded_files_created_at_idx" ON "uploaded_files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verification_sessions_user_status_idx" ON "verification_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "verification_sessions_type_idx" ON "verification_sessions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "verification_sessions_risk_level_idx" ON "verification_sessions" USING btree ("risk_level");