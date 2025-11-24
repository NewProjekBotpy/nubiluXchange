import { pgTable, pgEnum, text, serial, integer, boolean, timestamp, jsonb, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // user, admin, owner
  profilePicture: text("profile_picture"),
  bannerImage: text("banner_image"),
  displayName: text("display_name"),
  bio: text("bio"),
  phoneNumber: text("phone_number"), // Phone number for SMS alerts
  avatarAuraColor: text("avatar_aura_color").default("purple"), // purple, green, blue, orange, red, pink, cyan, gold
  avatarBorderStyle: text("avatar_border_style").default("energy"), // energy, geometric, neon, crystal
  walletBalance: decimal("wallet_balance", { precision: 15, scale: 2 }).default("0"),
  isVerified: boolean("is_verified").default(false),
  sellerRating: decimal("seller_rating", { precision: 3, scale: 2 }).default("0"), // Seller rating from buyers
  sellerReviewCount: integer("seller_review_count").default(0), // Number of reviews as seller
  // Admin management fields
  isAdminApproved: boolean("is_admin_approved").default(false),
  adminApprovedAt: timestamp("admin_approved_at"),
  approvedByOwnerId: integer("approved_by_owner_id"),
  adminRequestPending: boolean("admin_request_pending").default(false),
  adminRequestReason: text("admin_request_reason"),
  adminRequestAt: timestamp("admin_request_at"),
  // Two-Factor Authentication fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: text("backup_codes").array().default([]),
  twoFactorVerifiedAt: timestamp("two_factor_verified_at"),
  pendingTotpSecret: text("pending_totp_secret"), // Temporary storage for setup flow
  pendingTotpExpiry: timestamp("pending_totp_expiry"), // Expiry time for pending secret
  smsFallbackEnabled: boolean("sms_fallback_enabled").default(false),
  smsFallbackNumber: text("sms_fallback_number"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for user queries
  roleCreatedAtIdx: index("users_role_created_at_idx").on(table.role, table.createdAt),
  isVerifiedRoleIdx: index("users_is_verified_role_idx").on(table.isVerified, table.role),
  adminStatusIdx: index("users_admin_status_idx").on(table.isAdminApproved, table.adminRequestPending),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // mobile_legends, pubg_mobile, free_fire, valorant, etc.
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  thumbnail: text("thumbnail"),
  images: jsonb("images").$type<string[]>().default([]),
  gameData: jsonb("game_data").$type<Record<string, any>>().default({}),
  status: text("status").notNull().default("active"), // active, sold, suspended
  isPremium: boolean("is_premium").default(false),
  viewCount: integer("view_count").default(0), // Real view count
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for performance optimization
  sellerIdStatusIdx: index("products_seller_status_idx").on(table.sellerId, table.status),
  categoryStatusIdx: index("products_category_status_idx").on(table.category, table.status),
  statusCreatedAtIdx: index("products_status_created_at_idx").on(table.status, table.createdAt),
  premiumStatusIdx: index("products_premium_status_idx").on(table.isPremium, table.status),
}));

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, completed, disputed
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for chat performance
  buyerIdStatusIdx: index("chats_buyer_status_idx").on(table.buyerId, table.status),
  sellerIdStatusIdx: index("chats_seller_status_idx").on(table.sellerId, table.status),
  productIdIdx: index("chats_product_id_idx").on(table.productId),
  statusCreatedAtIdx: index("chats_status_created_at_idx").on(table.status, table.createdAt),
}));

// Message status enum - for WhatsApp-style message tracking
// Array for Zod validation
export const messageStatusValues = ['sent', 'delivered', 'read'] as const;
export type MessageStatus = typeof messageStatusValues[number];
// pgEnum for DB-level enforcement
export const messageStatusEnum = pgEnum('message_status', messageStatusValues);

// Message type enum - for different message content types
// Array for Zod validation
export const messageTypeValues = ['text', 'image', 'file', 'audio', 'video'] as const;
export type MessageType = typeof messageTypeValues[number];
// pgEnum for DB-level enforcement
export const messageTypeEnum = pgEnum('message_type', messageTypeValues);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").default("text"), // text, image, file, audio, video
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  // WhatsApp-style message status fields
  status: messageStatusEnum("status").notNull().default("sent"), // sent, delivered, read
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for message performance
  chatIdCreatedAtIdx: index("messages_chat_created_at_idx").on(table.chatId, table.createdAt),
  senderIdChatIdIdx: index("messages_sender_chat_idx").on(table.senderId, table.chatId),
  statusChatIdIdx: index("messages_status_chat_idx").on(table.status, table.chatId),
  typeCreatedAtIdx: index("messages_type_created_at_idx").on(table.messageType, table.createdAt),
}));

export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(), // 👍❤️😂🔥🎉👏😮😢😡
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one user can only have one reaction per message
  uniqueUserMessageReaction: uniqueIndex("unique_user_message_reaction").on(table.userId, table.messageId),
  // Indexes for performance
  messageIdIdx: index("message_reactions_message_idx").on(table.messageId),
  userIdIdx: index("message_reactions_user_idx").on(table.userId),
  emojiIdx: index("message_reactions_emoji_idx").on(table.emoji),
  messageIdEmojiIdx: index("message_reactions_message_emoji_idx").on(table.messageId, table.emoji),
}));

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, refunded
  paymentMethod: text("payment_method").default("qris"),
  paymentId: text("payment_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // Midtrans payment data: transaction_id, order_id, payment_type, actions, expiry_time, fraud_status, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for transaction performance
  buyerIdStatusIdx: index("transactions_buyer_status_idx").on(table.buyerId, table.status),
  sellerIdStatusIdx: index("transactions_seller_status_idx").on(table.sellerId, table.status),
  paymentIdIdx: index("transactions_payment_id_idx").on(table.paymentId),
  statusCreatedAtIdx: index("transactions_status_created_at_idx").on(table.status, table.createdAt),
  productIdStatusIdx: index("transactions_product_status_idx").on(table.productId, table.status),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // topup, withdrawal, payment, commission
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for wallet transaction performance
  userIdTypeStatusIdx: index("wallet_transactions_user_type_status_idx").on(table.userId, table.type, table.status),
  statusCreatedAtIdx: index("wallet_transactions_status_created_at_idx").on(table.status, table.createdAt),
  typeCreatedAtIdx: index("wallet_transactions_type_created_at_idx").on(table.type, table.createdAt),
}));

export const statusUpdates = pgTable("status_updates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content"),
  description: text("description"), // Caption/description for the status
  media: text("media"), // Primary video URL (max 1 video per post)
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs for carousel (multiple images allowed)
  mediaType: text("media_type"), // text, image, video, carousel
  duration: integer("duration").default(15), // Display duration in seconds (15s for image/text, max 30s for video)
  backgroundColor: text("background_color"), // Background color for text status (WhatsApp style)
  stickers: jsonb("stickers").$type<Array<{id: string, emoji: string, x: number, y: number}>>().default([]), // Stickers overlay data
  textOverlays: jsonb("text_overlays").$type<Array<{id: string, text: string, x: number, y: number, color: string}>>().default([]), // Text overlays data
  trimStart: decimal("trim_start", { precision: 10, scale: 2 }), // Video trim start time in seconds
  trimEnd: decimal("trim_end", { precision: 10, scale: 2 }), // Video trim end time in seconds
  musicUrl: text("music_url"), // Background music/audio URL
  drawingData: text("drawing_data"), // Canvas drawing data as base64 string
  isPublic: boolean("is_public").default(true),
  viewCount: integer("view_count").default(0),
  expiresAt: timestamp("expires_at"), // 24 hours from creation
  createdAt: timestamp("created_at").defaultNow(),
});

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull().default("Admin"),
  thumbnail: text("thumbnail"),
  images: jsonb("images").$type<string[]>().default([]),
  isPinned: boolean("is_pinned").default(false),
  isPublished: boolean("is_published").default(true),
  category: text("category").default("general"), // general, update, event, maintenance
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for news performance
  publishedCreatedAtIdx: index("news_published_created_at_idx").on(table.isPublished, table.createdAt),
  pinnedPublishedIdx: index("news_pinned_published_idx").on(table.isPinned, table.isPublished),
  categoryPublishedIdx: index("news_category_published_idx").on(table.category, table.isPublished),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // order, message, payment, system
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for notification performance
  userIdIsReadIdx: index("notifications_user_is_read_idx").on(table.userId, table.isRead),
  typeCreatedAtIdx: index("notifications_type_created_at_idx").on(table.type, table.createdAt),
}));

export const escrowTransactions = pgTable("escrow_transactions", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: integer("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, active, completed, disputed, cancelled
  aiStatus: text("ai_status").notNull().default("processing"), // processing, approved, flagged, manual_review
  riskScore: integer("risk_score").default(0), // 0-100 risk score
  aiDecision: jsonb("ai_decision").$type<Record<string, any>>(),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  adminNote: text("admin_note"),
  completedBy: integer("completed_by").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Database indexes for better performance
  buyerStatusIdx: index("escrow_buyer_status_idx").on(table.buyerId, table.status),
  sellerStatusIdx: index("escrow_seller_status_idx").on(table.sellerId, table.status),
  statusAiStatusIdx: index("escrow_status_ai_status_idx").on(table.status, table.aiStatus),
  createdAtIdx: index("escrow_created_at_idx").on(table.createdAt),
}));

