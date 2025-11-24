CREATE TABLE "fraud_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"transaction_id" integer,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_factors" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_to" integer,
	"acknowledged_by" integer,
	"acknowledged_at" timestamp,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "season_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"registered_at" timestamp DEFAULT now(),
	"rank" integer,
	"score" numeric(15, 2) DEFAULT '0',
	"rewards" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "season_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"reward_type" text NOT NULL,
	"reward_value" jsonb NOT NULL,
	"criteria" jsonb NOT NULL,
	"max_claims" integer,
	"current_claims" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'regular' NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"rewards" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"banner_image" text,
	"categories" text[],
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"registration_fee" numeric(15, 2) DEFAULT '0',
	"prize_pool" numeric(15, 2) DEFAULT '0',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_alerts" ADD CONSTRAINT "fraud_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_rewards" ADD CONSTRAINT "season_rewards_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fraud_alerts_user_status_idx" ON "fraud_alerts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "fraud_alerts_severity_status_idx" ON "fraud_alerts" USING btree ("severity","status");--> statement-breakpoint
CREATE INDEX "fraud_alerts_type_status_idx" ON "fraud_alerts" USING btree ("alert_type","status");--> statement-breakpoint
CREATE INDEX "fraud_alerts_status_created_at_idx" ON "fraud_alerts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "fraud_alerts_assigned_to_idx" ON "fraud_alerts" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "fraud_alerts_transaction_id_idx" ON "fraud_alerts" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "fraud_alerts_risk_score_idx" ON "fraud_alerts" USING btree ("risk_score");--> statement-breakpoint
CREATE UNIQUE INDEX "season_participants_season_user_idx" ON "season_participants" USING btree ("season_id","user_id");--> statement-breakpoint
CREATE INDEX "season_participants_season_rank_idx" ON "season_participants" USING btree ("season_id","rank");--> statement-breakpoint
CREATE INDEX "season_rewards_season_active_idx" ON "season_rewards" USING btree ("season_id","is_active");--> statement-breakpoint
CREATE INDEX "seasons_status_start_date_idx" ON "seasons" USING btree ("status","start_date");--> statement-breakpoint
CREATE INDEX "seasons_type_status_idx" ON "seasons" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "seasons_created_by_idx" ON "seasons" USING btree ("created_by");