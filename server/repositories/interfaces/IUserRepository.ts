import type {
  User,
  InsertUser,
  UserPreferences,
  InsertUserPreferences,
  UserReport,
  InsertUserReport,
  UserInteraction,
  InsertUserInteraction
} from "@shared/schema";

export interface IUserRepository {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreferences | null>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences | null>;

  // User reports operations
  createUserReport(report: InsertUserReport): Promise<UserReport>;
  getUserReport(id: number): Promise<UserReport | undefined>;
  getUserReports(filters?: {
    reporterId?: number;
    reportedUserId?: number;
    reportedProductId?: number;
    status?: string;
    reportType?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserReport[]>;
  updateUserReport(id: number, updates: Partial<UserReport>): Promise<UserReport | undefined>;

  // User interaction operations (for FYP algorithm)
  createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getUserInteractions(userId: number, filters?: { 
    limit?: number; 
    offset?: number; 
    interactionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserInteraction[]>;
  getAllUserInteractions(filters?: {
    startDate?: Date;
    endDate?: Date;
    interactionType?: string;
    limit?: number;
  }): Promise<UserInteraction[]>;
}