export const posterGenerations = pgTable("poster_generations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  profileImage: text("profile_image").notNull(),
  selectedSkins: jsonb("selected_skins").$type<string[]>().notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  resultUrl: text("result_url"),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  statusId: integer("status_id").references(() => statusUpdates.id),
  comment: text("comment"), // optional comment when reposting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ensure a user can only repost once per item
  uniqueUserProduct: index("unique_user_product_repost").on(table.userId, table.productId),
  uniqueUserStatus: index("unique_user_status_repost").on(table.userId, table.statusId),
}));

// Reviews Table - for product and seller reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  buyerId: integer("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: integer("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(), // 1-5 star rating
  comment: text("comment"), // optional review comment
  isVerified: boolean("is_verified").default(false), // verified purchase
  isPublic: boolean("is_public").default(true), // can be made private
  moderationStatus: text("moderation_status").default("approved"), // approved, pending, rejected
  moderatedBy: integer("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at"),
  moderationNotes: text("moderation_notes"),
  helpfulVotes: integer("helpful_votes").default(0), // other users can vote if review is helpful
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for performance optimization
  productIdIdx: index("reviews_product_id_idx").on(table.productId),
  sellerIdIdx: index("reviews_seller_id_idx").on(table.sellerId),
  buyerIdIdx: index("reviews_buyer_id_idx").on(table.buyerId),
  ratingCreatedAtIdx: index("reviews_rating_created_at_idx").on(table.rating, table.createdAt),
  moderationStatusIdx: index("reviews_moderation_status_idx").on(table.moderationStatus),
  // Composite index for common query patterns
  productModerationPublicIdx: index("reviews_product_moderation_public_idx").on(table.productId, table.moderationStatus, table.isPublic, table.createdAt),
  // CRITICAL: Unique constraint to prevent duplicate reviews
  uniqueBuyerProduct: uniqueIndex("unique_buyer_product_review").on(table.buyerId, table.productId),
}));

// Review Helpful Votes Table - tracks individual votes to prevent duplicates
export const reviewHelpfulVotes = pgTable("review_helpful_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate votes
  uniqueUserReview: uniqueIndex("unique_user_review_vote").on(table.userId, table.reviewId),
  // Indexes for performance
  reviewIdIdx: index("review_helpful_votes_review_idx").on(table.reviewId),
  userIdIdx: index("review_helpful_votes_user_idx").on(table.userId),
}));

// Video Comments Table - for commenting on status update videos
export const videoComments = pgTable("video_comments", {
  id: serial("id").primaryKey(),
  statusId: integer("status_id").notNull().references(() => statusUpdates.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for performance
  statusIdIdx: index("video_comments_status_id_idx").on(table.statusId),
  userIdIdx: index("video_comments_user_id_idx").on(table.userId),
  statusIdCreatedAtIdx: index("video_comments_status_created_at_idx").on(table.statusId, table.createdAt),
}));

// Status Views Table - tracks who viewed which status
export const statusViews = pgTable("status_views", {
  id: serial("id").primaryKey(),
  statusId: integer("status_id").notNull().references(() => statusUpdates.id, { onDelete: "cascade" }),
  viewerId: integer("viewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => ({
  // Composite unique index to prevent duplicate views
  uniqueStatusViewer: uniqueIndex("unique_status_viewer").on(table.statusId, table.viewerId),
  // Indexes for performance
  statusIdIdx: index("status_views_status_id_idx").on(table.statusId),
  viewerIdIdx: index("status_views_viewer_id_idx").on(table.viewerId),
  viewedAtIdx: index("status_views_viewed_at_idx").on(table.viewedAt),
}));

// Video Content Table - Permanent TikTok-style video posts (does NOT expire)
export const videoContent = pgTable("video_content", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // Caption/description for the video
  videoUrl: text("video_url"), // Video URL (max 1 video per post)
  thumbnailUrl: text("thumbnail_url"), // Thumbnail image
  images: jsonb("images").$type<string[]>().default([]), // Array of image URLs for carousel posts
  contentType: text("content_type").notNull().default("video"), // video, image, carousel
  musicName: text("music_name"), // Background music name
  musicUrl: text("music_url"), // Background music URL
  tags: text("tags").array().default([]), // Hashtags and tags
  category: text("category"), // Gaming category: mobile_legends, pubg, free_fire, etc.
  isPublic: boolean("is_public").default(true),
  isPinned: boolean("is_pinned").default(false), // Featured/pinned content
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for performance
  userIdIdx: index("video_content_user_id_idx").on(table.userId),
  contentTypeIdx: index("video_content_type_idx").on(table.contentType),
  categoryIdx: index("video_content_category_idx").on(table.category),
  createdAtIdx: index("video_content_created_at_idx").on(table.createdAt),
  publicPinnedIdx: index("video_content_public_pinned_idx").on(table.isPublic, table.isPinned, table.createdAt),
}));

// Video Content Likes Table - tracks who liked which permanent video content
export const videoContentLikes = pgTable("video_content_likes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videoContent.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate likes
  uniqueUserVideo: uniqueIndex("unique_user_video_like").on(table.userId, table.videoId),
  // Indexes for performance
  videoIdIdx: index("video_content_likes_video_idx").on(table.videoId),
  userIdIdx: index("video_content_likes_user_idx").on(table.userId),
  createdAtIdx: index("video_content_likes_created_at_idx").on(table.createdAt),
}));

// Video Content Saves Table - tracks who saved which permanent video content
export const videoContentSaves = pgTable("video_content_saves", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videoContent.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate saves
  uniqueUserVideo: uniqueIndex("unique_user_video_save").on(table.userId, table.videoId),
  // Indexes for performance
  videoIdIdx: index("video_content_saves_video_idx").on(table.videoId),
  userIdIdx: index("video_content_saves_user_idx").on(table.userId),
  createdAtIdx: index("video_content_saves_created_at_idx").on(table.createdAt),
}));

// Video Content Comments Table - for commenting on permanent video content
export const videoContentComments = pgTable("video_content_comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videoContent.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for performance
  videoIdIdx: index("video_content_comments_video_idx").on(table.videoId),
  userIdIdx: index("video_content_comments_user_idx").on(table.userId),
  videoIdCreatedAtIdx: index("video_content_comments_video_created_at_idx").on(table.videoId, table.createdAt),
}));

// Admin Configuration Tables
export const adminConfigs = pgTable("admin_configs", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // commission_rate, ai_enabled, etc.
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminTemplates = pgTable("admin_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // auto_reply, conflict_resolution, welcome, etc.
  template: text("template").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]), // {{username}}, {{amount}}, etc.
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminRules = pgTable("admin_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(), // auto_approval, conflict_resolution, payment_timeout, etc.
  conditions: jsonb("conditions").$type<Record<string, any>>().notNull(),
  actions: jsonb("actions").$type<Record<string, any>>().notNull(),
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminBlacklist = pgTable("admin_blacklist", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // user, product, keyword, ip_address
  targetId: integer("target_id"), // user_id or product_id if applicable
  value: text("value").notNull(), // username, email, product title, keyword, IP address
  reason: text("reason").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  typeValueIdx: index("blacklist_type_value_idx").on(table.type, table.value),
}));

export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  adminId: integer("admin_id").references(() => users.id),
  action: text("action").notNull(), // posting, transaction, chat, ai_response, qris_payment, etc.
  category: text("category").notNull(), // user_action, admin_action, system_action, ai_action
  details: jsonb("details").$type<Record<string, any>>().default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").default("success"), // success, error, warning
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  actionCategoryIdx: index("activity_logs_action_category_idx").on(table.action, table.category),
  userIdIdx: index("activity_logs_user_id_idx").on(table.userId),
  adminIdIdx: index("activity_logs_admin_id_idx").on(table.adminId),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

export const adminOtpCodes = pgTable("admin_otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  purpose: text("purpose").notNull().default("admin_access"), // admin_access, config_change, etc.
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPurposeIdx: index("otp_user_purpose_idx").on(table.userId, table.purpose),
}));

// Fraud Alerts Table - for comprehensive fraud detection and monitoring
export const fraudAlerts = pgTable("fraud_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  alertType: text("alert_type").notNull(), // high_risk, critical_risk, velocity, device_suspicious, behavioral_anomaly, manual_review
  severity: text("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  message: text("message").notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  riskFactors: jsonb("risk_factors").$type<string[]>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  status: text("status").notNull().default("active"), // active, acknowledged, resolved, false_positive
  assignedTo: integer("assigned_to").references(() => users.id), // Admin user ID
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes
  userIdStatusIdx: index("fraud_alerts_user_status_idx").on(table.userId, table.status),
  severityStatusIdx: index("fraud_alerts_severity_status_idx").on(table.severity, table.status),
  alertTypeStatusIdx: index("fraud_alerts_type_status_idx").on(table.alertType, table.status),
  statusCreatedAtIdx: index("fraud_alerts_status_created_at_idx").on(table.status, table.createdAt),
  assignedToIdx: index("fraud_alerts_assigned_to_idx").on(table.assignedTo),
  transactionIdIdx: index("fraud_alerts_transaction_id_idx").on(table.transactionId),
  riskScoreIdx: index("fraud_alerts_risk_score_idx").on(table.riskScore),
}));

