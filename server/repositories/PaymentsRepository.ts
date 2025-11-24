import type { IPaymentsRepository } from "./interfaces/IPaymentsRepository";
import type {
  Transaction,
  InsertTransaction,
  WalletTransaction,
  InsertWalletTransaction,
  EscrowTransaction,
  InsertEscrowTransaction,
  MoneyRequest,
  InsertMoneyRequest,
  EwalletConnection,
  InsertEwalletConnection,
  ServiceOrder,
  InsertServiceOrder,
  SmsLog,
  InsertSmsLog,
  RevenueReport,
  InsertRevenueReport
} from "@shared/schema";
import {
  transactions,
  walletTransactions,
  escrowTransactions,
  moneyRequests,
  ewalletConnections,
  serviceOrders,
  smsLogs,
  revenueReports,
  users,
  products
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, gt, lt, sql, ne } from "drizzle-orm";

/**
 * Repository for payment and transaction-related operations
 * Consolidates all payment, wallet, escrow, and revenue data access
 */
export class PaymentsRepository implements IPaymentsRepository {
  // ===== Transaction Operations =====

  /**
   * Get a transaction by ID
   */
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  /**
   * Get a transaction by payment ID
   */
  async getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.paymentId, paymentId));
    return transaction || undefined;
  }

  /**
   * Get all transactions for a user (as buyer or seller)
   */
  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)))
      .orderBy(desc(transactions.createdAt));
  }

  /**
   * Create a new transaction
   */
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  /**
   * Update a transaction
   * IMPORTANT: Prevents status regression - completed transactions cannot be updated to prevent double-processing
   * @param id - The transaction ID
   * @param updates - The updates to apply
   * @returns The updated transaction if successful, undefined if transaction was completed or not found
   */
  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions)
      .set(updates)
      .where(and(
        eq(transactions.id, id),
        ne(transactions.status, 'completed')
      ))
      .returning();
    return transaction || undefined;
  }

  // ===== Wallet Operations =====

  /**
   * Get wallet balance for a user
   */
  async getWalletBalance(userId: number): Promise<string> {
    const [user] = await db.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return user?.balance || "0";
  }

  /**
   * Update wallet balance for a user using atomic SQL operation
   * IMPORTANT: This method uses atomic increment/decrement to prevent race conditions
   * @param userId - The user ID
   * @param delta - The amount to ADD to the current balance (can be negative for deductions)
   * @example
   * // Add 50000 to balance
   * await updateWalletBalance(userId, "50000");
   * 
   * // Deduct 20000 from balance
   * await updateWalletBalance(userId, "-20000");
   */
  async updateWalletBalance(userId: number, delta: string): Promise<void> {
    await db.update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${delta}` })
      .where(eq(users.id, userId));
  }

  /**
   * Update multiple wallet balances atomically in a transaction
   * IMPORTANT: Uses atomic increment/decrement for each update to prevent race conditions
   * @param updates - Array of {userId, delta} where delta is the amount to ADD (can be negative)
   * @param walletTransactionData - Transaction records to create
   */
  async updateWalletBalanceInTransaction(
    updates: Array<{userId: number, delta: string}>,
    walletTransactionData: InsertWalletTransaction[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update all wallet balances atomically using SQL arithmetic
      for (const update of updates) {
        await tx.update(users)
          .set({ walletBalance: sql`${users.walletBalance} + ${update.delta}` })
          .where(eq(users.id, update.userId));
      }
      
      // Create wallet transaction records atomically
      if (walletTransactionData.length > 0) {
        await tx.insert(walletTransactions).values(walletTransactionData);
      }
    });
  }

  /**
   * Create a wallet transaction record
   */
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [walletTransaction] = await db.insert(walletTransactions).values(transaction).returning();
    return walletTransaction;
  }

  /**
   * Get all wallet transactions for a user
   */
  async getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]> {
    return await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  // ===== Escrow Operations =====

  /**
   * Get an escrow transaction by ID
   */
  async getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, id));
    return escrow || undefined;
  }

  /**
   * Get all escrow transactions for a user (as buyer or seller)
   */
  async getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]> {
    return await db.select().from(escrowTransactions)
      .where(or(eq(escrowTransactions.buyerId, userId), eq(escrowTransactions.sellerId, userId)))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  /**
   * Get escrow transactions by status
   */
  async getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]> {
    return await db.select().from(escrowTransactions)
      .where(eq(escrowTransactions.status, status))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  /**
   * Get escrow transaction for a specific chat/product combination
   */
  async getEscrowTransactionByChat(
    productId: number, 
    buyerId: number, 
    sellerId: number
  ): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.select().from(escrowTransactions)
      .where(
        and(
          eq(escrowTransactions.productId, productId),
          eq(escrowTransactions.buyerId, buyerId),
          eq(escrowTransactions.sellerId, sellerId)
        )
      )
      .orderBy(desc(escrowTransactions.createdAt))
      .limit(1);
    return escrow || undefined;
  }

  /**
   * Create a new escrow transaction
   */
  async createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const [newEscrow] = await db.insert(escrowTransactions).values(escrow).returning();
    return newEscrow;
  }

  /**
   * Update an escrow transaction
   */
  async updateEscrowTransaction(
    id: number, 
    updates: Partial<EscrowTransaction>
  ): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.update(escrowTransactions).set(updates).where(eq(escrowTransactions.id, id)).returning();
    return escrow || undefined;
  }

  // ===== Money Request Operations =====

  /**
   * Create a money request
   */
  async createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest> {
    const [newRequest] = await db.insert(moneyRequests).values(request).returning();
    return newRequest;
  }

  /**
   * Get a money request by ID
   */
  async getMoneyRequest(id: number): Promise<MoneyRequest | undefined> {
    const [request] = await db.select().from(moneyRequests).where(eq(moneyRequests.id, id));
    return request || undefined;
  }

  /**
   * Get money requests for a user (sent, received, or all)
   */
  async getMoneyRequestsByUser(userId: number, type?: 'sent' | 'received'): Promise<MoneyRequest[]> {
    if (type === 'sent') {
      return await db.select().from(moneyRequests)
        .where(eq(moneyRequests.senderId, userId))
        .orderBy(desc(moneyRequests.createdAt));
    } else if (type === 'received') {
      return await db.select().from(moneyRequests)
        .where(eq(moneyRequests.receiverId, userId))
        .orderBy(desc(moneyRequests.createdAt));
    } else {
      return await db.select().from(moneyRequests)
        .where(or(
          eq(moneyRequests.senderId, userId),
          eq(moneyRequests.receiverId, userId)
        ))
        .orderBy(desc(moneyRequests.createdAt));
    }
  }

  /**
   * Update a money request
   */
  async updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined> {
    const [updated] = await db.update(moneyRequests)
      .set(updates)
      .where(eq(moneyRequests.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Get pending money requests for a user
   */
  async getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]> {
    return await db.select().from(moneyRequests)
      .where(and(
        eq(moneyRequests.receiverId, userId),
        eq(moneyRequests.status, 'pending'),
        gt(moneyRequests.expiresAt, new Date())
      ))
      .orderBy(desc(moneyRequests.createdAt));
  }

  // ===== E-wallet Connection Operations =====

  /**
   * Create an e-wallet connection
   */
  async createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection> {
    const [newConnection] = await db.insert(ewalletConnections).values(connection).returning();
    return newConnection;
  }

  /**
   * Get an e-wallet connection by ID
   */
  async getEwalletConnection(id: number): Promise<EwalletConnection | undefined> {
    const [connection] = await db.select().from(ewalletConnections).where(eq(ewalletConnections.id, id));
    return connection || undefined;
  }

  /**
   * Get all active e-wallet connections for a user
   */
  async getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]> {
    return await db.select().from(ewalletConnections)
      .where(and(
        eq(ewalletConnections.userId, userId),
        eq(ewalletConnections.isActive, true)
      ))
      .orderBy(desc(ewalletConnections.createdAt));
  }

  /**
   * Get e-wallet connection by user and provider
   */
  async getEwalletConnectionByProvider(
    userId: number, 
    provider: string
  ): Promise<EwalletConnection | undefined> {
    const [connection] = await db.select().from(ewalletConnections)
      .where(and(
        eq(ewalletConnections.userId, userId),
        eq(ewalletConnections.provider, provider),
        eq(ewalletConnections.isActive, true)
      ));
    return connection || undefined;
  }

  /**
   * Update an e-wallet connection
   */
  async updateEwalletConnection(
    id: number, 
    updates: Partial<EwalletConnection>
  ): Promise<EwalletConnection | undefined> {
    const [updated] = await db.update(ewalletConnections)
      .set(updates)
      .where(eq(ewalletConnections.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Delete (deactivate) an e-wallet connection
   */
  async deleteEwalletConnection(id: number): Promise<void> {
    await db.update(ewalletConnections)
      .set({ isActive: false })
      .where(eq(ewalletConnections.id, id));
  }

  // ===== Service Order Operations =====

  /**
   * Create a service order
   */
  async createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
    const [newOrder] = await db.insert(serviceOrders).values(order).returning();
    return newOrder;
  }

  /**
   * Get a service order by ID
   */
  async getServiceOrder(id: number): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return order || undefined;
  }

  /**
   * Get all service orders for a user
   */
  async getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]> {
    return await db.select().from(serviceOrders)
      .where(eq(serviceOrders.userId, userId))
      .orderBy(desc(serviceOrders.createdAt));
  }

  /**
   * Get a service order by order number
   */
  async getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders)
      .where(eq(serviceOrders.orderNumber, orderNumber));
    return order || undefined;
  }

  /**
   * Update a service order
   */
  async updateServiceOrder(
    id: number, 
    updates: Partial<ServiceOrder>
  ): Promise<ServiceOrder | undefined> {
    const [updated] = await db.update(serviceOrders)
      .set(updates)
      .where(eq(serviceOrders.id, id))
      .returning();
    return updated || undefined;
  }

  // ===== SMS Log Operations =====

  /**
   * Create an SMS log entry
   */
  async createSmsLog(log: InsertSmsLog): Promise<SmsLog> {
    const [newLog] = await db.insert(smsLogs).values(log).returning();
    return newLog;
  }

  /**
   * Get SMS logs with filters
   */
  async getSmsLogs(filters?: { 
    phoneNumber?: string; 
    status?: string; 
    alertType?: string; 
    limit?: number; 
    offset?: number;
  }): Promise<SmsLog[]> {
    let query = db.select().from(smsLogs);

    const conditions = [];
    
    if (filters?.phoneNumber) {
      conditions.push(eq(smsLogs.phoneNumber, filters.phoneNumber));
    }
    
    if (filters?.status) {
      conditions.push(eq(smsLogs.status, filters.status));
    }
    
    if (filters?.alertType) {
      conditions.push(eq(smsLogs.alertType, filters.alertType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(smsLogs.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  /**
   * Get SMS logs for a specific phone number
   */
  async getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]> {
    return await db.select().from(smsLogs)
      .where(eq(smsLogs.phoneNumber, phoneNumber))
      .orderBy(desc(smsLogs.createdAt));
  }

  /**
   * Get SMS log statistics
   */
  async getSmsLogStats(): Promise<{ 
    totalSent: number; 
    totalFailed: number; 
    totalPending: number;
  }> {
    const allLogs = await db.select().from(smsLogs);
    
    const stats = {
      totalSent: allLogs.filter(log => log.status === 'sent').length,
      totalFailed: allLogs.filter(log => log.status === 'failed').length,
      totalPending: allLogs.filter(log => log.status === 'pending').length
    };
    
    return stats;
  }

  // ===== Revenue & Analytics Operations =====

  /**
   * Create a revenue report
   */
  async createRevenueReport(report: InsertRevenueReport): Promise<RevenueReport> {
    const [created] = await db.insert(revenueReports).values(report).returning();
    return created;
  }

  /**
   * Get a revenue report by ID
   */
  async getRevenueReport(id: number): Promise<RevenueReport | undefined> {
    const [report] = await db.select().from(revenueReports).where(eq(revenueReports.id, id));
    return report || undefined;
  }

  /**
   * Get a revenue report by date
   */
  async getRevenueReportByDate(date: Date): Promise<RevenueReport | undefined> {
    const [report] = await db.select().from(revenueReports)
      .where(eq(revenueReports.reportDate, date));
    return report || undefined;
  }

  /**
   * Get revenue reports with filters
   */
  async getRevenueReports(filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number;
  }): Promise<RevenueReport[]> {
    const baseQuery = db.select().from(revenueReports);
    
    // Build where conditions
    const conditions = [];
    if (filters?.startDate && filters?.endDate) {
      conditions.push(gt(revenueReports.reportDate, filters.startDate));
      conditions.push(lt(revenueReports.reportDate, filters.endDate));
    }
    
    // Build query with proper chaining
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    const orderedQuery = whereQuery.orderBy(desc(revenueReports.reportDate));
    
    const finalQuery = filters?.limit 
      ? orderedQuery.limit(filters.limit)
      : orderedQuery;
    
    return await finalQuery;
  }

  /**
   * Update a revenue report
   */
  async updateRevenueReport(
    id: number, 
    updates: Partial<RevenueReport>
  ): Promise<RevenueReport | undefined> {
    const [updated] = await db.update(revenueReports)
      .set(updates)
      .where(eq(revenueReports.id, id))
      .returning();
    return updated || undefined;
  }

  /**
   * Get revenue analytics for a date range
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: RevenueReport[];
  }> {
    const reports = await this.getRevenueReports({ startDate, endDate });
    
    const totalRevenue = reports.reduce((sum, report) => sum + parseFloat(report.totalRevenue || '0'), 0);
    const totalCommission = reports.reduce((sum, report) => sum + parseFloat(report.totalCommission || '0'), 0);
    const totalTransactions = reports.reduce((sum, report) => sum + (report.totalTransactions || 0), 0);
    
    // Get category analytics from transactions
    const categoryQuery = await db.select({
      category: products.category,
      revenue: transactions.amount,
      count: transactions.id
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(and(
      gt(transactions.createdAt, startDate),
      lt(transactions.createdAt, endDate),
      eq(transactions.status, 'completed')
    ));

    const categoryMap = new Map<string, { revenue: number; count: number }>();
    categoryQuery.forEach(row => {
      const existing = categoryMap.get(row.category) || { revenue: 0, count: 0 };
      existing.revenue += parseFloat(row.revenue || '0');
      existing.count += 1;
      categoryMap.set(row.category, existing);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        revenue: stats.revenue.toString(),
        count: stats.count
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 5);

    return {
      totalRevenue: totalRevenue.toString(),
      totalCommission: totalCommission.toString(),
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? (totalRevenue / totalTransactions).toString() : '0',
      topCategories,
      dailyReports: reports
    };
  }

  /**
   * Get escrow transaction statistics
   */
  async getEscrowStats(): Promise<{ 
    pending: number; 
    active: number; 
    completed: number; 
    disputed: number;
  }> {
    const [stats] = await db.select({
      pending: db.$count(escrowTransactions, eq(escrowTransactions.status, "pending")),
      active: db.$count(escrowTransactions, eq(escrowTransactions.status, "active")),
      completed: db.$count(escrowTransactions, eq(escrowTransactions.status, "completed")),
      disputed: db.$count(escrowTransactions, eq(escrowTransactions.status, "disputed"))
    }).from(escrowTransactions);
    return stats || { pending: 0, active: 0, completed: 0, disputed: 0 };
  }
}

// Export singleton instance
export const paymentsRepository = new PaymentsRepository();
