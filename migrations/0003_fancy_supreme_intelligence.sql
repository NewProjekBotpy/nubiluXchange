CREATE TABLE "admin_verification_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"document_url" text NOT NULL,
	"document_name" text NOT NULL,
	"document_size" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"is_required" boolean DEFAULT true,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_monitoring" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"message_id" integer,
	"monitoring_type" text NOT NULL,
	"flagged_reason" text,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"ai_confidence" numeric(5, 2),
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"action_taken" text,
	"review_notes" text,
	"is_resolved" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_read_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"last_read_message_id" integer,
	"last_read_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author" text DEFAULT 'Admin' NOT NULL,
	"thumbnail" text,
	"is_pinned" boolean DEFAULT false,
	"is_published" boolean DEFAULT true,
	"category" text DEFAULT 'general',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "owner_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"is_system_critical" boolean DEFAULT false,
	"last_modified_by" integer NOT NULL,
	"validation_rule" jsonb DEFAULT '{}'::jsonb,
	"effective_from" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "owner_configs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "revenue_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_date" timestamp NOT NULL,
	"total_transactions" integer DEFAULT 0,
	"total_revenue" numeric(15, 2) DEFAULT '0',
	"total_commission" numeric(15, 2) DEFAULT '0',
	"escrow_fees" numeric(15, 2) DEFAULT '0',
	"payment_fees" numeric(15, 2) DEFAULT '0',
	"new_users" integer DEFAULT 0,
	"active_users" integer DEFAULT 0,
	"new_products" integer DEFAULT 0,
	"completed_escrows" integer DEFAULT 0,
	"disputed_transactions" integer DEFAULT 0,
	"avg_transaction_value" numeric(15, 2) DEFAULT '0',
	"top_category" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"generated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "admin_verification_documents" ADD CONSTRAINT "admin_verification_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_verification_documents" ADD CONSTRAINT "admin_verification_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_monitoring" ADD CONSTRAINT "chat_monitoring_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_monitoring" ADD CONSTRAINT "chat_monitoring_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_monitoring" ADD CONSTRAINT "chat_monitoring_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_tracking" ADD CONSTRAINT "chat_read_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_tracking" ADD CONSTRAINT "chat_read_tracking_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_read_tracking" ADD CONSTRAINT "chat_read_tracking_last_read_message_id_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_configs" ADD CONSTRAINT "owner_configs_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_docs_user_doctype_idx" ON "admin_verification_documents" USING btree ("user_id","document_type");--> statement-breakpoint
CREATE INDEX "admin_docs_status_idx" ON "admin_verification_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_docs_reviewed_by_idx" ON "admin_verification_documents" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "chat_monitoring_chat_risk_idx" ON "chat_monitoring" USING btree ("chat_id","risk_level");--> statement-breakpoint
CREATE INDEX "chat_monitoring_type_idx" ON "chat_monitoring" USING btree ("monitoring_type");--> statement-breakpoint
CREATE INDEX "chat_monitoring_reviewed_by_idx" ON "chat_monitoring" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "chat_monitoring_resolved_idx" ON "chat_monitoring" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "unique_user_chat_read_tracking" ON "chat_read_tracking" USING btree ("user_id","chat_id");--> statement-breakpoint
CREATE INDEX "chat_read_tracking_last_read_at_idx" ON "chat_read_tracking" USING btree ("last_read_at");--> statement-breakpoint
CREATE INDEX "news_published_created_at_idx" ON "news" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX "news_pinned_published_idx" ON "news" USING btree ("is_pinned","is_published");--> statement-breakpoint
CREATE INDEX "news_category_published_idx" ON "news" USING btree ("category","is_published");--> statement-breakpoint
CREATE INDEX "owner_configs_category_idx" ON "owner_configs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "owner_configs_effective_from_idx" ON "owner_configs" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "revenue_reports_date_idx" ON "revenue_reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "revenue_reports_generated_at_idx" ON "revenue_reports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "chats_buyer_status_idx" ON "chats" USING btree ("buyer_id","status");--> statement-breakpoint
CREATE INDEX "chats_seller_status_idx" ON "chats" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "chats_product_id_idx" ON "chats" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "chats_status_created_at_idx" ON "chats" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "messages_chat_created_at_idx" ON "messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_chat_idx" ON "messages" USING btree ("sender_id","chat_id");--> statement-breakpoint
CREATE INDEX "messages_status_chat_idx" ON "messages" USING btree ("status","chat_id");--> statement-breakpoint
CREATE INDEX "messages_type_created_at_idx" ON "messages" USING btree ("message_type","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_is_read_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_type_created_at_idx" ON "notifications" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "products_seller_status_idx" ON "products" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "products_category_status_idx" ON "products" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "products_status_created_at_idx" ON "products" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "products_premium_status_idx" ON "products" USING btree ("is_premium","status");--> statement-breakpoint
CREATE INDEX "transactions_buyer_status_idx" ON "transactions" USING btree ("buyer_id","status");--> statement-breakpoint
CREATE INDEX "transactions_seller_status_idx" ON "transactions" USING btree ("seller_id","status");--> statement-breakpoint
CREATE INDEX "transactions_payment_id_idx" ON "transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "transactions_status_created_at_idx" ON "transactions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "transactions_product_status_idx" ON "transactions" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "users_role_created_at_idx" ON "users" USING btree ("role","created_at");--> statement-breakpoint
CREATE INDEX "users_is_verified_role_idx" ON "users" USING btree ("is_verified","role");--> statement-breakpoint
CREATE INDEX "users_admin_status_idx" ON "users" USING btree ("is_admin_approved","admin_request_pending");--> statement-breakpoint
CREATE INDEX "wallet_transactions_user_type_status_idx" ON "wallet_transactions" USING btree ("user_id","type","status");--> statement-breakpoint
CREATE INDEX "wallet_transactions_status_created_at_idx" ON "wallet_transactions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_type_created_at_idx" ON "wallet_transactions" USING btree ("type","created_at");