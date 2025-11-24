CREATE TABLE "video_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"status_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_status_id_status_updates_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_comments_status_id_idx" ON "video_comments" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "video_comments_user_id_idx" ON "video_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_comments_status_created_at_idx" ON "video_comments" USING btree ("status_id","created_at");