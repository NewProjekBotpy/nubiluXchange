import type { ITransactionRepository } from "./interfaces/ITransactionRepository";
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
import {
  transactions,
  walletTransactions,
  escrowTransactions,
  moneyRequests,
  ewalletConnections,
  serviceOrders,
  users
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, or, gt } from "drizzle-orm";

export class TransactionRepository implements ITransactionRepository {
  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionByPaymentId(paymentId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.paymentId, paymentId));
    return transaction || undefined;
  }

  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }

  // Wallet operations
  async getWalletBalance(userId: number): Promise<string> {
    const [user] = await db.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return user?.balance || "0";
  }

  async updateWalletBalance(userId: number, amount: string): Promise<void> {
    await db.update(users).set({ walletBalance: amount }).where(eq(users.id, userId));
  }

  async updateWalletBalanceInTransaction(
    updates: Array<{userId: number, amount: string}>,
    walletTransactionData: InsertWalletTransaction[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Update all wallet balances atomically
      for (const update of updates) {
        await tx.update(users)
          .set({ walletBalance: update.amount })
          .where(eq(users.id, update.userId));
      }
      
      // Create wallet transaction records atomically
      if (walletTransactionData.length > 0) {
        await tx.insert(walletTransactions).values(walletTransactionData);
      }
    });
  }

  // Wallet transaction operations
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const [walletTransaction] = await db.insert(walletTransactions).values(transaction).returning();
    return walletTransaction;
  }

  async getWalletTransactionsByUser(userId: number): Promise<WalletTransaction[]> {
    return await db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt));
  }

  // Escrow transaction operations
  async getEscrowTransaction(id: number): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, id));
    return escrow || undefined;
  }

  async getEscrowTransactionsByUser(userId: number): Promise<EscrowTransaction[]> {
    return await db.select().from(escrowTransactions)
      .where(or(eq(escrowTransactions.buyerId, userId), eq(escrowTransactions.sellerId, userId)))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  async getEscrowTransactionsByStatus(status: string): Promise<EscrowTransaction[]> {
    return await db.select().from(escrowTransactions)
      .where(eq(escrowTransactions.status, status))
      .orderBy(desc(escrowTransactions.createdAt));
  }

  async getEscrowTransactionByChat(productId: number, buyerId: number, sellerId: number): Promise<EscrowTransaction | undefined> {
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

  async createEscrowTransaction(escrow: InsertEscrowTransaction): Promise<EscrowTransaction> {
    const [newEscrow] = await db.insert(escrowTransactions).values(escrow).returning();
    return newEscrow;
  }

  async updateEscrowTransaction(id: number, updates: Partial<EscrowTransaction>): Promise<EscrowTransaction | undefined> {
    const [escrow] = await db.update(escrowTransactions).set(updates).where(eq(escrowTransactions.id, id)).returning();
    return escrow || undefined;
  }

  async getEscrowStats(): Promise<{ pending: number; active: number; completed: number; disputed: number }> {
    const [stats] = await db.select({
      pending: db.$count(escrowTransactions, eq(escrowTransactions.status, "pending")),
      active: db.$count(escrowTransactions, eq(escrowTransactions.status, "active")),
      completed: db.$count(escrowTransactions, eq(escrowTransactions.status, "completed")),
      disputed: db.$count(escrowTransactions, eq(escrowTransactions.status, "disputed"))
    }).from(escrowTransactions);
    return stats || { pending: 0, active: 0, completed: 0, disputed: 0 };
  }

  // Money request operations
  async createMoneyRequest(request: InsertMoneyRequest): Promise<MoneyRequest> {
    const [newRequest] = await db.insert(moneyRequests).values(request).returning();
    return newRequest;
  }

  async getMoneyRequest(id: number): Promise<MoneyRequest | undefined> {
    const [request] = await db.select().from(moneyRequests).where(eq(moneyRequests.id, id));
    return request || undefined;
  }

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

  async updateMoneyRequest(id: number, updates: Partial<MoneyRequest>): Promise<MoneyRequest | undefined> {
    const [updated] = await db.update(moneyRequests)
      .set(updates)
      .where(eq(moneyRequests.id, id))
      .returning();
    return updated || undefined;
  }

  async getPendingRequestsForUser(userId: number): Promise<MoneyRequest[]> {
    return await db.select().from(moneyRequests)
      .where(and(
        eq(moneyRequests.receiverId, userId),
        eq(moneyRequests.status, 'pending'),
        gt(moneyRequests.expiresAt, new Date())
      ))
      .orderBy(desc(moneyRequests.createdAt));
  }

  // E-wallet connection operations
  async createEwalletConnection(connection: InsertEwalletConnection): Promise<EwalletConnection> {
    const [newConnection] = await db.insert(ewalletConnections).values(connection).returning();
    return newConnection;
  }

  async getEwalletConnection(id: number): Promise<EwalletConnection | undefined> {
    const [connection] = await db.select().from(ewalletConnections).where(eq(ewalletConnections.id, id));
    return connection || undefined;
  }

  async getEwalletConnectionsByUser(userId: number): Promise<EwalletConnection[]> {
    return await db.select().from(ewalletConnections)
      .where(and(
        eq(ewalletConnections.userId, userId),
        eq(ewalletConnections.isActive, true)
      ))
      .orderBy(desc(ewalletConnections.createdAt));
  }

  async getEwalletConnectionByProvider(userId: number, provider: string): Promise<EwalletConnection | undefined> {
    const [connection] = await db.select().from(ewalletConnections)
      .where(and(
        eq(ewalletConnections.userId, userId),
        eq(ewalletConnections.provider, provider),
        eq(ewalletConnections.isActive, true)
      ));
    return connection || undefined;
  }

  async updateEwalletConnection(id: number, updates: Partial<EwalletConnection>): Promise<EwalletConnection | undefined> {
    const [updated] = await db.update(ewalletConnections)
      .set(updates)
      .where(eq(ewalletConnections.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEwalletConnection(id: number): Promise<void> {
    await db.update(ewalletConnections)
      .set({ isActive: false })
      .where(eq(ewalletConnections.id, id));
  }

  // Service order operations
  async createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder> {
    const [newOrder] = await db.insert(serviceOrders).values(order).returning();
    return newOrder;
  }

  async getServiceOrder(id: number): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return order || undefined;
  }

  async getServiceOrdersByUser(userId: number): Promise<ServiceOrder[]> {
    return await db.select().from(serviceOrders)
      .where(eq(serviceOrders.userId, userId))
      .orderBy(desc(serviceOrders.createdAt));
  }

  async getServiceOrderByNumber(orderNumber: string): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders)
      .where(eq(serviceOrders.orderNumber, orderNumber));
    return order || undefined;
  }

  async updateServiceOrder(id: number, updates: Partial<ServiceOrder>): Promise<ServiceOrder | undefined> {
    const [updated] = await db.update(serviceOrders)
      .set(updates)
      .where(eq(serviceOrders.id, id))
      .returning();
    return updated || undefined;
  }
}
