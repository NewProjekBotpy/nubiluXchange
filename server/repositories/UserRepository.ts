import type { User, InsertUser, UserPreferences, InsertUserPreferences, UserReport, InsertUserReport, UserInteraction, InsertUserInteraction } from "@shared/schema";
import { users, userPreferences, userReports, userInteractions } from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import type { IUserRepository } from "./interfaces/IUserRepository";

/**
 * Repository for user-related database operations
 */
export class UserRepository implements IUserRepository {
  /**
   * Get a user by their ID
   * @param id - The user ID
   * @returns The user if found, undefined otherwise
   */
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  /**
   * Get a user by their username
   * @param username - The username to search for
   * @returns The user if found, undefined otherwise
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  /**
   * Get a user by their email address
   * @param email - The email address to search for
   * @returns The user if found, undefined otherwise
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  /**
   * Get all users, ordered by creation date (newest first)
   * @returns Array of all users
   */
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  /**
   * Create a new user
   * @param insertUser - The user data to insert
   * @returns The created user
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  /**
   * Update an existing user by ID
   * @param id - The user ID to update
   * @param updates - Partial user data to update
   * @returns The updated user if found, undefined otherwise
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  /**
   * Get user preferences by user ID
   * @param userId - The user ID
   * @returns The user preferences if found, null otherwise
   */
  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences || null;
  }

  /**
   * Create user preferences
   * @param preferences - The user preferences data to insert
   * @returns The created user preferences
   */
  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [created] = await db.insert(userPreferences).values(preferences).returning();
    return created;
  }

  /**
   * Update user preferences by user ID
   * @param userId - The user ID
   * @param updates - Partial user preferences data to update
   * @returns The updated user preferences if found, null otherwise
   */
  async updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
    const [updated] = await db.update(userPreferences).set(updates).where(eq(userPreferences.userId, userId)).returning();
    return updated || null;
  }

  /**
   * Create a user report
   * @param report - The user report data to insert
   * @returns The created user report
   */
  async createUserReport(report: InsertUserReport): Promise<UserReport> {
    const [created] = await db.insert(userReports).values(report).returning();
    return created;
  }

  /**
   * Get a user report by ID
   * @param id - The report ID
   * @returns The user report if found, undefined otherwise
   */
  async getUserReport(id: number): Promise<UserReport | undefined> {
    const [report] = await db.select().from(userReports).where(eq(userReports.id, id));
    return report || undefined;
  }

  /**
   * Get user reports with optional filters
   * @param filters - Optional filters for reports
   * @returns Array of user reports matching the filters
   */
  async getUserReports(filters?: {
    reporterId?: number;
    reportedUserId?: number;
    reportedProductId?: number;
    status?: string;
    reportType?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserReport[]> {
    const conditions = [];

    if (filters?.reporterId) {
      conditions.push(eq(userReports.reporterId, filters.reporterId));
    }
    if (filters?.reportedUserId) {
      conditions.push(eq(userReports.reportedUserId, filters.reportedUserId));
    }
    if (filters?.reportedProductId) {
      conditions.push(eq(userReports.reportedProductId, filters.reportedProductId));
    }
    if (filters?.status) {
      conditions.push(eq(userReports.status, filters.status));
    }
    if (filters?.reportType) {
      conditions.push(eq(userReports.reportType, filters.reportType));
    }

    let query = db.select().from(userReports);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(userReports.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  /**
   * Update a user report by ID
   * @param id - The report ID to update
   * @param updates - Partial user report data to update
   * @returns The updated user report if found, undefined otherwise
   */
  async updateUserReport(id: number, updates: Partial<UserReport>): Promise<UserReport | undefined> {
    const [updated] = await db.update(userReports).set(updates).where(eq(userReports.id, id)).returning();
    return updated || undefined;
  }

  /**
   * Create a user interaction
   * @param interaction - The user interaction data to insert
   * @returns The created user interaction
   */
  async createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [created] = await db.insert(userInteractions).values(interaction).returning();
    return created;
  }

  /**
   * Get user interactions by user ID with optional filters
   * @param userId - The user ID
   * @param filters - Optional filters for interactions
   * @returns Array of user interactions matching the filters
   */
  async getUserInteractions(userId: number, filters?: {
    limit?: number;
    offset?: number;
    interactionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserInteraction[]> {
    const conditions = [eq(userInteractions.userId, userId)];

    if (filters?.interactionType) {
      conditions.push(eq(userInteractions.interactionType, filters.interactionType));
    }
    if (filters?.startDate) {
      conditions.push(gte(userInteractions.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(userInteractions.createdAt, filters.endDate));
    }

    let query = db.select().from(userInteractions).where(and(...conditions));

    query = query.orderBy(desc(userInteractions.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  /**
   * Get all user interactions with optional filters
   * @param filters - Optional filters for interactions
   * @returns Array of user interactions matching the filters
   */
  async getAllUserInteractions(filters?: {
    startDate?: Date;
    endDate?: Date;
    interactionType?: string;
    limit?: number;
  }): Promise<UserInteraction[]> {
    const conditions = [];

    if (filters?.interactionType) {
      conditions.push(eq(userInteractions.interactionType, filters.interactionType));
    }
    if (filters?.startDate) {
      conditions.push(gte(userInteractions.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(userInteractions.createdAt, filters.endDate));
    }

    let query = db.select().from(userInteractions);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(userInteractions.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }
}

/**
 * Singleton instance of UserRepository
 */
export const userRepository = new UserRepository();