// Money Requests Table - for send/request money functionality
export const moneyRequests = pgTable("money_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull(), // send, request
  status: text("status").notNull().default("pending"), // pending, completed, cancelled, expired
  message: text("message"), // optional message with the request/send
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // requests can expire after 7 days
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  senderIdx: index("money_requests_sender_idx").on(table.senderId),
  receiverIdx: index("money_requests_receiver_idx").on(table.receiverId),
  statusIdx: index("money_requests_status_idx").on(table.status),
}));

// E-wallet Connections Table - for connecting external wallets
export const ewalletConnections = pgTable("ewallet_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(), // gopay, ovo, dana, shopeepay
  accountId: text("account_id"), // external account identifier
  accountName: text("account_name"), // display name for the account
  phoneNumber: text("phone_number"), // phone number linked to the ewallet
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0"), // cached balance
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // provider-specific data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userProviderIdx: index("ewallet_connections_user_provider_idx").on(table.userId, table.provider),
  uniqueUserProvider: index("unique_user_provider_ewallet").on(table.userId, table.provider),
}));

// Service Orders Table - for various services (Pulsa, Gaming, etc.)
export const serviceOrders = pgTable("service_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceType: text("service_type").notNull(), // pulsa, gaming, electric, deals, etc.
  productName: text("product_name").notNull(), // specific product/package name
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  targetNumber: text("target_number"), // phone number for pulsa, user ID for gaming, etc.
  gameData: jsonb("game_data").$type<Record<string, any>>().default({}), // game-specific data
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  orderNumber: text("order_number").notNull().unique(), // unique order identifier
  providerOrderId: text("provider_order_id"), // external provider's order ID
  completedAt: timestamp("completed_at"),
  failedReason: text("failed_reason"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userServiceIdx: index("service_orders_user_service_idx").on(table.userId, table.serviceType),
  statusIdx: index("service_orders_status_idx").on(table.status),
  orderNumberIdx: index("service_orders_order_number_idx").on(table.orderNumber),
}));

// Admin Verification Documents Table - for KTP, KK, etc.
export const adminVerificationDocuments = pgTable("admin_verification_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // ktp, kk, npwp, passport, driving_license
  documentNumber: text("document_number").notNull(),
  documentUrl: text("document_url").notNull(), // file path to uploaded document
  documentName: text("document_name").notNull(), // original filename
  documentSize: integer("document_size").notNull(), // file size in bytes
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  isRequired: boolean("is_required").default(true), // whether this document type is required for admin approval
  expiresAt: timestamp("expires_at"), // expiration date for documents like passport
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional document info
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDocTypeIdx: index("admin_docs_user_doctype_idx").on(table.userId, table.documentType),
  statusIdx: index("admin_docs_status_idx").on(table.status),
  reviewedByIdx: index("admin_docs_reviewed_by_idx").on(table.reviewedBy),
}));

// Security Alerts Table - for security monitoring
export const securityAlerts = pgTable("security_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // suspicious_login, multiple_failed_attempts, unusual_activity, etc.
  severity: text("severity").notNull(), // low, medium, high, critical
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  description: text("description").notNull(),
  details: jsonb("details").$type<Record<string, any>>().default({}),
  status: text("status").notNull().default("active"), // active, investigating, resolved, false_positive
  detectedAt: timestamp("detected_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  typeStatusIdx: index("security_alerts_type_status_idx").on(table.type, table.status),
  userIdIdx: index("security_alerts_user_id_idx").on(table.userId),
  severityIdx: index("security_alerts_severity_idx").on(table.severity),
  detectedAtIdx: index("security_alerts_detected_at_idx").on(table.detectedAt),
}));

// Verification Sessions Table - for user verification workflows
export const verificationSessions = pgTable("verification_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // basic, enhanced, business
  status: text("status").notNull().default("in_progress"), // in_progress, completed, failed, expired
  documentsRequired: text("documents_required").array().notNull().default([]),
  documentsUploaded: text("documents_uploaded").array().notNull().default([]),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  verificationScore: integer("verification_score").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("medium"), // low, medium, high
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdStatusIdx: index("verification_sessions_user_status_idx").on(table.userId, table.status),
  typeIdx: index("verification_sessions_type_idx").on(table.type),
  riskLevelIdx: index("verification_sessions_risk_level_idx").on(table.riskLevel),
}));

// Revenue Tracking Table - for comprehensive owner analytics
export const revenueReports = pgTable("revenue_reports", {
  id: serial("id").primaryKey(),
  reportDate: timestamp("report_date").notNull(), // daily revenue reports
  totalTransactions: integer("total_transactions").default(0),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0"), // gross revenue
  totalCommission: decimal("total_commission", { precision: 15, scale: 2 }).default("0"), // platform commission
  escrowFees: decimal("escrow_fees", { precision: 15, scale: 2 }).default("0"), // escrow service fees
  paymentFees: decimal("payment_fees", { precision: 15, scale: 2 }).default("0"), // payment gateway fees
  newUsers: integer("new_users").default(0),
  activeUsers: integer("active_users").default(0),
  newProducts: integer("new_products").default(0),
  completedEscrows: integer("completed_escrows").default(0),
  disputedTransactions: integer("disputed_transactions").default(0),
  avgTransactionValue: decimal("avg_transaction_value", { precision: 15, scale: 2 }).default("0"),
  topCategory: text("top_category"), // most popular category
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional analytics data
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateIdx: index("revenue_reports_date_idx").on(table.reportDate),
  generatedAtIdx: index("revenue_reports_generated_at_idx").on(table.generatedAt),
}));

// Owner Configurations Table - for owner-specific settings
export const ownerConfigs = pgTable("owner_configs", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // commission_rate, max_escrow_days, auto_approval_threshold, etc.
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"), // general, revenue, security, automation, etc.
  isSystemCritical: boolean("is_system_critical").default(false), // cannot be modified by regular admins
  lastModifiedBy: integer("last_modified_by").notNull().references(() => users.id),
  validationRule: jsonb("validation_rule").$type<Record<string, any>>().default({}), // validation constraints
  effectiveFrom: timestamp("effective_from").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("owner_configs_category_idx").on(table.category),
  effectiveFromIdx: index("owner_configs_effective_from_idx").on(table.effectiveFrom),
}));

// Chat Read Tracking Table - for tracking last read message per user per chat
export const chatReadTracking = pgTable("chat_read_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  lastReadMessageId: integer("last_read_message_id").references(() => messages.id, { onDelete: "set null" }),
  lastReadAt: timestamp("last_read_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to ensure one record per user per chat
  uniqueUserChat: index("unique_user_chat_read_tracking").on(table.userId, table.chatId),
  lastReadAtIdx: index("chat_read_tracking_last_read_at_idx").on(table.lastReadAt),
}));

// Push Subscriptions Table - for web push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("push_subscriptions_user_id_idx").on(table.userId),
  endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint),
  activeIdx: index("push_subscriptions_active_idx").on(table.isActive),
}));

// Chat Monitoring Table - for tracking all chat activities
export const chatMonitoring = pgTable("chat_monitoring", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => messages.id, { onDelete: "cascade" }),
  monitoringType: text("monitoring_type").notNull(), // automated_scan, manual_review, ai_flagged, user_reported
  flaggedReason: text("flagged_reason"), // inappropriate_content, fraud_attempt, spam, harassment, etc.
  riskLevel: text("risk_level").notNull().default("low"), // low, medium, high, critical
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // AI confidence score 0-100
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  actionTaken: text("action_taken"), // no_action, warning_sent, chat_restricted, user_suspended, etc.
  reviewNotes: text("review_notes"),
  isResolved: boolean("is_resolved").default(false),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional monitoring data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  chatRiskIdx: index("chat_monitoring_chat_risk_idx").on(table.chatId, table.riskLevel),
  typeIdx: index("chat_monitoring_type_idx").on(table.monitoringType),
  reviewedByIdx: index("chat_monitoring_reviewed_by_idx").on(table.reviewedBy),
  resolvedIdx: index("chat_monitoring_resolved_idx").on(table.isResolved),
}));

// User Interactions Table - for FYP algorithm tracking
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type").notNull(), // view, like, share, click, search, purchase, chat_start
  interactionValue: text("interaction_value"), // search query, category browsed, etc.
  sessionId: text("session_id"), // to track session-based interactions
  deviceType: text("device_type"), // mobile, desktop, tablet
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}), // additional data like time spent, scroll depth, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for FYP algorithm performance
  userTypeIdx: index("user_interactions_user_type_idx").on(table.userId, table.interactionType),
  productTypeIdx: index("user_interactions_product_type_idx").on(table.productId, table.interactionType),
  createdAtIdx: index("user_interactions_created_at_idx").on(table.createdAt),
  sessionIdx: index("user_interactions_session_idx").on(table.sessionId),
}));

// User Reports Table - for reporting system
export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: integer("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  reportedProductId: integer("reported_product_id").references(() => products.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(), // banned_account, fake_product, scam, inappropriate_content, spam
  reason: text("reason").notNull(),
  description: text("description"), // detailed description from user
  evidence: jsonb("evidence").$type<string[]>().default([]), // screenshots or other evidence URLs
  gameData: jsonb("game_data").$type<Record<string, any>>().default({}), // reported game account details
  status: text("status").notNull().default("pending"), // pending, investigating, resolved, dismissed
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  actionTaken: text("action_taken"), // no_action, warning_sent, account_suspended, product_removed, blacklist_added
  adminNotes: text("admin_notes"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient report management
  reporterIdx: index("user_reports_reporter_idx").on(table.reporterId),
  reportedUserIdx: index("user_reports_reported_user_idx").on(table.reportedUserId),
  reportedProductIdx: index("user_reports_reported_product_idx").on(table.reportedProductId),
  statusPriorityIdx: index("user_reports_status_priority_idx").on(table.status, table.priority),
  typeStatusIdx: index("user_reports_type_status_idx").on(table.reportType, table.status),
  createdAtIdx: index("user_reports_created_at_idx").on(table.createdAt),
}));

