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

export interface IContentRepository {
  // Status operations
  getActiveStatusUpdates(): Promise<StatusUpdateWithUser[]>;
  getUserStatusUpdates(userId: number): Promise<StatusUpdateWithUser[]>;
  createStatusUpdate(status: InsertStatusUpdate): Promise<StatusUpdate>;
  deleteStatusUpdate(id: number, userId: number): Promise<boolean>;

  // Video content operations - Permanent TikTok-style content
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

  // Video content likes operations
  likeVideoContent(videoId: number, userId: number): Promise<void>;
  unlikeVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoLikedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserLikedVideos(userId: number): Promise<number[]>;

  // Video content saves operations
  saveVideoContent(videoId: number, userId: number): Promise<void>;
  unsaveVideoContent(videoId: number, userId: number): Promise<void>;
  isVideoSavedByUser(videoId: number, userId: number): Promise<boolean>;
  getUserSavedVideos(userId: number): Promise<number[]>;

  // Video content comments operations
  getVideoContentComments(videoId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoContentComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoContentComment(comment: InsertVideoContentComment): Promise<VideoContentComment>;
  getVideoContentCommentCount(videoId: number): Promise<number>;
  deleteVideoContentComment(id: number, userId: number): Promise<boolean>;

  // Video comments operations (for status updates)
  getVideoComments(statusId: number, filters?: { limit?: number; offset?: number }): Promise<Array<VideoComment & { user: Pick<User, 'id' | 'username' | 'displayName' | 'profilePicture'> }>>;
  createVideoComment(comment: InsertVideoComment): Promise<VideoComment>;
  getVideoCommentCount(statusId: number): Promise<number>;
  deleteVideoComment(id: number, userId: number): Promise<boolean>;

  // Status views operations
  recordStatusView(statusId: number, viewerId: number): Promise<void>;
  getStatusViews(statusId: number): Promise<Array<{id: number, username: string, profilePicture: string | null, viewedAt: Date}>>;
  getUserStatusViews(userId: number): Promise<number[]>;
  hasUserViewedStatus(statusId: number, viewerId: number): Promise<boolean>;

  // Poster generation operations
  createPosterGeneration(poster: InsertPosterGeneration): Promise<PosterGeneration>;
  updatePosterGeneration(id: number, updates: Partial<PosterGeneration>): Promise<PosterGeneration | undefined>;

  // Repost operations
  getRepost(userId: number, productId?: number, statusId?: number): Promise<Repost | undefined>;
  createRepost(repost: InsertRepost): Promise<Repost>;
  deleteRepost(userId: number, productId?: number, statusId?: number): Promise<void>;
  getRepostsByUser(userId: number): Promise<Repost[]>;
  getRepostCountByProduct(productId: number): Promise<number>;
  getRepostCountByStatus(statusId: number): Promise<number>;
}
