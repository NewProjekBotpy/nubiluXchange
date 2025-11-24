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

/**
 * Interface for payment and transaction-related repository operations
 * Consolidates all payment-related data access methods
 */
export interface IPaymentsRepository {
  // ===== Transaction Operations =====
  
  /**
   * Get a transaction by ID
   */
  getTransaction(id: number): Promise<Transaction | undefined>;
  
  /**
   * Get a transaction by payment ID
   */
  getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined>;
  
  /**
   * Get all transactions for a user (as buyer or seller)
   */
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  
  /**
   * Create a new transaction
   */
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  /**
   * Update a transaction
   */
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // ===== Wallet Operations =====
  
  /**
   * Get wallet balance for a user
   */
  getWalletBalance(userId: number): Promise<string>;
  
  /**
   * Update wallet balance for a user using atomic SQL operation
   * @param userId - The user ID
   * @param delta - The amount to ADD to the current balance (can be negative for deductions)
   */
  updateWalletBalance(userId: number, delta: string): Promise<void>;
  
  /**
   * Update multiple wallet balances atomically in a transaction
   * @param updates - Array of {userId, delta} where delta is the amount to ADD (can be negative)
   * @param walletTransactionData - Transaction records to create
   */
  updateWalletBalanceInTransaction(
    updates: Array<{userId: number, delta: string}>, 
    walletTransactionData: InsertWalletTransaction[]
  ): Promise<void>;
  
  /**
   * Create a wallet transaction record
   */
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  
  /**
   * Get all wallet transactions for a user
   */
  getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]>;

  // ===== Escrow Operations =====
  
  /**
   * Get an escrow transaction by ID
   */
  getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined>;
  
  /**
   * Get all escrow transactions for a user (as buyer or seller)
   */
  getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]>;
  
  /**
   * Get escrow transactions by status
   */
  getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]>;
  
  /**
   * Get escrow transaction for a specific chat/product combination
   */
  getEscrowTransactionByChat(
    productId: number, 
    buyerId: number, 
    sellerId: number
  ): Promise<EscrowTransaction | undefined>;
  
  /**
   * Create a new escrow transaction
   */
  createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction>;
  
  /**
   * Update an escrow transaction
   */
  updateEscrowTransaction(
    id: number, 
    updates: Partial<EscrowTransaction>
  ): Promise<EscrowTransaction | undefined>;

  // ===== Money Request Operations =====
  
  /**
   * Create a money request
   */
  createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest>;
  
  /**
   * Get a money request by ID
   */
  getMoneyRequest(id: number): Promise<MoneyRequest | undefined>;
  
  /**
   * Get money requests for a user (sent, received, or all)
   */
  getMoneyRequestsByUser(userId: number, type?: 'sent' | 'received'): Promise<MoneyRequest[]>;
  
  /**
   * Update a money request
   */
  updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined>;
  
  /**
   * Get pending money requests for a user
   */
  getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]>;

  // ===== E-wallet Connection Operations =====
  
  /**
   * Create an e-wallet connection
   */
  createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection>;
  
  /**
   * Get an e-wallet connection by ID
   */
  getEwalletConnection(id: number): Promise<EwalletConnection | undefined>;
  
  /**
   * Get all active e-wallet connections for a user
   */
  getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]>;
  
  /**
   * Get e-wallet connection by user and provider
   */
  getEwalletConnectionByProvider(
    userId: number, 
    provider: string
  ): Promise<EwalletConnection | undefined>;
  
  /**
   * Update an e-wallet connection
   */
  updateEwalletConnection(
    id: number, 
    updates: Partial<EwalletConnection>
  ): Promise<EwalletConnection | undefined>;
  
  /**
   * Delete (deactivate) an e-wallet connection
   */
  deleteEwalletConnection(id: number): Promise<void>;

  // ===== Service Order Operations =====
  
  /**
   * Create a service order
   */
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  
  /**
   * Get a service order by ID
   */
  getServiceOrder(id: number): Promise<ServiceOrder | undefined>;
  
  /**
   * Get all service orders for a user
   */
  getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]>;
  
  /**
   * Get a service order by order number
   */
  getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined>;
  
  /**
   * Update a service order
   */
  updateServiceOrder(
    id: number, 
    updates: Partial<ServiceOrder>
  ): Promise<ServiceOrder | undefined>;

  // ===== SMS Log Operations =====
  
  /**
   * Create an SMS log entry
   */
  createSmsLog(log: InsertSmsLog): Promise<SmsLog>;
  
  /**
   * Get SMS logs with filters
   */
  getSmsLogs(filters?: { 
    phoneNumber?: string; 
    status?: string; 
    alertType?: string; 
    limit?: number; 
    offset?: number;
  }): Promise<SmsLog[]>;
  
  /**
   * Get SMS logs for a specific phone number
   */
  getSmsLogsByPhone(phoneNumber: string): Promise<SmsLog[]>;
  
  /**
   * Get SMS log statistics
   */
  getSmsLogStats(): Promise<{ 
    totalSent: number; 
    totalFailed: number; 
    totalPending: number;
  }>;

  // ===== Revenue & Analytics Operations =====
  
  /**
   * Create a revenue report
   */
  createRevenueReport(report: InsertRevenueReport): Promise<RevenueReport>;
  
  /**
   * Get a revenue report by ID
   */
  getRevenueReport(id: number): Promise<RevenueReport | undefined>;
  
  /**
   * Get a revenue report by date
   */
  getRevenueReportByDate(date: Date): Promise<RevenueReport | undefined>;
  
  /**
   * Get revenue reports with filters
   */
  getRevenueReports(filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number;
  }): Promise<RevenueReport[]>;
  
  /**
   * Update a revenue report
   */
  updateRevenueReport(
    id: number, 
    updates: Partial<RevenueReport>
  ): Promise<RevenueReport | undefined>;
  
  /**
   * Get revenue analytics for a date range
   */
  getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: RevenueReport[];
  }>;
  
  /**
   * Get escrow transaction statistics
   */
  getEscrowStats(): Promise<{ 
    pending: number; 
    active: number; 
    completed: number; 
    disputed: number;
  }>;
}
