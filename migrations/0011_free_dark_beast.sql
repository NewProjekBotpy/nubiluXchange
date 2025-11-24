CREATE TABLE "message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"alert_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "backup_codes" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_fallback_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_fallback_number" text;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_message_reaction" ON "message_reactions" USING btree ("user_id","message_id");--> statement-breakpoint
CREATE INDEX "message_reactions_message_idx" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_reactions_user_idx" ON "message_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_reactions_emoji_idx" ON "message_reactions" USING btree ("emoji");--> statement-breakpoint
CREATE INDEX "message_reactions_message_emoji_idx" ON "message_reactions" USING btree ("message_id","emoji");--> statement-breakpoint
CREATE INDEX "sms_logs_phone_number_idx" ON "sms_logs" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "sms_logs_status_idx" ON "sms_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sms_logs_alert_type_idx" ON "sms_logs" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "sms_logs_created_at_idx" ON "sms_logs" USING btree ("created_at");