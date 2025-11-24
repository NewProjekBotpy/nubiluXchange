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
  InsertServiceOrder
} from "@shared/schema";

export interface ITransactionRepository {
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Wallet operations
  getWalletBalance(userId: number): Promise<string>;
  updateWalletBalance(userId: number, amount: string): Promise<void>;
  updateWalletBalanceInTransaction(updates: Array<{userId: number, amount: string}>, walletTransactionData: InsertWalletTransaction[]): Promise<void>;

  // Wallet transaction operations
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]>;

  // Escrow transaction operations
  getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined>;
  getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]>;
  getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]>;
  getEscrowTransactionByChat(productId: number, buyerId: number, sellerId: number): Promise<EscrowTransaction | undefined>;
  createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction>;
  updateEscrowTransaction(id: number, updates: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined>;
  getEscrowStats(): Promise<{ pending: number; active: number; completed: number; disputed: number }>;

  // Money request operations
  createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest>;
  getMoneyRequest(id: number): Promise<MoneyRequest | undefined>;
  getMoneyRequestsByUser(userId: number, type?: 'sent' | 'received'): Promise<MoneyRequest[]>;
  updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined>;
  getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]>;

  // E-wallet connection operations
  createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection>;
  getEwalletConnection(id: number): Promise<EwalletConnection | undefined>;
  getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]>;
  getEwalletConnectionByProvider(userId: number, provider: string): Promise<EwalletConnection | undefined>;
  updateEwalletConnection(id: number, updates: Partial<EwalletConnection>): Promise<EwalletConnection | undefined>;
  deleteEwalletConnection(id: number): Promise<void>;

  // Service order operations
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  getServiceOrder(id: number): Promise<ServiceOrder | undefined>;
  getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]>;
  getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined>;
  updateServiceOrder(id: number, updates: Partial<ServiceOrder>): Promise<ServiceOrder | undefined>;
}
