import type { IContentRepository } from "./interfaces/IContentRepository";
import type {
  StatusUpdate,
  InsertStatusUpdate,
  StatusUpdateWithUser,
  VideoContent,
  InsertVideoContent,
  VideoContentWithUser,
  VideoContentComment,
  InsertVideoContentComment,
  VideoComment,
  InsertVideoComment,
  StatusView,
  InsertStatusView,
  PosterGeneration,
  InsertPosterGeneration,
  Repost,
  InsertRepost,
  User
} from "@shared/schema";
import {
  statusUpdates,
  videoContent,
  videoContentLikes,
  videoContentSaves,
  videoContentComments,
  videoComments,
  statusViews,
  posterGenerations,
  reposts,
  users
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, count, sql } from "drizzle-orm";

/**
 * ContentRepository
 * 
 * Handles all content-related database operations including:
 * - Status updates (temporary stories)
 * - Video content (permanent TikTok-style content)
 * - Video likes and saves
 * - Video comments (for both status and video content)
 * - Status views
 * - Poster generation
 * - Reposts
 */
export class ContentRepository implements IContentRepository {
  
  // ===========================
  // STATUS OPERATIONS
  // ===========================
  
  /**
   * Get all active (non-expired) status updates with user information
   */
  async getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]> {
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
      displayName: users.displayName,
      profilePicture: users.profilePicture,
    }).from(statusUpdates)
      .innerJoin(users, eq(statusUpdates.userId, users.id))
      .where(sql`${statusUpdates.expiresAt} > NOW()`)
      .orderBy(desc(statusUpdates.createdAt));
  }

  /**
   * Get all status updates for a specific user
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
      displayName: users.displayName,
      profilePicture: users.profilePicture,
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
   * Delete a status update (user can only delete their own)
   */
  async deleteStatusUpdate(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(statusUpdates)
      .where(and(eq(statusUpdates.id, id), eq(statusUpdates.userId, userId)))
      .returning();
    return result.length > 0;
  }

  // ===========================
  // VIDEO CONTENT OPERATIONS
  // ===========================
  
  /**
   * Get video content with advanced filtering and sorting
   * Supports: user, category, content type, music name, pagination, and sorting
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
    
    // Build where conditions
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
    
    // Build base query
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
    
    // Apply sorting
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
   * Get a single video content by ID
   */
  async getVideoContentById(id: number): Promise<VideoContent | undefined> {
    const [content] = await db.select().from(videoContent).where(eq(videoContent.id, id));
    return content || undefined;
  }

  /**
   * Create new video content
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
   * Delete video content (user can only delete their own)
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
   * Increment video views counter
   */
  async incrementVideoViews(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ views: sql`${videoContent.views} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video likes counter
   */
  async incrementVideoLikes(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ likes: sql`${videoContent.likes} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Decrement video likes counter
   */
  async decrementVideoLikes(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ likes: sql`${videoContent.likes} - 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video shares counter
   */
  async incrementVideoShares(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ shares: sql`${videoContent.shares} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Increment video saves counter
   */
  async incrementVideoSaves(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ saves: sql`${videoContent.saves} + 1` })
      .where(eq(videoContent.id, id));
  }

  /**
   * Decrement video saves counter
   */
  async decrementVideoSaves(id: number): Promise<void> {
    await db.update(videoContent)
      .set({ saves: sql`${videoContent.saves} - 1` })
      .where(eq(videoContent.id, id));
  }

  // ===========================
  // VIDEO CONTENT LIKES OPERATIONS
  // ===========================

  /**
   * Like a video content (idempotent - safe to call multiple times)
   */
  async likeVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Insert like with conflict handling (idempotent)
      await tx.insert(videoContentLikes)
        .values({ videoId, userId })
        .onConflictDoNothing({ target: [videoContentLikes.userId, videoContentLikes.videoId] });
      
      // Increment likes counter on video
      await tx.update(videoContent)
        .set({ likes: sql`${videoContent.likes} + 1` })
        .where(eq(videoContent.id, videoId));
    });
  }

  /**
   * Unlike a video content
   */
  async unlikeVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete like
      const result = await tx.delete(videoContentLikes)
        .where(and(
          eq(videoContentLikes.videoId, videoId),
          eq(videoContentLikes.userId, userId)
        ))
        .returning();
      
      // Only decrement if like existed
      if (result.length > 0) {
        await tx.update(videoContent)
          .set({ likes: sql`${videoContent.likes} - 1` })
          .where(eq(videoContent.id, videoId));
      }
    });
  }

  /**
   * Check if a user has liked a video
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
   * Get all video IDs liked by a user
   */
  async getUserLikedVideos(userId: number): Promise<number[]> {
    const likes = await db.select({ videoId: videoContentLikes.videoId })
      .from(videoContentLikes)
      .where(eq(videoContentLikes.userId, userId))
      .orderBy(desc(videoContentLikes.createdAt));
    return likes.map(like => like.videoId);
  }

  // ===========================
  // VIDEO CONTENT SAVES OPERATIONS
  // ===========================

  /**
   * Save a video content (idempotent - safe to call multiple times)
   */
  async saveVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Insert save with conflict handling (idempotent)
      await tx.insert(videoContentSaves)
        .values({ videoId, userId })
        .onConflictDoNothing({ target: [videoContentSaves.userId, videoContentSaves.videoId] });
      
      // Increment saves counter on video
      await tx.update(videoContent)
        .set({ saves: sql`${videoContent.saves} + 1` })
        .where(eq(videoContent.id, videoId));
    });
  }

  /**
   * Unsave a video content
   */
  async unsaveVideoContent(videoId: number, userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete save
      const result = await tx.delete(videoContentSaves)
        .where(and(
          eq(videoContentSaves.videoId, videoId),
          eq(videoContentSaves.userId, userId)
        ))
        .returning();
      
      // Only decrement if save existed
      if (result.length > 0) {
        await tx.update(videoContent)
          .set({ saves: sql`${videoContent.saves} - 1` })
          .where(eq(videoContent.id, videoId));
      }
    });
  }

  /**
   * Check if a user has saved a video
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
   * Get all video IDs saved by a user
   */
  async getUserSavedVideos(userId: number): Promise<number[]> {
    const saves = await db.select({ videoId: videoContentSaves.videoId })
      .from(videoContentSaves)
      .where(eq(videoContentSaves.userId, userId))
      .orderBy(desc(videoContentSaves.createdAt));
    return saves.map(save => save.videoId);
  }

  // ===========================
  // VIDEO CONTENT COMMENTS OPERATIONS
  // ===========================

  /**
   * Get comments for a video content with user information
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
   * Create a comment on video content
   */
  async createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment> {
    const [created] = await db.insert(videoContentComments).values(comment).returning();
    return created;
  }

  /**
   * Get comment count for a video content
   */
  async getVideoContentCommentCount(videoId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(videoContentComments)
      .where(eq(videoContentComments.videoId, videoId));
    return result?.count || 0;
  }

  /**
   * Delete a video content comment (user can only delete their own)
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

  // ===========================
  // VIDEO COMMENTS OPERATIONS (for status updates)
  // ===========================

  /**
   * Get comments for a status update with user information
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
   * Create a comment on a status update
   */
  async createVideoComment(comment: InsertVideoComment): Promise<VideoComment> {
    const [newComment] = await db.insert(videoComments).values(comment).returning();
    return newComment;
  }

  /**
   * Get comment count for a status update
   */
  async getVideoCommentCount(statusId: number): Promise<number> {
    const result = await db.select({
      count: count(videoComments.id)
    }).from(videoComments)
      .where(eq(videoComments.statusId, statusId));
    
    return Number(result[0]?.count) || 0;
  }

  /**
   * Delete a video comment (user can only delete their own)
   */
  async deleteVideoComment(id: number, userId: number): Promise<boolean> {
    // Only allow users to delete their own comments
    const [deletedComment] = await db.delete(videoComments)
      .where(and(
        eq(videoComments.id, id),
        eq(videoComments.userId, userId)
      ))
      .returning();
    
    return !!deletedComment;
  }

  // ===========================
  // STATUS VIEWS OPERATIONS
  // ===========================

  /**
   * Record a view on a status update (duplicate views are ignored)
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

  // ===========================
  // POSTER GENERATION OPERATIONS
  // ===========================

  /**
   * Create a new poster generation record
   */
  async createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration> {
    // Ensure JSONB fields are properly typed
    const posterData = {
      ...poster,
      selectedSkins: [...poster.selectedSkins] as string[]
    };
    const result = await db.insert(posterGenerations).values([posterData]).returning();
    return result[0];
  }

  /**
   * Update a poster generation record
   */
  async updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined> {
    const [poster] = await db.update(posterGenerations).set(updates).where(eq(posterGenerations.id, id)).returning();
    return poster || undefined;
  }

  // ===========================
  // REPOST OPERATIONS
  // ===========================

  /**
   * Get a repost by user and content (product or status)
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
   * Create a new repost
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
    const [result] = await db.select({ count: count() }).from(reposts)
      .where(eq(reposts.productId, productId));
    return result?.count || 0;
  }

  /**
   * Get repost count for a status
   */
  async getRepostCountByStatus(statusId: number): Promise<number> {
    const [result] = await db.select({ count: count() }).from(reposts)
      .where(eq(reposts.statusId, statusId));
    return result?.count || 0;
  }
}
