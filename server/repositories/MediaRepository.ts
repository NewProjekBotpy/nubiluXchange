import {
  statusUpdates, news, notifications, posterGenerations, reposts, reviews, reviewHelpfulVotes,
  videoComments, statusViews, uploadedFiles, videoContent, videoContentLikes, videoContentSaves,
  videoContentComments, seasons, seasonParticipants, seasonRewards, users, products, transactions,
  type StatusUpdate, type InsertStatusUpdate, type StatusUpdateWithUser,
  type News, type InsertNews,
  type Notification, type InsertNotification,
  type PosterGeneration, type InsertPosterGeneration,
  type Repost, type InsertRepost,
  type Review, type InsertReview,
  type ReviewHelpfulVote, type InsertReviewHelpfulVote,
  type VideoComment, type InsertVideoComment,
  type StatusView, type InsertStatusView,
  type UploadedFile, type InsertUploadedFile,
  type VideoContent, type InsertVideoContent, type VideoContentWithUser,
  type VideoContentLike, type InsertVideoContentLike,
  type VideoContentSave, type InsertVideoContentSave,
  type VideoContentComment, type InsertVideoContentComment,
  type Season, type InsertSeason,
  type SeasonParticipant, type InsertSeasonParticipant,
  type SeasonReward, type InsertSeasonReward,
  type User,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, gt, lt, gte, lte, ne, count, sum, like, ilike, sql } from "drizzle-orm";

/**
 * File upload tracking types
 */
export interface FileItem extends UploadedFile {
  uploaderUsername: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  otherCount: number;
}

/**
 * Media Repository Interface
 * Handles all media, status, and content-related database operations
 */