// User Preferences Table - for personalized content
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  preferredCategories: jsonb("preferred_categories").$type<string[]>().default([]), // mobile_legends, pubg_mobile, etc.
  priceRange: jsonb("price_range").$type<{min: number, max: number}>(), // preferred price range
  excludedSellers: jsonb("excluded_sellers").$type<number[]>().default([]), // blocked seller IDs
  contentFilters: jsonb("content_filters").$type<Record<string, any>>().default({}), // custom filters
  notificationSettings: jsonb("notification_settings").$type<Record<string, boolean>>().default({}),
  fyp_enabled: boolean("fyp_enabled").default(true), // allow personalized recommendations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_preferences_user_id_idx").on(table.userId),
}));

// Uploaded Files Table - for file upload tracking
export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uploadedByIdx: index("uploaded_files_uploaded_by_idx").on(table.uploadedBy),
  categoryIdx: index("uploaded_files_category_idx").on(table.category),
  createdAtIdx: index("uploaded_files_created_at_idx").on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  products: many(products),
  buyerChats: many(chats, { relationName: "buyer" }),
  sellerChats: many(chats, { relationName: "seller" }),
  messages: many(messages),
  statusUpdates: many(statusUpdates),
  notifications: many(notifications),
  walletTransactions: many(walletTransactions),
  buyerEscrowTransactions: many(escrowTransactions, { relationName: "buyer" }),
  sellerEscrowTransactions: many(escrowTransactions, { relationName: "seller" }),
  reposts: many(reposts),
  approvedAdmins: many(users, { relationName: "approved_by_owner" }),
  approvedByOwner: one(users, {
    fields: [users.approvedByOwnerId],
    references: [users.id],
    relationName: "approved_by_owner",
  }),
  // Review relations
  reviewsWritten: many(reviews, { relationName: "reviewer" }),
  reviewsReceived: many(reviews, { relationName: "reviewed_seller" }),
  reviewsModerated: many(reviews, { relationName: "review_moderator" }),
  // New wallet relations
  sentMoneyRequests: many(moneyRequests, { relationName: "sender" }),
  receivedMoneyRequests: many(moneyRequests, { relationName: "receiver" }),
  ewalletConnections: many(ewalletConnections),
  serviceOrders: many(serviceOrders),
  // Admin relations
  adminConfigsUpdated: many(adminConfigs),
  adminTemplatesCreated: many(adminTemplates, { relationName: "template_creator" }),
  adminTemplatesUpdated: many(adminTemplates, { relationName: "template_updater" }),
  adminRulesCreated: many(adminRules, { relationName: "rule_creator" }),
  adminRulesUpdated: many(adminRules, { relationName: "rule_updater" }),
  adminBlacklistCreated: many(adminBlacklist),
  adminActivityLogs: many(adminActivityLogs, { relationName: "activity_user" }),
  adminActionLogs: many(adminActivityLogs, { relationName: "activity_admin" }),
  adminOtpCodes: many(adminOtpCodes),
  // New relations for enhanced owner functionality
  verificationDocuments: many(adminVerificationDocuments),
  reviewedDocuments: many(adminVerificationDocuments, { relationName: "document_reviewer" }),
  ownerConfigsModified: many(ownerConfigs),
  chatMonitoringReviews: many(chatMonitoring),
  chatReadTracking: many(chatReadTracking),
  pushSubscriptions: many(pushSubscriptions),
  // New FYP and reporting system relations
  userInteractions: many(userInteractions),
  reportsMade: many(userReports, { relationName: "reporter" }),
  reportsReceived: many(userReports, { relationName: "reported_user" }),
  reportsReviewed: many(userReports, { relationName: "report_reviewer" }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  chats: many(chats),
  transactions: many(transactions),
  escrowTransactions: many(escrowTransactions),
  reposts: many(reposts),
  reviews: many(reviews),
  // New FYP and reporting relations
  interactions: many(userInteractions),
  reports: many(userReports, { relationName: "reported_product" }),
}));

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one }) => ({
  buyer: one(users, {
    fields: [escrowTransactions.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [escrowTransactions.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  product: one(products, {
    fields: [escrowTransactions.productId],
    references: [products.id],
  }),
  approvedByUser: one(users, {
    fields: [escrowTransactions.approvedBy],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [escrowTransactions.completedBy],
    references: [users.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  product: one(products, {
    fields: [chats.productId],
    references: [products.id],
  }),
  buyer: one(users, {
    fields: [chats.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [chats.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(users, {
    fields: [reposts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reposts.productId],
    references: [products.id],
  }),
  status: one(statusUpdates, {
    fields: [reposts.statusId],
    references: [statusUpdates.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  buyer: one(users, {
    fields: [reviews.buyerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  seller: one(users, {
    fields: [reviews.sellerId],
    references: [users.id],
    relationName: "reviewed_seller",
  }),
  transaction: one(transactions, {
    fields: [reviews.transactionId],
    references: [transactions.id],
  }),
  moderatedByUser: one(users, {
    fields: [reviews.moderatedBy],
    references: [users.id],
    relationName: "review_moderator",
  }),
}));

export const statusUpdatesRelations = relations(statusUpdates, ({ one, many }) => ({
  user: one(users, {
    fields: [statusUpdates.userId],
    references: [users.id],
  }),
  reposts: many(reposts),
}));

// Admin table relations
export const adminConfigsRelations = relations(adminConfigs, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [adminConfigs.updatedBy],
    references: [users.id],
  }),
}));

export const adminTemplatesRelations = relations(adminTemplates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [adminTemplates.createdBy],
    references: [users.id],
    relationName: "template_creator",
  }),
  updatedByUser: one(users, {
    fields: [adminTemplates.updatedBy],
    references: [users.id],
    relationName: "template_updater",
  }),
}));

export const adminRulesRelations = relations(adminRules, ({ one }) => ({
  createdByUser: one(users, {
    fields: [adminRules.createdBy],
    references: [users.id],
    relationName: "rule_creator",
  }),
  updatedByUser: one(users, {
    fields: [adminRules.updatedBy],
    references: [users.id],
    relationName: "rule_updater",
  }),
}));

export const adminBlacklistRelations = relations(adminBlacklist, ({ one }) => ({
  createdByUser: one(users, {
    fields: [adminBlacklist.createdBy],
    references: [users.id],
  }),
}));

export const adminActivityLogsRelations = relations(adminActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [adminActivityLogs.userId],
    references: [users.id],
    relationName: "activity_user",
  }),
  admin: one(users, {
    fields: [adminActivityLogs.adminId],
    references: [users.id],
    relationName: "activity_admin",
  }),
}));

export const fraudAlertsRelations = relations(fraudAlerts, ({ one }) => ({
  user: one(users, {
    fields: [fraudAlerts.userId],
    references: [users.id],
    relationName: "alert_user",
  }),
  transaction: one(transactions, {
    fields: [fraudAlerts.transactionId],
    references: [transactions.id],
  }),
  assignedToUser: one(users, {
    fields: [fraudAlerts.assignedTo],
    references: [users.id],
    relationName: "alert_assigned_to",
  }),
  acknowledgedByUser: one(users, {
    fields: [fraudAlerts.acknowledgedBy],
    references: [users.id],
    relationName: "alert_acknowledged_by",
  }),
  resolvedByUser: one(users, {
    fields: [fraudAlerts.resolvedBy],
    references: [users.id],
    relationName: "alert_resolved_by",
  }),
}));

export const adminOtpCodesRelations = relations(adminOtpCodes, ({ one }) => ({
  user: one(users, {
    fields: [adminOtpCodes.userId],
    references: [users.id],
  }),
}));

// New table relations
export const moneyRequestsRelations = relations(moneyRequests, ({ one }) => ({
  sender: one(users, {
    fields: [moneyRequests.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [moneyRequests.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const ewalletConnectionsRelations = relations(ewalletConnections, ({ one }) => ({
  user: one(users, {
    fields: [ewalletConnections.userId],
    references: [users.id],
  }),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
  user: one(users, {
    fields: [serviceOrders.userId],
    references: [users.id],
  }),
}));

// New table relations for enhanced owner functionality
export const adminVerificationDocumentsRelations = relations(adminVerificationDocuments, ({ one }) => ({
  user: one(users, {
    fields: [adminVerificationDocuments.userId],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [adminVerificationDocuments.reviewedBy],
    references: [users.id],
    relationName: "document_reviewer",
  }),
}));

export const revenueReportsRelations = relations(revenueReports, ({ one }) => ({
  // Revenue reports are generated automatically, no direct user relations needed
}));

export const ownerConfigsRelations = relations(ownerConfigs, ({ one }) => ({
  lastModifiedByUser: one(users, {
    fields: [ownerConfigs.lastModifiedBy],
    references: [users.id],
  }),
}));

export const chatMonitoringRelations = relations(chatMonitoring, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMonitoring.chatId],
    references: [chats.id],
  }),
  message: one(messages, {
    fields: [chatMonitoring.messageId],
    references: [messages.id],
  }),
  reviewedByUser: one(users, {
    fields: [chatMonitoring.reviewedBy],
    references: [users.id],
  }),
}));

// New FYP and reporting system relations
export const userInteractionsRelations = relations(userInteractions, ({ one }) => ({
  user: one(users, {
    fields: [userInteractions.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [userInteractions.productId],
    references: [products.id],
  }),
}));

export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(users, {
    fields: [userReports.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  reportedUser: one(users, {
    fields: [userReports.reportedUserId],
    references: [users.id],
    relationName: "reported_user",
  }),
  reportedProduct: one(products, {
    fields: [userReports.reportedProductId],
    references: [products.id],
    relationName: "reported_product",
  }),
  reviewedByUser: one(users, {
    fields: [userReports.reviewedBy],
    references: [users.id],
    relationName: "report_reviewer",
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// Zod schemas
// BUG #25 FIX: Strong password validation (defined first, before being used)
const COMMON_PASSWORDS_LIST = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
  'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321',
  'superman', 'qazwsx', 'michael', 'football', 'password123',
  'admin', 'welcome', 'login', 'ninja', 'mustang'
];

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (!@#$%^&*)')
  .refine((password) => {
    // Check against common passwords (case-insensitive)
    return !COMMON_PASSWORDS_LIST.includes(password.toLowerCase());
  }, { 
    message: 'This password is too common. Please choose a stronger password.' 
  });

// SECURITY: Original insertUserSchema is too permissive - kept for internal admin use only
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// SECURE: Safe user registration schema - only allows non-sensitive fields
// BUG #25 FIX: Use strong password validation
export const userRegisterSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  // Security: Exclude all sensitive fields that could lead to privilege escalation
  role: true,
  walletBalance: true,
  isVerified: true,
  isAdminApproved: true,
  adminApprovedAt: true,
  approvedByOwnerId: true,
  adminRequestPending: true,
  adminRequestReason: true,
  adminRequestAt: true,
  // Security: Exclude 2FA fields - these should only be set after account creation
  twoFactorEnabled: true,
  twoFactorSecret: true,
  backupCodes: true,
  twoFactorVerifiedAt: true,
  smsFallbackEnabled: true,
  smsFallbackNumber: true,
}).extend({
  password: passwordSchema // Override with strong password validation
});

// SECURE: User profile update schema - only allows safe fields to be updated
// BUG #25 FIX: Use strong password validation for password changes
export const userUpdateSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters").optional(),
  bio: z.string().max(150, "Bio must be less than 150 characters").optional(),
  profilePicture: z.string().optional(),
  bannerImage: z.string().optional(),
  avatarAuraColor: z.enum(["purple", "green", "blue", "orange", "red", "pink", "cyan", "gold"]).optional(),
  avatarBorderStyle: z.enum(["energy", "geometric", "neon", "crystal"]).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(), // Strong password validation
}).refine((data) => {
  // If new password is provided, current password must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when setting a new password",
  path: ["currentPassword"],
});

// BUG #20 FIX: Add price validation to prevent negative values and overflow
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  rating: true,
  reviewCount: true,
}).extend({
  images: z.array(z.string()).optional(),
  gameData: z.record(z.any()).optional(),
  price: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 999999999999.99;
    }, { message: "Price must be between Rp 0 and Rp 999,999,999,999.99" })
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 1000; // Minimum Rp 1,000
    }, { message: "Price must be at least Rp 1,000" }),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
  messageType: z.enum(messageTypeValues).default('text'),
  status: z.enum(messageStatusValues).default('sent'),
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertStatusUpdateSchema = createInsertSchema(statusUpdates).omit({
  id: true,
  createdAt: true,
  viewCount: true,
  userId: true,
  expiresAt: true,
}).extend({
  content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  media: z.string().nullable().optional(),
  mediaType: z.string().nullable().optional(),
  duration: z.number().optional().default(15),
  backgroundColor: z.string().nullable().optional(),
  stickers: z.array(z.object({
    id: z.string(),
    emoji: z.string(),
    x: z.number(),
    y: z.number()
  })).optional().default([]),
  textOverlays: z.array(z.object({
    id: z.string(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    color: z.string()
  })).optional().default([]),
  trimStart: z.string().nullable().optional(),
  trimEnd: z.string().nullable().optional(),
  musicUrl: z.string().nullable().optional(),
  drawingData: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(true),
});

export const insertNewsSchema = createInsertSchema(news, {
  images: z.array(z.string()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

// SECURITY: Original insertEscrowTransactionSchema is too permissive - kept for internal admin use only
export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  createdAt: true,
}).extend({
  aiDecision: z.record(z.any()).optional(),
  aiStatus: z.string().optional(),
  riskScore: z.number().optional(),
});

// SECURE: Safe escrow creation schema - only allows public fields
export const escrowPublicCreateSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  createdAt: true,
  // Security: Exclude all admin-only fields
  status: true,
  aiStatus: true,
  riskScore: true,
  aiDecision: true,
  approvedBy: true,
  approvedAt: true,
  adminNote: true,
  completedBy: true,
  completedAt: true,
  completionNote: true,
});

export const insertPosterGenerationSchema = createInsertSchema(posterGenerations).omit({
  id: true,
  createdAt: true,
});

export const insertRepostSchema = createInsertSchema(reposts).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  helpfulVotes: true,
  moderationStatus: true,
  moderatedBy: true,
  moderatedAt: true,
  moderationNotes: true,
}).extend({
  // Add rating validation (1-5 stars)
  rating: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating cannot be more than 5 stars"),
  comment: z.string().max(1000, "Review comment must be less than 1000 characters").optional(),
});

export const insertReviewHelpfulVoteSchema = createInsertSchema(reviewHelpfulVotes).omit({
  id: true,
  createdAt: true,
});

export const insertVideoCommentSchema = createInsertSchema(videoComments).omit({
  id: true,
  createdAt: true,
}).extend({
  comment: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters").trim(),
});

export const insertStatusViewSchema = createInsertSchema(statusViews).omit({
  id: true,
  viewedAt: true,
});

// Admin table schemas
export const insertAdminConfigSchema = createInsertSchema(adminConfigs).omit({
  id: true,
  createdAt: true,
});

export const insertAdminTemplateSchema = createInsertSchema(adminTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminRuleSchema = createInsertSchema(adminRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminBlacklistSchema = createInsertSchema(adminBlacklist).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  details: z.record(z.any()).optional(),
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  alertType: z.enum(['high_risk', 'critical_risk', 'velocity', 'device_suspicious', 'behavioral_anomaly', 'manual_review']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'acknowledged', 'resolved', 'false_positive']).default('active'),
  riskScore: z.number().int().min(0).max(100),
  riskFactors: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
});

export const insertAdminOtpCodeSchema = createInsertSchema(adminOtpCodes).omit({
  id: true,
  createdAt: true,
});

// New table schemas
export const insertMoneyRequestSchema = createInsertSchema(moneyRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  completedAt: z.date().optional(),
});

