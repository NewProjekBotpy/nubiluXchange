CREATE TABLE "video_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"content_type" text DEFAULT 'video' NOT NULL,
	"music_name" text,
	"music_url" text,
	"tags" text[] DEFAULT '{}',
	"category" text,
	"is_public" boolean DEFAULT true,
	"is_pinned" boolean DEFAULT false,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_content_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_content_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_content_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "status_updates" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "video_content" ADD CONSTRAINT "video_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_comments" ADD CONSTRAINT "video_content_comments_video_id_video_content_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_comments" ADD CONSTRAINT "video_content_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_likes" ADD CONSTRAINT "video_content_likes_video_id_video_content_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_likes" ADD CONSTRAINT "video_content_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_saves" ADD CONSTRAINT "video_content_saves_video_id_video_content_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_content_saves" ADD CONSTRAINT "video_content_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_content_user_id_idx" ON "video_content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_content_type_idx" ON "video_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "video_content_category_idx" ON "video_content" USING btree ("category");--> statement-breakpoint
CREATE INDEX "video_content_created_at_idx" ON "video_content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "video_content_public_pinned_idx" ON "video_content" USING btree ("is_public","is_pinned","created_at");--> statement-breakpoint
CREATE INDEX "video_content_comments_video_idx" ON "video_content_comments" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_content_comments_user_idx" ON "video_content_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_content_comments_video_created_at_idx" ON "video_content_comments" USING btree ("video_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_video_like" ON "video_content_likes" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "video_content_likes_video_idx" ON "video_content_likes" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_content_likes_user_idx" ON "video_content_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_content_likes_created_at_idx" ON "video_content_likes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_video_save" ON "video_content_saves" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "video_content_saves_video_idx" ON "video_content_saves" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_content_saves_user_idx" ON "video_content_saves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_content_saves_created_at_idx" ON "video_content_saves" USING btree ("created_at");