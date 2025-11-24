CREATE TABLE "admin_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"admin_id" integer,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'success',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"target_id" integer,
	"value" text NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "admin_otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"purpose" text DEFAULT 'admin_access' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ewallet_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"account_id" text,
	"account_name" text,
	"phone_number" text,
	"balance" numeric(15, 2) DEFAULT '0',
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "money_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service_type" text NOT NULL,
	"product_name" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"target_number" text,
	"game_data" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_number" text NOT NULL,
	"provider_order_id" text,
	"completed_at" timestamp,
	"failed_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "service_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_blacklist" ADD CONSTRAINT "admin_blacklist_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_configs" ADD CONSTRAINT "admin_configs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_otp_codes" ADD CONSTRAINT "admin_otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_rules" ADD CONSTRAINT "admin_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_rules" ADD CONSTRAINT "admin_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_templates" ADD CONSTRAINT "admin_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_templates" ADD CONSTRAINT "admin_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ewallet_connections" ADD CONSTRAINT "ewallet_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_requests" ADD CONSTRAINT "money_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_requests" ADD CONSTRAINT "money_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_action_category_idx" ON "admin_activity_logs" USING btree ("action","category");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "admin_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_admin_id_idx" ON "admin_activity_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "admin_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "blacklist_type_value_idx" ON "admin_blacklist" USING btree ("type","value");--> statement-breakpoint
CREATE INDEX "otp_user_purpose_idx" ON "admin_otp_codes" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "ewallet_connections_user_provider_idx" ON "ewallet_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "unique_user_provider_ewallet" ON "ewallet_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "money_requests_sender_idx" ON "money_requests" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "money_requests_receiver_idx" ON "money_requests" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "money_requests_status_idx" ON "money_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_orders_user_service_idx" ON "service_orders" USING btree ("user_id","service_type");--> statement-breakpoint
CREATE INDEX "service_orders_status_idx" ON "service_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_orders_order_number_idx" ON "service_orders" USING btree ("order_number");