export const insertEwalletConnectionSchema = createInsertSchema(ewalletConnections).omit({
  id: true,
  createdAt: true,
  lastSyncAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

// Security alert schemas
export const insertSecurityAlertSchema = createInsertSchema(securityAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationSessionSchema = createInsertSchema(verificationSessions).omit({
  id: true,
  createdAt: true,
});

// New table schemas for enhanced owner functionality
export const insertAdminVerificationDocumentSchema = createInsertSchema(adminVerificationDocuments).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertRevenueReportSchema = createInsertSchema(revenueReports).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertOwnerConfigSchema = createInsertSchema(ownerConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validationRule: z.record(z.any()).optional(),
});

export const insertChatReadTrackingSchema = createInsertSchema(chatReadTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastReadAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMonitoringSchema = createInsertSchema(chatMonitoring).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

// Video Content Schemas - Permanent TikTok-style content
export const insertVideoContentSchema = createInsertSchema(videoContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  likes: true,
  comments: true,
  shares: true,
  saves: true,
  views: true,
}).extend({
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  contentType: z.enum(['video', 'image', 'carousel']).default('video'),
});

export const insertVideoContentLikeSchema = createInsertSchema(videoContentLikes).omit({
  id: true,
  createdAt: true,
});

export const insertVideoContentSaveSchema = createInsertSchema(videoContentSaves).omit({
  id: true,
  createdAt: true,
});

export const insertVideoContentCommentSchema = createInsertSchema(videoContentComments).omit({
  id: true,
  createdAt: true,
}).extend({
  comment: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters").trim(),
});

// FYP and reporting system schemas
export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  createdAt: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: true,
  reviewedAt: true,
}).extend({
  evidence: z.array(z.string()).optional(),
  gameData: z.record(z.any()).optional(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  preferredCategories: z.array(z.string()).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional(),
  excludedSellers: z.array(z.number().int()).optional(),
  contentFilters: z.record(z.any()).optional(),
  notificationSettings: z.record(z.boolean()).optional(),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});

// Owner-specific validation schemas
export const ownerRevenueAnalyticsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
});

export const ownerUserManagementSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  action: z.enum(['approve_admin', 'deny_admin', 'promote_owner', 'suspend_user', 'unsuspend_user']),
  reason: z.string().max(1000, 'Reason must be less than 1000 characters').optional(),
  documents: z.array(z.number().int()).optional(), // array of document IDs
});