export interface IMediaRepository {
  // Status Update Operations (4 methods)
  getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]>;
  getUserStatusUpdates(userId: number): Promise<StatusUpdateWithUser[]>;
  createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate>;
  deleteStatusUpdate(id: number, userId: number): Promise<boolean>;

  // Status View Operations (4 methods)
  recordStatusView(statusId: number, viewerId: number): Promise<void>;
  getStatusViews(statusId: number): Promise<Array<{id: number, username: string, profilePicture: string | null, viewedAt: Date}>>;
  getUserStatusViews(userId: number): Promise<number[]>;
  hasUserViewedStatus(statusId: number, viewerId: number): Promise<boolean>;

  // Review Operations (11 methods)
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByProduct(productId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  getReviewsBySeller(sellerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  getReviewsByBuyer(buyerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  getProductReviewStats(productId: number): Promise<{ averageRating: number; totalReviews: number }>;
  getSellerReviewStats(sellerId: number): Promise<{ averageRating: number; totalReviews: number }>;
  updateProductRatingAndCount(productId: number): Promise<void>;
  checkUserCanReview(buyerId: number, productId: number): Promise<boolean>;

  // Review Helpful Votes (5 methods)
  createReviewHelpfulVote(vote: InsertReviewHelpfulVote): Promise<ReviewHelpfulVote>;
  removeReviewHelpfulVote(reviewId: number, userId: number): Promise<boolean>;
  checkUserVotedHelpful(reviewId: number, userId: number): Promise<boolean>;
  getReviewHelpfulVoteCount(reviewId: number): Promise<number>;
  updateReviewHelpfulVotesCount(reviewId: number): Promise<void>;

  // Video Comment Operations (4 methods)
  getVideoComments(statusId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoComment(comment: InsertVideoComment): Promise<VideoComment>;
  getVideoCommentCount(statusId: number): Promise<number>;
  deleteVideoComment(id: number, userId: number): Promise<boolean>;

  // News Operations (6 methods)
  getAllNews(): Promise<News[]>;
  getPublishedNews(): Promise<News[]>;
  getNewsById(id: number): Promise<News | undefined>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: number, updates: Partial<News>): Promise<News | undefined>;
  deleteNews(id: number): Promise<boolean>;

  // Notification Operations (6 methods)
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Poster Generation (2 methods)
  createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration>;
  updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined>;

  // Repost Operations (5 methods)
  getRepost(userId: number, productId?: number, statusId?: number): Promise<Repost | undefined>;
  createRepost(repost: InsertRepost): Promise<Repost>;
  deleteRepost(userId: number, productId?: number, statusId?: number): Promise<void>;
  getRepostsByUser(userId: number): Promise<Repost[]>;
  getRepostCountByProduct(productId: number): Promise<number>;
  getRepostCountByStatus(statusId: number): Promise<number>;

  // Season Operations (9 methods)
  getAllSeasons(): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined>;
  deleteSeason(id: number): Promise<boolean>;
  getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>>;
  createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant>;
  updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined>;
  getSeasonRewards(seasonId: number): Promise<SeasonReward[]>;
  createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward>;
  updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined>;

  // Video Content Operations (18 methods)
  getVideoContent(filters?: {
    userId?: number;
    category?: string;
    contentType?: string;
    musicName?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'views' | 'likes';
  }): Promise<VideoContentWithUser[]>;
  getVideoContentById(id: number): Promise<VideoContent | undefined>;
  createVideoContent(content: InsertVideoContent): Promise<VideoContent>;
  updateVideoContent(id: number, updates: Partial<VideoContent>): Promise<VideoContent | undefined>;
  deleteVideoContent(id: number, userId: number): Promise<boolean>;
  incrementVideoViews(id: number): Promise<void>;
  incrementVideoLikes(id: number): Promise<void>;
  decrementVideoLikes(id: number): Promise<void>;
  incrementVideoShares(id: number): Promise<void>;
  incrementVideoSaves(id: number): Promise<void>;
  decrementVideoSaves(id: number): Promise<void>;
  likeVideoContent(videoId: number, userId: number): Promise<void>;
  unlikeVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoLikedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserLikedVideos(userId: number): Promise<number[]>;
  saveVideoContent(videoId: number, userId: number): Promise<void>;
  unsaveVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoSavedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserSavedVideos(userId: number): Promise<number[]>;

  // Video Content Comments (4 methods)
  getVideoContentComments(videoId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoContentComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment>;
  getVideoContentCommentCount(videoId: number): Promise<number>;
  deleteVideoContentComment(id: number, userId: number): Promise<boolean>;

  // File Upload Operations (4 methods)
  getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]>;
  getUploadedFile(id: number): Promise<FileItem | undefined>;
  createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile>;
  deleteUploadedFile(id: number): Promise<boolean>;
  getUploadedFilesStats(): Promise<StorageStats>;
}

/**
 * Media Repository Implementation
 * Manages all media, status, and content-related data operations
 */
export class MediaRepository implements IMediaRepository {
  // ==================== Status Update Operations ====================
  
  /**
   * Get all active status updates with user information
   */
  async getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]> {
    const now = new Date();
    return await db.select({
      id: statusUpdates.id,
      userId: statusUpdates.userId,
      content: statusUpdates.content,
      description: statusUpdates.description,
      media: statusUpdates.media,
      images: statusUpdates.images,
      mediaType: statusUpdates.mediaType,
      duration: statusUpdates.duration,
      backgroundColor: statusUpdates.backgroundColor,
      stickers: statusUpdates.stickers,
      textOverlays: statusUpdates.textOverlays,
      trimStart: statusUpdates.trimStart,
      trimEnd: statusUpdates.trimEnd,
      musicUrl: statusUpdates.musicUrl,
      drawingData: statusUpdates.drawingData,
      isPublic: statusUpdates.isPublic,
      viewCount: statusUpdates.viewCount,
      expiresAt: statusUpdates.expiresAt,
      createdAt: statusUpdates.createdAt,
      username: users.username,
    }).from(statusUpdates)
      .innerJoin(users, eq(statusUpdates.userId, users.id))
      .where(
        and(
          eq(statusUpdates.isPublic, true),
          gt(statusUpdates.expiresAt, now)
        )
      )
      .orderBy(desc(statusUpdates.createdAt));
  }

  /**
   * Get status updates for a specific user
   */
  async getUserStatusUpdates(userId: number): Promise<StatusUpdateWithUser[]> {
    return await db.select({
      id: statusUpdates.id,
      userId: statusUpdates.userId,
      content: statusUpdates.content,
      description: statusUpdates.description,
      media: statusUpdates.media,
      images: statusUpdates.images,
      mediaType: statusUpdates.mediaType,
      duration: statusUpdates.duration,
      backgroundColor: statusUpdates.backgroundColor,
      stickers: statusUpdates.stickers,
      textOverlays: statusUpdates.textOverlays,
      trimStart: statusUpdates.trimStart,
      trimEnd: statusUpdates.trimEnd,
      musicUrl: statusUpdates.musicUrl,
      drawingData: statusUpdates.drawingData,
      isPublic: statusUpdates.isPublic,
      viewCount: statusUpdates.viewCount,
      expiresAt: statusUpdates.expiresAt,
      createdAt: statusUpdates.createdAt,
      username: users.username,
    }).from(statusUpdates)
      .innerJoin(users, eq(statusUpdates.userId, users.id))
      .where(eq(statusUpdates.userId, userId))
      .orderBy(desc(statusUpdates.createdAt));
  }

  /**
   * Create a new status update
   */
  async createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate> {
    const statusValue = status as typeof statusUpdates.$inferInsert;
    const [newStatus] = await db.insert(statusUpdates).values(statusValue).returning();
    return newStatus;
  }

  /**
   * Delete a status update (user must own the status)
   */
  async deleteStatusUpdate(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(statusUpdates)
      .where(and(eq(statusUpdates.id, id), eq(statusUpdates.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ==================== Status View Operations ====================
  
  /**
   * Record a view for a status update
   */
  async recordStatusView(statusId: number, viewerId: number): Promise<void> {
    try {
      await db.insert(statusViews).values({
        statusId,
        viewerId
      });
    } catch (error: any) {
      if (error.code === '23505') {
        return;
      }
      throw error;
    }
  }

  /**
   * Get all viewers for a status update
   */
  async getStatusViews(statusId: number): Promise<Array<{id: number, username: string, profilePicture: string | null, viewedAt: Date}>> {
    const views = await db.select({
      id: users.id,
      username: users.username,
      profilePicture: users.profilePicture,
      viewedAt: statusViews.viewedAt
    }).from(statusViews)
      .innerJoin(users, eq(statusViews.viewerId, users.id))
      .where(eq(statusViews.statusId, statusId))
      .orderBy(desc(statusViews.viewedAt));
    
    return views.map(v => ({
      id: v.id,
      username: v.username,
      profilePicture: v.profilePicture,
      viewedAt: v.viewedAt || new Date()
    }));
  }

  /**
   * Get all status IDs viewed by a user
   */
  async getUserStatusViews(userId: number): Promise<number[]> {
    const views = await db.select({
      statusId: statusViews.statusId
    }).from(statusViews)
      .where(eq(statusViews.viewerId, userId));
    
    return views.map(v => v.statusId);
  }

  /**
   * Check if a user has viewed a specific status
   */
  async hasUserViewedStatus(statusId: number, viewerId: number): Promise<boolean> {
    const [view] = await db.select()
      .from(statusViews)
      .where(and(
        eq(statusViews.statusId, statusId),
        eq(statusViews.viewerId, viewerId)
      ));
    
    return !!view;
  }

  // ==================== Review Operations ====================
  
  /**
   * Get a review by ID
   */
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review || undefined;
  }

  /**
   * Get reviews for a product
   */
  async getReviewsByProduct(productId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    const query = db.select().from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.isPublic, true), eq(reviews.moderationStatus, 'approved')))
      .orderBy(desc(reviews.createdAt))
      .$dynamic();
    
    if (filters?.limit) {
      query.limit(filters.limit);
      if (filters?.offset) {
        query.offset(filters.offset);
      }
    }
    
    return await query;
  }

  /**
   * Get reviews for a seller
   */
  async getReviewsBySeller(sellerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    const query = db.select().from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isPublic, true), eq(reviews.moderationStatus, 'approved')))
      .orderBy(desc(reviews.createdAt))
      .$dynamic();
    
    if (filters?.limit) {
      query.limit(filters.limit);
      if (filters?.offset) {
        query.offset(filters.offset);
      }
    }
    
    return await query;
  }

  /**
   * Get reviews created by a buyer
   */
  async getReviewsByBuyer(buyerId: number, filters?: { limit?: number; offset?: number }): Promise<Review[]> {
    const query = db.select().from(reviews)
      .where(eq(reviews.buyerId, buyerId))
      .orderBy(desc(reviews.createdAt))
      .$dynamic();
    
    if (filters?.limit) {
      query.limit(filters.limit);
      if (filters?.offset) {
        query.offset(filters.offset);
      }
    }
    
    return await query;
  }

  /**
   * Create a new review
   */
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update product rating and count after creating review
    await this.updateProductRatingAndCount(review.productId);
    
    return newReview;
  }

  /**
   * Update a review
   */
  async updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined> {
    const [review] = await db.update(reviews).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(reviews.id, id)).returning();
    
    if (review) {
      // Update product rating and count after updating review
      await this.updateProductRatingAndCount(review.productId);
    }
    
    return review || undefined;
  }

  /**
   * Delete a review
   */
  async deleteReview(id: number): Promise<boolean> {
    const [deletedReview] = await db.delete(reviews).where(eq(reviews.id, id)).returning();
    
    if (deletedReview) {
      // Update product rating and count after deleting review
      await this.updateProductRatingAndCount(deletedReview.productId);
      return true;
    }
    
    return false;
  }

  /**
   * Get review statistics for a product
   */
  async getProductReviewStats(productId: number): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await db.select({
      avgRating: sum(reviews.rating),
      count: count(reviews.id)
    }).from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.moderationStatus, 'approved')));
    
    const stats = result[0];
    const totalReviews = Number(stats.count) || 0;
    const averageRating = totalReviews > 0 ? Number(stats.avgRating) / totalReviews : 0;
    
    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews
    };
  }

  /**
   * Get review statistics for a seller
   */
  async getSellerReviewStats(sellerId: number): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await db.select({
      avgRating: sum(reviews.rating),
      count: count(reviews.id)
    }).from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.moderationStatus, 'approved')));
    
    const stats = result[0];
    const totalReviews = Number(stats.count) || 0;
    const averageRating = totalReviews > 0 ? Number(stats.avgRating) / totalReviews : 0;
    
    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews
    };
  }

  /**
   * Update product's rating and review count
   */
  async updateProductRatingAndCount(productId: number): Promise<void> {
    const stats = await this.getProductReviewStats(productId);
    
    await db.update(products)
      .set({
        rating: stats.averageRating.toString(),
        reviewCount: stats.totalReviews
      })
      .where(eq(products.id, productId));
  }

  /**
   * Check if a user can review a product
   */
  async checkUserCanReview(buyerId: number, productId: number): Promise<boolean> {
    // Check if user has completed a transaction for this product
    const [transaction] = await db.select().from(transactions)
      .where(and(
        eq(transactions.buyerId, buyerId),
        eq(transactions.productId, productId),
        eq(transactions.status, 'completed')
      ));
    
    if (!transaction) {
      return false;
    }
    
    // Check if user hasn't already reviewed this product
    const [existingReview] = await db.select().from(reviews)
      .where(and(
        eq(reviews.buyerId, buyerId),
        eq(reviews.productId, productId)
      ));
    
    return !existingReview;
  }

  // ==================== Review Helpful Votes ====================
  
  /**
   * Create a helpful vote for a review
   */
  async createReviewHelpfulVote(vote: InsertReviewHelpfulVote): Promise<ReviewHelpfulVote> {
    const [newVote] = await db.insert(reviewHelpfulVotes)
      .values(vote)
      .onConflictDoNothing({ target: [reviewHelpfulVotes.userId, reviewHelpfulVotes.reviewId] })
      .returning();
    
    await this.updateReviewHelpfulVotesCount(vote.reviewId);
    
    if (!newVote) {
      const [existingVote] = await db.select().from(reviewHelpfulVotes)
        .where(and(
          eq(reviewHelpfulVotes.reviewId, vote.reviewId),
          eq(reviewHelpfulVotes.userId, vote.userId)
        ));
      return existingVote;
    }
    
    return newVote;
  }

  /**
   * Remove a helpful vote from a review
   */
  async removeReviewHelpfulVote(reviewId: number, userId: number): Promise<boolean> {
    const [deletedVote] = await db.delete(reviewHelpfulVotes)
      .where(and(
        eq(reviewHelpfulVotes.reviewId, reviewId),
        eq(reviewHelpfulVotes.userId, userId)
      ))
      .returning();
    
    if (deletedVote) {
      await this.updateReviewHelpfulVotesCount(reviewId);
      return true;
    }
    
    return false;
  }

  /**
   * Check if a user voted helpful for a review
   */
  async checkUserVotedHelpful(reviewId: number, userId: number): Promise<boolean> {
    const [vote] = await db.select().from(reviewHelpfulVotes)
      .where(and(
        eq(reviewHelpfulVotes.reviewId, reviewId),
        eq(reviewHelpfulVotes.userId, userId)
      ));
    
    return !!vote;
  }

  /**
   * Get the count of helpful votes for a review
   */
  async getReviewHelpfulVoteCount(reviewId: number): Promise<number> {
    const result = await db.select({
      count: count(reviewHelpfulVotes.id)
    }).from(reviewHelpfulVotes)
      .where(eq(reviewHelpfulVotes.reviewId, reviewId));
    
    return Number(result[0]?.count) || 0;
  }

  /**
   * Update the helpful votes count on a review
   */
  async updateReviewHelpfulVotesCount(reviewId: number): Promise<void> {
    const voteCount = await this.getReviewHelpfulVoteCount(reviewId);
    
    await db.update(reviews)
      .set({ helpfulVotes: voteCount })
      .where(eq(reviews.id, reviewId));
  }

  // ==================== Video Comment Operations ====================
  
  /**
   * Get comments for a status video
   */
  async getVideoComments(statusId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>> {
    const query = db.select({
      id: videoComments.id,
      statusId: videoComments.statusId,
      userId: videoComments.userId,
      comment: videoComments.comment,
      createdAt: videoComments.createdAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture
      }
    }).from(videoComments)
      .innerJoin(users, eq(videoComments.userId, users.id))
      .where(eq(videoComments.statusId, statusId))
      .orderBy(desc(videoComments.createdAt))
      .$dynamic();

    if (filters?.limit) {
      query.limit(filters.limit);
    }
    if (filters?.offset) {
      query.offset(filters.offset);
    }

    return await query;
  }

  /**
   * Create a comment on a status video
   */
  async createVideoComment(comment: InsertVideoComment): Promise<VideoComment> {
    const [newComment] = await db.insert(videoComments).values(comment).returning();
    return newComment;
  }

  /**
   * Get the count of comments for a status video
   */
  async getVideoCommentCount(statusId: number): Promise<number> {
    const result = await db.select({
      count: count(videoComments.id)
    }).from(videoComments)
      .where(eq(videoComments.statusId, statusId));
    
    return Number(result[0]?.count) || 0;
  }

  /**
   * Delete a comment (user must own the comment)
   */
  async deleteVideoComment(id: number, userId: number): Promise<boolean> {
    const [deletedComment] = await db.delete(videoComments)
      .where(and(
        eq(videoComments.id, id),
        eq(videoComments.userId, userId)
      ))
      .returning();
    
    return !!deletedComment;
  }

  // ==================== News Operations ====================
  
  /**
   * Get all news articles (including unpublished) for admin
   */
  async getAllNews(): Promise<News[]> {
    return await db.select().from(news)
      .orderBy(desc(news.isPinned), desc(news.createdAt));
  }

  /**
   * Get all published news articles
   */
  async getPublishedNews(): Promise<News[]> {
    return await db.select().from(news)
      .where(eq(news.isPublished, true))
      .orderBy(desc(news.isPinned), desc(news.createdAt));
  }

  /**
   * Get a news article by ID
   */
  async getNewsById(id: number): Promise<News | undefined> {
    const [newsItem] = await db.select().from(news)
      .where(and(eq(news.id, id), eq(news.isPublished, true)));
    return newsItem;
  }

  /**
   * Create a news article
   */
  async createNews(newsData: InsertNews): Promise<News> {
    const [newNews] = await db.insert(news).values(newsData as any).returning();
    return newNews;
  }

  /**
   * Update a news article
   */
  async updateNews(id: number, updates: Partial<InsertNews>): Promise<News | undefined> {
    const [updatedNews] = await db.update(news)
      .set(updates as any)
      .where(eq(news.id, id))
      .returning();
    return updatedNews;
  }

  /**
   * Delete a news article
   */
  async deleteNews(id: number): Promise<boolean> {
    const result = await db.delete(news)
      .where(eq(news.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== Notification Operations ====================
  
  /**
   * Get a notification by ID
   */
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * Create a notification
   */
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  /**
   * Update a notification
   */
  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    const [updatedNotification] = await db.update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // ==================== Poster Generation Operations ====================
  
  /**
   * Create a poster generation request
   */
  async createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration> {
    const posterData = {
      ...poster,
      selectedSkins: [...poster.selectedSkins] as string[]
    };
    const result = await db.insert(posterGenerations).values([posterData]).returning();
    return result[0];
  }

  /**
   * Update a poster generation request
   */
  async updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined> {
    const [poster] = await db.update(posterGenerations).set(updates).where(eq(posterGenerations.id, id)).returning();
    return poster || undefined;
  }

  // ==================== Repost Operations ====================
  
  /**
   * Get a repost by user and content
   */
  async getRepost(userId: number, productId?: number, statusId?: number): Promise<Repost | undefined> {
    const conditions = [eq(reposts.userId, userId)];
    
    if (productId) {
      conditions.push(eq(reposts.productId, productId));
    }
    if (statusId) {
      conditions.push(eq(reposts.statusId, statusId));
    }
    
    const [repost] = await db.select().from(reposts)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    return repost || undefined;
  }

  /**
   * Create a repost
   */
  async createRepost(repost: InsertRepost): Promise<Repost> {
    const [newRepost] = await db.insert(reposts).values(repost).returning();
    return newRepost;
  }

  /**
   * Delete a repost
   */
  async deleteRepost(userId: number, productId?: number, statusId?: number): Promise<void> {
    const conditions = [eq(reposts.userId, userId)];
    
    if (productId) {
      conditions.push(eq(reposts.productId, productId));
    }
    if (statusId) {
      conditions.push(eq(reposts.statusId, statusId));
    }
    
    await db.delete(reposts)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }

  /**
   * Get all reposts by a user
   */
  async getRepostsByUser(userId: number): Promise<Repost[]> {
    return await db.select().from(reposts)
      .where(eq(reposts.userId, userId))
      .orderBy(desc(reposts.createdAt));
  }

  /**
   * Get repost count for a product
   */
  async getRepostCountByProduct(productId: number): Promise<number> {
    const [result] = await db.select({ count: db.$count(reposts) }).from(reposts)
      .where(eq(reposts.productId, productId));
    return result?.count || 0;
  }

  /**
   * Get repost count for a status
   */
  async getRepostCountByStatus(statusId: number): Promise<number> {
    const [result] = await db.select({ count: db.$count(reposts) }).from(reposts)
      .where(eq(reposts.statusId, statusId));
    return result?.count || 0;
  }

  // ==================== Season Operations ====================
  
  /**
   * Get all seasons
   */
  async getAllSeasons(): Promise<Season[]> {
    return await db.select().from(seasons).orderBy(desc(seasons.createdAt));
  }

  /**
   * Get a season by ID
   */
  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season || undefined;
  }

  /**
   * Create a new season
   */
  async createSeason(season: InsertSeason): Promise<Season> {
    const [newSeason] = await db.insert(seasons).values(season).returning();
    return newSeason;
  }

  /**
   * Update a season
   */
  async updateSeason(id: number, updates: Partial<Season>): Promise<Season | undefined> {
    const [updated] = await db.update(seasons)
      .set(updates)
      .where(eq(seasons.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Delete a season
   */
  async deleteSeason(id: number): Promise<boolean> {
    const result = await db.delete(seasons).where(eq(seasons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get participants for a season
   */
  async getSeasonParticipants(seasonId: number): Promise<Array<SeasonParticipant & { user?: Pick<User, 'id' | 'username' | 'email' | 'profilePicture'> }>> {
    const participants = await db.select({
      id: seasonParticipants.id,
      seasonId: seasonParticipants.seasonId,
      userId: seasonParticipants.userId,
      registeredAt: seasonParticipants.registeredAt,
      rank: seasonParticipants.rank,
      score: seasonParticipants.score,
      rewards: seasonParticipants.rewards,
      isActive: seasonParticipants.isActive,
      user: {
        id: users.id,
        username: users.username,
        email: users.email,
        profilePicture: users.profilePicture
      }
    })
    .from(seasonParticipants)
    .leftJoin(users, eq(seasonParticipants.userId, users.id))
    .where(eq(seasonParticipants.seasonId, seasonId))
    .orderBy(seasonParticipants.rank);

    return participants as any;
  }

  /**
   * Create a season participant
   */
  async createSeasonParticipant(participant: InsertSeasonParticipant): Promise<SeasonParticipant> {
    const [newParticipant] = await db.insert(seasonParticipants).values(participant).returning();
    return newParticipant;
  }

  /**
   * Update a season participant
   */
  async updateSeasonParticipant(id: number, updates: Partial<SeasonParticipant>): Promise<SeasonParticipant | undefined> {
    const [updated] = await db.update(seasonParticipants)
      .set(updates)
      .where(eq(seasonParticipants.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Get rewards for a season
   */
  async getSeasonRewards(seasonId: number): Promise<SeasonReward[]> {
    return await db.select().from(seasonRewards)
      .where(eq(seasonRewards.seasonId, seasonId))
      .orderBy(desc(seasonRewards.createdAt));
  }

  /**
   * Create a season reward
   */
  async createSeasonReward(reward: InsertSeasonReward): Promise<SeasonReward> {
    const [newReward] = await db.insert(seasonRewards).values(reward).returning();
    return newReward;
  }

  /**
   * Update a season reward
   */
  async updateSeasonReward(id: number, updates: Partial<SeasonReward>): Promise<SeasonReward | undefined> {
    const [updated] = await db.update(seasonRewards)
      .set(updates)
      .where(eq(seasonRewards.id, id))
      .returning();
    return updated || undefined;
  }

  // ==================== Video Content Operations ====================
  
  /**
   * Get video content with filters
   */
  async getVideoContent(filters?: {
    userId?: number;
    category?: string;
    contentType?: string;
    musicName?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'views' | 'likes';
  }): Promise<VideoContentWithUser[]> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    const sortBy = filters?.sortBy || 'createdAt';
    
    const conditions = [eq(videoContent.isPublic, true)];
    
    if (filters?.userId) {
      conditions.push(eq(videoContent.userId, filters.userId));
    }
    
    if (filters?.category) {
      conditions.push(eq(videoContent.category, filters.category));
    }
    
    if (filters?.contentType) {
      conditions.push(eq(videoContent.contentType, filters.contentType));
    }
    
    if (filters?.musicName) {
      conditions.push(eq(videoContent.musicName, filters.musicName));
    }
    
    let query = db
      .select({
        id: videoContent.id,
        userId: videoContent.userId,
        title: videoContent.title,
        videoUrl: videoContent.videoUrl,
        thumbnailUrl: videoContent.thumbnailUrl,
        images: videoContent.images,
        contentType: videoContent.contentType,
        musicName: videoContent.musicName,
        musicUrl: videoContent.musicUrl,
        tags: videoContent.tags,
        category: videoContent.category,
        isPublic: videoContent.isPublic,
        isPinned: videoContent.isPinned,
        likes: videoContent.likes,
        comments: videoContent.comments,
        shares: videoContent.shares,
        saves: videoContent.saves,
        views: videoContent.views,
        createdAt: videoContent.createdAt,
        updatedAt: videoContent.updatedAt,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
      })
      .from(videoContent)
      .innerJoin(users, eq(videoContent.userId, users.id))
      .where(and(...conditions));
    
    if (sortBy === 'views') {
      query = query.orderBy(desc(videoContent.views)) as any;
    } else if (sortBy === 'likes') {
      query = query.orderBy(desc(videoContent.likes)) as any;
    } else {
      query = query.orderBy(desc(videoContent.createdAt)) as any;
    }
    
    const results = await query.limit(limit).offset(offset);
    return results as VideoContentWithUser[];
  }

  /**
   * Get video content by ID
   */
  async getVideoContentById(id: number): Promise<VideoContent | undefined> {
    const [content] = await db.select().from(videoContent).where(eq(videoContent.id, id));
    return content || undefined;
  }

  /**
   * Create video content
   */
  async createVideoContent(content: InsertVideoContent): Promise<VideoContent> {
    const [created] = await db.insert(videoContent).values(content).returning();
    return created;
  }

  /**
   * Update video content
   */
  async updateVideoContent(id: number, updates: Partial<VideoContent>): Promise<VideoContent | undefined> {
    const [updated] = await db.update(videoContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoContent.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Delete video content (user must own the content)
   */
  async deleteVideoContent(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(videoContent)
      .where(and(
        eq(videoContent.id, id),
        eq(videoContent.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  /**
   * Increment video views
   */
  async incrementVideoViews(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ views: sql`${videoContent.views} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video likes
   */
  async incrementVideoLikes(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ likes: sql`${videoContent.likes} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Decrement video likes
   */
  async decrementVideoLikes(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ likes: sql`${videoContent.likes} - 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video shares
   */
  async incrementVideoShares(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ shares: sql`${videoContent.shares} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video saves
   */
  async incrementVideoSaves(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ saves: sql`${videoContent.saves} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Decrement video saves
   */
  async decrementVideoSaves(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ saves: sql`${videoContent.saves} - 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Like video content
   */
  async likeVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(videoContentLikes)
        .values({ videoId, userId })
        .onConflictDoNothing({ target: [videoContentLikes.userId, videoContentLikes.videoId] });
      
      await tx.update(videoContent)
        .set({ likes: sql`${videoContent.likes} + 1` })
        .where(eq(videoContent.id, videoId));
    });
  }

  /**
   * Unlike video content
   */
  async unlikeVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const result = await tx.delete(videoContentLikes)
        .where(and(
          eq(videoContentLikes.videoId, videoId),
          eq(videoContentLikes.userId, userId)
        ))
        .returning();
      
      if (result.length > 0) {
        await tx.update(videoContent)
          .set({ likes: sql`${videoContent.likes} - 1` })
          .where(eq(videoContent.id, videoId));
      }
    });
  }

  /**
   * Check if video is liked by user
   */
  async isVideoLikedByUser(videoId: number, userId: number): Promise<boolean> {
    const [like] = await db.select()
      .from(videoContentLikes)
      .where(and(
        eq(videoContentLikes.videoId, videoId),
        eq(videoContentLikes.userId, userId)
      ))
      .limit(1);
    return !!like;
  }

  /**
   * Get user's liked videos
   */
  async getUserLikedVideos(userId: number): Promise<number[]> {
    const likes = await db.select({ videoId: videoContentLikes.videoId })
      .from(videoContentLikes)
      .where(eq(videoContentLikes.userId, userId))
      .orderBy(desc(videoContentLikes.createdAt));
    return likes.map(like => like.videoId);
  }

  /**
   * Save video content
   */
  async saveVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(videoContentSaves)
        .values({ videoId, userId })
        .onConflictDoNothing({ target: [videoContentSaves.userId, videoContentSaves.videoId] });
      
      await tx.update(videoContent)
        .set({ saves: sql`${videoContent.saves} + 1` })
        .where(eq(videoContent.id, videoId));
    });
  }

  /**
   * Unsave video content
   */
  async unsaveVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const result = await tx.delete(videoContentSaves)
        .where(and(
          eq(videoContentSaves.videoId, videoId),
          eq(videoContentSaves.userId, userId)
        ))
        .returning();
      
      if (result.length > 0) {
        await tx.update(videoContent)
          .set({ saves: sql`${videoContent.saves} - 1` })
          .where(eq(videoContent.id, videoId));
      }
    });
  }

  /**
   * Check if video is saved by user
   */
  async isVideoSavedByUser(videoId: number, userId: number): Promise<boolean> {
    const [save] = await db.select()
      .from(videoContentSaves)
      .where(and(
        eq(videoContentSaves.videoId, videoId),
        eq(videoContentSaves.userId, userId)
      ))
      .limit(1);
    return !!save;
  }

  /**
   * Get user's saved videos
   */
  async getUserSavedVideos(userId: number): Promise<number[]> {
    const saves = await db.select({ videoId: videoContentSaves.videoId })
      .from(videoContentSaves)
      .where(eq(videoContentSaves.userId, userId))
      .orderBy(desc(videoContentSaves.createdAt));
    return saves.map(save => save.videoId);
  }

  // ==================== Video Content Comments ====================
  
  /**
   * Get comments for a video
   */
  async getVideoContentComments(videoId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoContentComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>> {
    const query = db.select({
      id: videoContentComments.id,
      videoId: videoContentComments.videoId,
      userId: videoContentComments.userId,
      comment: videoContentComments.comment,
      createdAt: videoContentComments.createdAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        profilePicture: users.profilePicture
      }
    }).from(videoContentComments)
      .innerJoin(users, eq(videoContentComments.userId, users.id))
      .where(eq(videoContentComments.videoId, videoId))
      .orderBy(desc(videoContentComments.createdAt))
      .$dynamic();
    
    if (filters?.limit) {
      query.limit(filters.limit);
    }
    if (filters?.offset) {
      query.offset(filters.offset);
    }
    
    return await query;
  }

  /**
   * Create a video content comment
   */
  async createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment> {
    const [created] = await db.insert(videoContentComments).values(comment).returning();
    return created;
  }

  /**
   * Get comment count for a video
   */
  async getVideoContentCommentCount(videoId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(videoContentComments)
      .where(eq(videoContentComments.videoId, videoId));
    return result?.count || 0;
  }

  /**
   * Delete a video comment (user must own the comment)
   */
  async deleteVideoContentComment(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(videoContentComments)
      .where(and(
        eq(videoContentComments.id, id),
        eq(videoContentComments.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  // ==================== File Upload Operations ====================
  
  /**
   * Get uploaded files with filters
   */
  async getUploadedFiles(filters?: { uploadedBy?: number; category?: string; limit?: number }): Promise<FileItem[]> {
    const conditions = [];
    
    if (filters?.uploadedBy) {
      conditions.push(eq(uploadedFiles.uploadedBy, filters.uploadedBy));
    }
    if (filters?.category) {
      conditions.push(eq(uploadedFiles.category, filters.category));
    }

    const baseQuery = db
      .select({
        id: uploadedFiles.id,
        filename: uploadedFiles.filename,
        originalName: uploadedFiles.originalName,
        mimetype: uploadedFiles.mimetype,
        size: uploadedFiles.size,
        uploadedBy: uploadedFiles.uploadedBy,
        url: uploadedFiles.url,
        category: uploadedFiles.category,
        createdAt: uploadedFiles.createdAt,
        uploaderUsername: users.username,
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id));

    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const orderedQuery = whereQuery.orderBy(desc(uploadedFiles.createdAt));

    const results = filters?.limit 
      ? await orderedQuery.limit(filters.limit)
      : await orderedQuery;
    return results.map(row => ({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: row.size,
      uploadedBy: row.uploadedBy,
      url: row.url,
      category: row.category || null,
      createdAt: row.createdAt || new Date(),
      uploaderUsername: row.uploaderUsername || 'Unknown',
    }));
  }

  /**
   * Get an uploaded file by ID
   */
  async getUploadedFile(id: number): Promise<FileItem | undefined> {
    const [result] = await db
      .select({
        id: uploadedFiles.id,
        filename: uploadedFiles.filename,
        originalName: uploadedFiles.originalName,
        mimetype: uploadedFiles.mimetype,
        size: uploadedFiles.size,
        uploadedBy: uploadedFiles.uploadedBy,
        url: uploadedFiles.url,
        category: uploadedFiles.category,
        createdAt: uploadedFiles.createdAt,
        uploaderUsername: users.username,
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))
      .where(eq(uploadedFiles.id, id));

    if (!result) return undefined;

    return {
      id: result.id,
      filename: result.filename,
      originalName: result.originalName,
      mimetype: result.mimetype,
      size: result.size,
      uploadedBy: result.uploadedBy,
      url: result.url,
      category: result.category || null,
      createdAt: result.createdAt || new Date(),
      uploaderUsername: result.uploaderUsername || 'Unknown',
    };
  }

  /**
   * Create an uploaded file record
   */
  async createUploadedFile(fileData: InsertUploadedFile): Promise<UploadedFile> {
    const [created] = await db.insert(uploadedFiles).values({
      ...fileData,
      createdAt: new Date(),
    }).returning();
    return created;
  }

  /**
   * Delete an uploaded file
   */
  async deleteUploadedFile(id: number): Promise<boolean> {
    const result = await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Get file upload statistics
   */
  async getUploadedFilesStats(): Promise<StorageStats> {
    const allFiles = await db.select().from(uploadedFiles);
    
    const totalFiles = allFiles.length;
    const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    let imageCount = 0;
    let videoCount = 0;
    let documentCount = 0;
    let otherCount = 0;

    for (const file of allFiles) {
      const mime = file.mimetype.toLowerCase();
      
      if (mime.startsWith('image/')) {
        imageCount++;
      } else if (mime.startsWith('video/')) {
        videoCount++;
      } else if (
        mime.includes('pdf') || 
        mime.includes('document') || 
        mime.includes('text') || 
        mime.includes('msword') || 
        mime.includes('wordprocessingml') ||
        mime.includes('spreadsheet') ||
        mime.includes('presentation')
      ) {
        documentCount++;
      } else {
        otherCount++;
      }
    }

    return {
      totalFiles,
      totalSize,
      imageCount,
      videoCount,
      documentCount,
      otherCount,
    };
  }
}

/**
 * Singleton instance of MediaRepository
 */
export const mediaRepository = new MediaRepository();