export const ownerDocumentReviewSchema = z.object({
  documentId: z.number().int().positive('Document ID must be a positive integer'),
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().max(1000, 'Review notes must be less than 1000 characters').optional(),
});

export const ownerChatModerationSchema = z.object({
  chatId: z.number().int().positive('Chat ID must be a positive integer'),
  messageId: z.number().int().positive().optional(),
  action: z.enum(['flag', 'warn', 'restrict', 'ban_user', 'resolve']),
  reason: z.string().max(500, 'Reason must be less than 500 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const ownerConfigUpdateSchema = z.object({
  key: z.string().min(1, 'Config key is required'),
  value: z.string().min(1, 'Config value is required'),
  description: z.string().optional(),
  category: z.enum(['general', 'revenue', 'security', 'automation']).default('general'),
  isSystemCritical: z.boolean().default(false),
});

// Admin validation schemas
export const adminApproveSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
});

export const adminDenySchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  responseNote: z.string().max(500, 'Response note must be less than 500 characters').optional(),
});

export const adminPromoteSchema = z.object({
  user_id: z.number().int().positive('User ID must be a positive integer'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export const adminRevokeSchema = z.object({
  user_id: z.number().int().positive('User ID must be a positive integer'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export const adminEscrowProcessSchema = z.object({
  escrowId: z.number().int().positive('Escrow ID must be a positive integer'),
  action: z.enum(['approve', 'flag', 'manual_review']),
  adminNote: z.string().max(1000, 'Admin note must be less than 1000 characters').optional(),
});

export const adminConfigUpdateSchema = z.object({
  key: z.string().min(1, 'Config key is required'),
  value: z.string().min(1, 'Config value is required'),
  description: z.string().optional(),
});

export const adminTemplateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name must be less than 100 characters'),
  type: z.enum(['auto_reply', 'conflict_resolution', 'welcome', 'warning', 'success']),
  template: z.string().min(1, 'Template content is required'),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const adminRuleCreateSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100, 'Name must be less than 100 characters'),
  ruleType: z.enum(['auto_approval', 'conflict_resolution', 'payment_timeout', 'fraud_detection']),
  conditions: z.record(z.any()),
  actions: z.record(z.any()),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminBlacklistCreateSchema = z.object({
  type: z.enum(['user', 'product', 'keyword', 'ip_address']),
  targetId: z.number().int().positive().optional(),
  value: z.string().min(1, 'Blacklist value is required'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be less than 500 characters'),
  isActive: z.boolean().default(true),
});

export const adminOtpVerifySchema = z.object({
  code: z.string().length(6, 'OTP code must be 6 digits'),
  purpose: z.string().default('admin_access'),
});

// Wallet feature validation schemas
// BUG #20 FIX: Add maximum amount limits to prevent overflow
const MAX_TRANSACTION_AMOUNT = 999999999999.99; // Max allowed in DB (precision 15, scale 2)

export const sendMoneySchema = z.object({
  receiverUsername: z.string().min(1, 'Username penerima diperlukan'),
  amount: z.number()
    .positive('Jumlah harus lebih dari 0')
    .min(10000, 'Jumlah minimum Rp 10,000')
    .max(MAX_TRANSACTION_AMOUNT, 'Jumlah melebihi batas maksimum'),
  message: z.string().max(200, 'Pesan maksimal 200 karakter').optional(),
});

export const requestMoneySchema = z.object({
  receiverUsername: z.string().min(1, 'Username penerima diperlukan'),
  amount: z.number()
    .positive('Jumlah harus lebih dari 0')
    .min(10000, 'Jumlah minimum Rp 10,000')
    .max(MAX_TRANSACTION_AMOUNT, 'Jumlah melebihi batas maksimum'),
  message: z.string().max(200, 'Pesan maksimal 200 karakter').optional(),
});

export const responseMoneyRequestSchema = z.object({
  requestId: z.number().int().positive('ID permintaan tidak valid'),
  action: z.enum(['accept', 'decline']),
});

export const connectEwalletSchema = z.object({
  provider: z.enum(['gopay', 'ovo', 'dana', 'shopeepay']),
  phoneNumber: z.string().min(10, 'Nomor HP tidak valid').max(15, 'Nomor HP terlalu panjang'),
  accountName: z.string().min(1, 'Nama akun diperlukan').max(100, 'Nama akun terlalu panjang'),
});

export const serviceOrderSchema = z.object({
  serviceType: z.enum(['pulsa', 'gaming', 'electric', 'deals', 'rewards', 'qris']),
  productName: z.string().min(1, 'Nama produk diperlukan'),
  amount: z.number()
    .positive('Jumlah harus lebih dari 0')
    .max(MAX_TRANSACTION_AMOUNT, 'Jumlah melebihi batas maksimum'),
  targetNumber: z.string().optional(),
  gameData: z.record(z.any()).optional(),
});

// Midtrans payment validation schemas
export const midtransChargeSchema = z.object({
  productId: z.number().int().positive('Product ID is required'),
  amount: z.number()
    .positive('Amount must be positive')
    .min(10000, 'Minimum amount is Rp 10,000')
    .max(MAX_TRANSACTION_AMOUNT, 'Amount exceeds maximum limit'),
  payment_type: z.enum(['qris', 'gopay', 'shopeepay'], {
    errorMap: () => ({ message: 'Payment type must be qris, gopay, or shopeepay' })
  }),
});

export const midtransWebhookSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  status_code: z.string().min(1, 'Status code is required'),
  gross_amount: z.string().min(1, 'Gross amount is required'),
  transaction_status: z.enum(['capture', 'settlement', 'pending', 'deny', 'cancel', 'expire', 'refund'], {
    errorMap: () => ({ message: 'Invalid transaction status' })
  }),
  transaction_id: z.string().min(1, 'Transaction ID is required'),
  payment_type: z.string().min(1, 'Payment type is required'),
  transaction_time: z.string().optional(),
  fraud_status: z.string().optional(),
  signature_key: z.string().min(1, 'Signature key is required'),
  // Allow additional fields from Midtrans
}).passthrough();

export const midtransStatusParamSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required').max(100, 'Order ID too long'),
});

export const searchQueryParamSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long').trim()
});

export const sellerIdParamSchema = z.object({
  sellerId: z.coerce.number().int().positive('Seller ID must be a positive integer')
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRegister = z.infer<typeof userRegisterSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;
export type EscrowPublicCreate = z.infer<typeof escrowPublicCreateSchema>;
export type StatusUpdate = typeof statusUpdates.$inferSelect;
export type InsertStatusUpdate = z.infer<typeof insertStatusUpdateSchema>;
export type StatusUpdateWithUser = StatusUpdate & { username: string };
export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type PosterGeneration = typeof posterGenerations.$inferSelect;
export type InsertPosterGeneration = z.infer<typeof insertPosterGenerationSchema>;
export type Repost = typeof reposts.$inferSelect;
export type InsertRepost = z.infer<typeof insertRepostSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type ReviewHelpfulVote = typeof reviewHelpfulVotes.$inferSelect;
export type InsertReviewHelpfulVote = z.infer<typeof insertReviewHelpfulVoteSchema>;
export type VideoComment = typeof videoComments.$inferSelect;
export type InsertVideoComment = z.infer<typeof insertVideoCommentSchema>;
export type StatusView = typeof statusViews.$inferSelect;
export type InsertStatusView = z.infer<typeof insertStatusViewSchema>;
export type VideoContent = typeof videoContent.$inferSelect;
export type InsertVideoContent = z.infer<typeof insertVideoContentSchema>;
export type VideoContentWithUser = VideoContent & { username: string; displayName: string; profilePicture?: string | null };
export type VideoContentLike = typeof videoContentLikes.$inferSelect;
export type InsertVideoContentLike = z.infer<typeof insertVideoContentLikeSchema>;
export type VideoContentSave = typeof videoContentSaves.$inferSelect;
export type InsertVideoContentSave = z.infer<typeof insertVideoContentSaveSchema>;
export type VideoContentComment = typeof videoContentComments.$inferSelect;
export type InsertVideoContentComment = z.infer<typeof insertVideoContentCommentSchema>;

// Admin types
export type AdminConfig = typeof adminConfigs.$inferSelect;
export type InsertAdminConfig = z.infer<typeof insertAdminConfigSchema>;
export type AdminTemplate = typeof adminTemplates.$inferSelect;
export type InsertAdminTemplate = z.infer<typeof insertAdminTemplateSchema>;
export type AdminRule = typeof adminRules.$inferSelect;
export type InsertAdminRule = z.infer<typeof insertAdminRuleSchema>;
export type AdminBlacklist = typeof adminBlacklist.$inferSelect;
export type InsertAdminBlacklist = z.infer<typeof insertAdminBlacklistSchema>;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type AdminOtpCode = typeof adminOtpCodes.$inferSelect;
export type InsertAdminOtpCode = z.infer<typeof insertAdminOtpCodeSchema>;

// New table types
export type MoneyRequest = typeof moneyRequests.$inferSelect;
export type InsertMoneyRequest = z.infer<typeof insertMoneyRequestSchema>;
export type EwalletConnection = typeof ewalletConnections.$inferSelect;
export type InsertEwalletConnection = z.infer<typeof insertEwalletConnectionSchema>;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;

// Security and verification types
export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = z.infer<typeof insertSecurityAlertSchema>;
export type VerificationSession = typeof verificationSessions.$inferSelect;
export type InsertVerificationSession = z.infer<typeof insertVerificationSessionSchema>;

// New table types for enhanced owner functionality
export type AdminVerificationDocument = typeof adminVerificationDocuments.$inferSelect;
export type InsertAdminVerificationDocument = z.infer<typeof insertAdminVerificationDocumentSchema>;
export type RevenueReport = typeof revenueReports.$inferSelect;
export type InsertRevenueReport = z.infer<typeof insertRevenueReportSchema>;
export type OwnerConfig = typeof ownerConfigs.$inferSelect;
export type InsertOwnerConfig = z.infer<typeof insertOwnerConfigSchema>;
export type ChatReadTracking = typeof chatReadTracking.$inferSelect;
export type InsertChatReadTracking = z.infer<typeof insertChatReadTrackingSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type ChatMonitoring = typeof chatMonitoring.$inferSelect;
export type InsertChatMonitoring = z.infer<typeof insertChatMonitoringSchema>;

// FYP and reporting system types
export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

// File upload tracking types
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

// Owner-specific validation types
export type OwnerRevenueAnalytics = z.infer<typeof ownerRevenueAnalyticsSchema>;
export type OwnerUserManagement = z.infer<typeof ownerUserManagementSchema>;
export type OwnerDocumentReview = z.infer<typeof ownerDocumentReviewSchema>;
export type OwnerChatModeration = z.infer<typeof ownerChatModerationSchema>;
export type OwnerConfigUpdate = z.infer<typeof ownerConfigUpdateSchema>;

// Admin validation types
export type AdminConfigUpdate = z.infer<typeof adminConfigUpdateSchema>;
export type AdminTemplateCreate = z.infer<typeof adminTemplateCreateSchema>;
export type AdminRuleCreate = z.infer<typeof adminRuleCreateSchema>;
export type AdminBlacklistCreate = z.infer<typeof adminBlacklistCreateSchema>;
export type AdminOtpVerify = z.infer<typeof adminOtpVerifySchema>;
export type AdminPromote = z.infer<typeof adminPromoteSchema>;
export type AdminRevoke = z.infer<typeof adminRevokeSchema>;

// Wallet feature validation types
export type SendMoney = z.infer<typeof sendMoneySchema>;
export type RequestMoney = z.infer<typeof requestMoneySchema>;
export type ResponseMoneyRequest = z.infer<typeof responseMoneyRequestSchema>;
export type ConnectEwallet = z.infer<typeof connectEwalletSchema>;
export type ServiceOrderCreate = z.infer<typeof serviceOrderSchema>;

// Midtrans payment validation types
export type MidtransCharge = z.infer<typeof midtransChargeSchema>;
export type MidtransWebhook = z.infer<typeof midtransWebhookSchema>;
export type MidtransStatusParam = z.infer<typeof midtransStatusParamSchema>;

// Common validation schemas for consistent API validation
// Route parameter validation - Fixed to use proper Zod validation instead of throwing errors
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

export const chatIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Chat ID must be a positive integer')
});

export const messageIdParamSchema = z.object({
  messageId: z.coerce.number().int().positive('Message ID must be a positive integer')
});

// Query parameter validation - Fixed to use safe coercion
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1).optional(),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20).optional(),
  offset: z.coerce.number().int().min(0, 'Offset must be non-negative').default(0).optional()
});

export const productFilterQuerySchema = z.object({
  category: z.string().optional(),
  sellerId: z.coerce.number().int().positive('Seller ID must be positive').optional(),
  status: z.enum(['active', 'sold', 'suspended']).optional(),
  minPrice: z.coerce.number().min(0, 'Minimum price must be non-negative').optional(),
  maxPrice: z.coerce.number().min(0, 'Maximum price must be non-negative').optional(),
  search: z.string().max(100, 'Search query too long').trim().optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'newest']).optional(),
  isPremium: z.enum(['all', 'premium', 'regular']).optional()
}).merge(paginationQuerySchema);

export const chatFilterQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'disputed']).optional(),
  productId: z.coerce.number().int().positive('Product ID must be positive').optional()
}).merge(paginationQuerySchema);

// Authentication validation
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long')
});

// 2FA validation schemas
export const twoFactorSetupSchema = z.object({
  // No body needed - just requires authenticated user
});

export const twoFactorVerifySchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits').regex(/^\d+$/, 'Token must contain only digits')
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, 'Password is required')
});

export const twoFactorLoginSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  token: z.string().length(6, 'Token must be 6 digits').regex(/^\d+$/, 'Token must contain only digits').optional(),
  useBackupCode: z.boolean().optional()
}).refine((data) => {
  // Either token or useBackupCode must be provided
  if (data.useBackupCode && !data.token) {
    return false;
  }
  if (!data.useBackupCode && !data.token) {
    return false;
  }
  return true;
}, {
  message: 'Either token or backup code is required',
  path: ['token']
});

export const twoFactorRegenerateCodesSchema = z.object({
  // No body needed - just requires authenticated user with 2FA enabled
});

// SMS 2FA validation schemas
export const smsSendSchema = z.object({
  phoneNumber: z.string()
    .min(10, 'Nomor telepon harus minimal 10 digit')
    .max(15, 'Nomor telepon tidak boleh lebih dari 15 digit')
    .regex(/^[0-9+\-\s()]+$/, 'Nomor telepon hanya boleh mengandung angka dan simbol +, -, (, ), spasi')
});

export const smsVerifySchema = z.object({
  code: z.string()
    .length(6, 'Kode SMS harus 6 digit')
    .regex(/^\d+$/, 'Kode SMS harus berupa angka')
});

// Season Management Schema
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("regular"), // regular, event, tournament, special
  status: text("status").notNull().default("upcoming"), // upcoming, active, ended, archived
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rewards: jsonb("rewards").$type<Record<string, any>>().default({}),
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
  bannerImage: text("banner_image"),
  categories: text("categories").array(),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  registrationFee: decimal("registration_fee", { precision: 15, scale: 2 }).default("0"),
  prizePool: decimal("prize_pool", { precision: 15, scale: 2 }).default("0"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusStartDateIdx: index("seasons_status_start_date_idx").on(table.status, table.startDate),
  typeStatusIdx: index("seasons_type_status_idx").on(table.type, table.status),
  createdByIdx: index("seasons_created_by_idx").on(table.createdBy),
}));

export const seasonParticipants = pgTable("season_participants", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  userId: integer("user_id").notNull().references(() => users.id),
  registeredAt: timestamp("registered_at").defaultNow(),
  rank: integer("rank"),
  score: decimal("score", { precision: 15, scale: 2 }).default("0"),
  rewards: jsonb("rewards").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  seasonUserIdx: uniqueIndex("season_participants_season_user_idx").on(table.seasonId, table.userId),
  seasonRankIdx: index("season_participants_season_rank_idx").on(table.seasonId, table.rank),
}));

export const seasonRewards = pgTable("season_rewards", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasons.id),
  name: text("name").notNull(),
  description: text("description"),
  rewardType: text("reward_type").notNull(), // currency, item, badge, title, special
  rewardValue: jsonb("reward_value").$type<Record<string, any>>().notNull(),
  criteria: jsonb("criteria").$type<Record<string, any>>().notNull(),
  maxClaims: integer("max_claims"),
  currentClaims: integer("current_claims").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  seasonActiveIdx: index("season_rewards_season_active_idx").on(table.seasonId, table.isActive),
}));

// Season Management Relations
export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  creator: one(users, {
    fields: [seasons.createdBy],
    references: [users.id],
  }),
  participants: many(seasonParticipants),
  rewards: many(seasonRewards),
}));

export const seasonParticipantsRelations = relations(seasonParticipants, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonParticipants.seasonId],
    references: [seasons.id],
  }),
  user: one(users, {
    fields: [seasonParticipants.userId],
    references: [users.id],
  }),
}));

export const seasonRewardsRelations = relations(seasonRewards, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonRewards.seasonId],
    references: [seasons.id],
  }),
}));

// Season Management Insert/Select Schemas
export const insertSeasonSchema = createInsertSchema(seasons);
export const insertSeasonParticipantSchema = createInsertSchema(seasonParticipants);
export const insertSeasonRewardSchema = createInsertSchema(seasonRewards);

// Season Types
export type Season = typeof seasons.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type SeasonParticipant = typeof seasonParticipants.$inferSelect;
export type InsertSeasonParticipant = z.infer<typeof insertSeasonParticipantSchema>;
export type SeasonReward = typeof seasonRewards.$inferSelect;
export type InsertSeasonReward = z.infer<typeof insertSeasonRewardSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Security settings validation (password, email, phone number)
export const securitySettingsSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required for security changes'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .optional(),
  email: z.string().email('Please enter a valid email address').optional(),
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^[0-9+\-\s()]+$/, 'Phone number can only contain digits and symbols +, -, (, ), space')
    .optional()
}).refine(
  (data) => data.newPassword || data.email || data.phoneNumber,
  {
    message: "At least one field must be provided for update (newPassword, email, or phoneNumber)"
  }
);

// Role management validation
export const roleUpdateSchema = z.object({
  role: z.enum(['user', 'seller'], {
    errorMap: () => ({ message: 'Role must be either user or seller' })
  })
});

export const adminRequestSchema = z.object({
  reason: z.string()
    .min(10, 'Please provide a detailed reason (minimum 10 characters)')
    .max(500, 'Reason must be less than 500 characters')
    .trim()
});

// File upload validation
export const fileUploadSchema = z.object({
  content: z.string().max(500, 'Message content too long').optional(),
  messageType: z.enum(['text', 'image', 'file', 'audio', 'video']).default('file')
});

// Message deduplication schema
export const messageCreateSchema = insertMessageSchema.extend({
  tempId: z.string().optional(), // Client-generated temporary ID for deduplication
  content: z.string().min(1, 'Message content is required').max(1000, 'Message too long').trim(),
  messageType: z.enum(messageTypeValues).default('text'),
  status: z.enum(messageStatusValues).default('sent'),
});

// Message search filters schema
export const messageSearchFiltersSchema = z.object({
  datePreset: z.enum(['last7', 'last30', 'custom']).optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  senderIds: z.array(z.number()).optional(), // Array of user IDs
  chatIds: z.array(z.number()).optional(), // Array of chat IDs
  scope: z.enum(['current', 'all']).optional(), // Current chat vs all chats
}).refine(
  (data) => {
    // If datePreset is 'custom', both dateFrom and dateTo should be provided
    if (data.datePreset === 'custom') {
      return data.dateFrom && data.dateTo;
    }
    return true;
  },
  {
    message: "When using custom date preset, both dateFrom and dateTo are required",
  }
).refine(
  (data) => {
    // Validate dateFrom <= dateTo when both are provided
    if (data.dateFrom && data.dateTo) {
      const from = new Date(data.dateFrom);
      const to = new Date(data.dateTo);
      return from <= to;
    }
    return true;
  },
  {
    message: "dateFrom must be less than or equal to dateTo",
  }
);

export type MessageSearchFilters = z.infer<typeof messageSearchFiltersSchema>;

// Message search schema (enhanced with new filters)
export const messageSearchSchema = z.object({
  query: z.string().optional(),
  chatId: z.coerce.number().optional(),
  senderId: z.coerce.number().optional(),
  messageType: z.enum([...messageTypeValues, 'all'] as const).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  // New filter fields
  datePreset: z.enum(['last7', 'last30', 'custom']).optional(),
  senderIds: z.string().optional().transform((val) => val ? val.split(',').map(Number) : undefined), // Comma-separated IDs
  chatIds: z.string().optional().transform((val) => val ? val.split(',').map(Number) : undefined), // Comma-separated IDs
  scope: z.enum(['current', 'all']).optional(),
});

// Enhanced error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string(),
  path: z.string().optional(),
  statusCode: z.number()
});

// Types for new schemas
export type IdParam = z.infer<typeof idParamSchema>;
export type ChatIdParam = z.infer<typeof chatIdParamSchema>;
export type MessageIdParam = z.infer<typeof messageIdParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type ProductFilterQuery = z.infer<typeof productFilterQuerySchema>;
export type ChatFilterQuery = z.infer<typeof chatFilterQuerySchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;
export type SecuritySettingsRequest = z.infer<typeof securitySettingsSchema>;
export type RoleUpdateRequest = z.infer<typeof roleUpdateSchema>;
export type AdminRequestData = z.infer<typeof adminRequestSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type MessageCreateData = z.infer<typeof messageCreateSchema>;
export type MessageSearchQuery = z.infer<typeof messageSearchSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Payment and Transaction related schemas for admin panel
export const paymentStatsSchema = z.object({
  totalTransactions: z.number(),
  totalRevenue: z.string(),
  pendingTransactions: z.number(),
  completedTransactions: z.number(),
  failedTransactions: z.number(),
  refundedTransactions: z.number(),
  averageTransactionValue: z.string(),
  todayRevenue: z.string(),
  weeklyGrowth: z.number(),
  monthlyRevenue: z.string(),
  topPaymentMethods: z.array(z.object({
    method: z.string(),
    count: z.number(),
    amount: z.string()
  })),
  fraudulentTransactions: z.number(),
  chargebackRate: z.number(),
});

export const fraudAlertSchema = z.object({
  id: z.number(),
  userId: z.number(),
  transactionId: z.number().optional(),
  alertType: z.enum(['high_risk', 'critical_risk', 'velocity', 'device_suspicious', 'behavioral_anomaly', 'manual_review']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  message: z.string(),
  riskScore: z.number(),
  riskFactors: z.array(z.string()),
  metadata: z.record(z.any()),
  status: z.enum(['active', 'acknowledged', 'resolved', 'false_positive']),
  assignedTo: z.number().optional(),
  acknowledgedBy: z.number().optional(),
  acknowledgedAt: z.string().optional(),
  resolvedBy: z.number().optional(),
  resolvedAt: z.string().optional(),
  resolutionNote: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PaymentStats = z.infer<typeof paymentStatsSchema>;
export type FraudAlertLegacy = z.infer<typeof fraudAlertSchema>;

// Extended transaction types for admin panel
export type TransactionWithDetails = typeof transactions.$inferSelect & {
  buyer?: Pick<User, 'username' | 'email'>;
  seller?: Pick<User, 'username' | 'email'>;
  product?: Pick<Product, 'title' | 'category'>;
};
export type WalletTransactionWithUser = typeof walletTransactions.$inferSelect & {
  user?: Pick<User, 'username' | 'email'>;
};

// SMS Logs Table
export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull(), // sent, failed, pending
  priority: text("priority").notNull(), // low, medium, high, critical
  alertType: text("alert_type").notNull(), // test, suspicious_login, payment_fraud, security_alert, etc.
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  phoneNumberIdx: index("sms_logs_phone_number_idx").on(table.phoneNumber),
  statusIdx: index("sms_logs_status_idx").on(table.status),
  alertTypeIdx: index("sms_logs_alert_type_idx").on(table.alertType),
  createdAtIdx: index("sms_logs_created_at_idx").on(table.createdAt),
}));

// SMS Logs Insert/Select Schemas
export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({ id: true, createdAt: true });

// SMS Logs Types
export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;

// Privacy Settings Table
export const privacySettings = pgTable("privacy_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  profileVisibility: boolean("profile_visibility").default(true),
  showOnlineStatus: boolean("show_online_status").default(true),
  allowMessageFromStrangers: boolean("allow_message_from_strangers").default(false),
  showPurchaseHistory: boolean("show_purchase_history").default(false),
  allowProductIndexing: boolean("allow_product_indexing").default(true),
  shareActivityStatus: boolean("share_activity_status").default(true),
  allowDataAnalytics: boolean("allow_data_analytics").default(true),
  enableReadReceipts: boolean("enable_read_receipts").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("privacy_settings_user_id_idx").on(table.userId),
}));

// Blocked Users Table
export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull().references(() => users.id),
  blockedId: integer("blocked_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  blockerIdIdx: index("blocked_users_blocker_id_idx").on(table.blockerId),
  blockedIdIdx: index("blocked_users_blocked_id_idx").on(table.blockedId),
  uniqueBlock: uniqueIndex("unique_blocker_blocked").on(table.blockerId, table.blockedId),
}));

// Payment Methods Table
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // card, bank, ewallet
  name: text("name").notNull(),
  details: text("details").notNull(), // Masked card/account number
  isDefault: boolean("is_default").default(false),
  isVerified: boolean("is_verified").default(false),
  expiresAt: text("expires_at"), // MM/YY format for cards
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("payment_methods_user_id_idx").on(table.userId),
  userIdDefaultIdx: index("payment_methods_user_default_idx").on(table.userId, table.isDefault),
}));

// User Feedback Table
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(), // bug, feature, improvement, general
  rating: integer("rating").notNull(), // 1-5 stars
  message: text("message").notNull(),
  status: text("status").default("pending"), // pending, reviewed, fixed
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_feedback_user_id_idx").on(table.userId),
  statusIdx: index("user_feedback_status_idx").on(table.status),
  categoryIdx: index("user_feedback_category_idx").on(table.category),
}));

// Platform Connections Table
export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platformId: text("platform_id").notNull(), // google, facebook, steam, discord, etc.
  platformName: text("platform_name").notNull(),
  platformType: text("platform_type").notNull(), // social, gaming, payment, other
  accountInfo: text("account_info"), // Display info (email, username, etc.)
  accessToken: text("access_token"), // OAuth token (encrypted)
  refreshToken: text("refresh_token"), // OAuth refresh token (encrypted)
  tokenExpiry: timestamp("token_expiry"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("platform_connections_user_id_idx").on(table.userId),
  platformIdIdx: index("platform_connections_platform_id_idx").on(table.platformId),
  userPlatformIdx: uniqueIndex("unique_user_platform").on(table.userId, table.platformId),
}));

// Regional Settings Table
export const regionalSettings = pgTable("regional_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  language: text("language").default("id"), // id, en, ms, th, vi
  currencyFormat: text("currency_format").default("IDR"), // IDR, USD, etc.
  dateFormat: text("date_format").default("DD/MM/YYYY"), // DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
  timezone: text("timezone").default("Asia/Jakarta"), // WIB (GMT+7), etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("regional_settings_user_id_idx").on(table.userId),
}));

// Insert Schemas
export const insertPrivacySettingsSchema = createInsertSchema(privacySettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRegionalSettingsSchema = createInsertSchema(regionalSettings).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type PrivacySettings = typeof privacySettings.$inferSelect;
export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type RegionalSettings = typeof regionalSettings.$inferSelect;
export type InsertRegionalSettings = z.infer<typeof insertRegionalSettingsSchema>;
