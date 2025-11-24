import { db } from "../db";
import { transactions, users, walletTransactions } from "@shared/schema";
import { eq, ne, and, sql } from "drizzle-orm";
import { snap, coreApi } from "../utils/payment";
import { logTransactionActivity, logQRISPaymentActivity, logWalletActivity } from "../utils/activity-logger";
import { midtransChargeSchema, midtransWebhookSchema } from "@shared/schema";
import { validateSufficientBalance, validateAmount } from "../utils/balance-validator";
import { EscrowRiskService } from "./EscrowRiskService";
import { FraudAlertService } from "./FraudAlertService";
import { RedisService } from "./RedisService";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";
import type { Request } from "express";
import crypto from "crypto";
import { UserRepository } from "../repositories/UserRepository";
import { PaymentsRepository } from "../repositories/PaymentsRepository";

const userRepo = new UserRepository();
const paymentsRepo = new PaymentsRepository();

export class PaymentService {
  /**
   * CRITICAL SECURITY: Verify Midtrans webhook signature
   * Prevents webhook forgery attacks by validating SHA512 signature
   */
  private static verifyWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    
    // SECURITY: Reject webhook if server key is not configured
    if (!serverKey) {
      logError(new Error('Midtrans server key not configured'), 'SECURITY ALERT: Midtrans server key not configured - rejecting webhook', {
        orderId,
        statusCode,
        operation: 'webhook_signature_verification'
      });
      return false;
    }
    
    // Compute SHA512 hash as per Midtrans specification
    const payload = orderId + statusCode + grossAmount + serverKey;
    const computedSignature = crypto.createHash('sha512').update(payload).digest('hex');
    
    // Validate signature format before comparison
    if (!/^[0-9a-fA-F]{128}$/.test(signatureKey) || !/^[0-9a-fA-F]{128}$/.test(computedSignature)) {
      logError(new Error('Invalid webhook signature format'), 'Invalid signature format detected', {
        orderId,
        statusCode,
        amount: grossAmount,
        signatureLength: signatureKey?.length || 0,
        operation: 'webhook_signature_verification'
      });
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(signatureKey, 'hex')
    );
    
    if (!isValid) {
      logError(new Error('Invalid webhook signature'), 'SECURITY ALERT: Invalid webhook signature detected', {
        orderId,
        statusCode,
        amount: grossAmount,
        receivedSignaturePrefix: signatureKey.substring(0, 8) + '...',
        computedSignaturePrefix: computedSignature.substring(0, 8) + '...',
        operation: 'webhook_signature_verification'
      });
    }
    
    return isValid;
  }
  static async createMidtransPayment(paymentData: any, userId: number, req?: Request, idempotencyKey?: string) {
    if (!snap) {
      throw new Error('Payment service is currently unavailable. Please try again later or contact support.');
    }

    try {
      const validatedData = midtransChargeSchema.parse(paymentData);
      
      // Enhanced input validation using centralized validator
      const amountValidation = validateAmount(validatedData.amount);
      if (!amountValidation.isValid) {
        throw new Error(amountValidation.message!);
      }
      
      // BUG #22 FIX: Generate deterministic idempotency key from userId + productId + amount
      // This ensures the same payment request always generates the same key
      const productIdStr = validatedData.productId ? validatedData.productId.toString() : 'topup';
      const idempotencyData = `${userId}:${productIdStr}:${validatedData.amount}`;
      const generatedIdempotencyKey = crypto
        .createHash('sha256')
        .update(idempotencyData)
        .digest('hex')
        .substring(0, 32);
      
      // BUG #22 FIX: Check for existing idempotency key in Redis/memory
      // This handles both duplicate detection and race conditions atomically
      const existingTransactionId = await RedisService.getIdempotencyKey(generatedIdempotencyKey);
      
      if (existingTransactionId) {
        // Found existing transaction - fetch it from database
        const existingTransaction = await paymentsRepo.getTransaction(existingTransactionId);
        
        if (existingTransaction) {
          // BUG #22 FIX: Only return existing transaction if it's still pending
          // Allow retry for failed/expired transactions by deleting the idempotency key
          if (existingTransaction.status === 'failed' || existingTransaction.status === 'expired') {
            logInfo('Previous transaction failed/expired - allowing retry', {
              userId,
              transactionId: existingTransaction.id,
              status: existingTransaction.status,
              amount: validatedData.amount,
              operation: 'create_payment_retry'
            });
            
            // Delete the idempotency key to allow retry
            await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
          } else if (existingTransaction.status === 'pending') {
            // Transaction is still pending - return it (prevents double-click duplicates)
            logInfo('Idempotent payment request - returning existing pending transaction', {
              userId,
              existingTransactionId: existingTransaction.id,
              existingStatus: existingTransaction.status,
              amount: validatedData.amount,
              operation: 'create_payment_idempotent'
            });
            
            return {
              success: true,
              transaction: existingTransaction,
              snapToken: existingTransaction.metadata?.snapToken,
              redirectUrl: existingTransaction.metadata?.paymentUrl,
              isExisting: true
            };
          } else if (existingTransaction.status === 'completed') {
            // BUG #22 FIX: Completed transaction - allow new payment (back-to-back purchases)
            // Delete the idempotency key so user can make another purchase
            logInfo('Previous transaction completed - allowing new payment', {
              userId,
              previousTransactionId: existingTransaction.id,
              amount: validatedData.amount,
              operation: 'create_payment_new_after_completion'
            });
            
            await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
          }
        }
      }
      
      // Generate unique order ID for new payment using Date.now() for uniqueness
      // BUG #22 FIX: Keep Date.now() to ensure each order ID is unique across retries
      const orderId = `ORDER-${Date.now()}-${userId}`;
      
      // Create placeholder transaction first to get transaction ID for atomic lock
      // This allows us to use SET NX for race condition prevention
      const placeholderTransaction = await paymentsRepo.createTransaction({
        buyerId: userId,
        sellerId: userId, // For wallet topup, buyer and seller are the same
        productId: validatedData.productId || null,
        paymentId: orderId,
        amount: validatedData.amount.toString(),
        commission: '0', // No commission for wallet topup
        status: 'pending',
        paymentMethod: 'midtrans',
        metadata: {
          placeholder: true,
          createdAt: new Date().toISOString()
        }
      });
      
      // BUG #22 FIX: Atomic lock acquisition using Redis SET NX
      // This prevents race conditions when multiple requests arrive simultaneously
      const lockAcquired = await RedisService.acquireIdempotencyLock(
        generatedIdempotencyKey,
        placeholderTransaction.id,
        300 // 5 minutes TTL
      );
      
      if (!lockAcquired) {
        // BUG #22 FIX: Another request won the race - poll for the complete transaction
        logInfo('Lost idempotency lock race - another request is processing this payment', {
          userId,
          ourTransactionId: placeholderTransaction.id,
          amount: validatedData.amount,
          operation: 'create_payment_race_lost'
        });
        
        // Delete our placeholder transaction
        await db.delete(transactions).where(eq(transactions.id, placeholderTransaction.id));
        
        // Get the winning transaction ID
        const winningTransactionId = await RedisService.getIdempotencyKey(generatedIdempotencyKey);
        if (!winningTransactionId) {
          throw new Error('Payment processing conflict. Please try again.');
        }
        
        // BUG #22 FIX: Poll for the winning transaction to complete with Midtrans data
        // The winning request may still be calling Midtrans API, so we need to wait for it
        const maxAttempts = 10;
        const pollInterval = 500; // 500ms between attempts
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const winningTransaction = await paymentsRepo.getTransaction(winningTransactionId);
          
          if (!winningTransaction) {
            logWarning('Winning transaction not found during polling', {
              userId,
              winningTransactionId,
              attempt,
              maxAttempts,
              operation: 'create_payment_race_polling'
            });
            
            // If last attempt, throw error
            if (attempt === maxAttempts) {
              throw new Error('Payment processing error. Please try again.');
            }
            
            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            continue;
          }
          
          // Check if transaction has been populated with Midtrans data
          const hasSnapToken = winningTransaction.metadata && 
                              typeof winningTransaction.metadata === 'object' &&
                              'snapToken' in winningTransaction.metadata &&
                              winningTransaction.metadata.snapToken;
          
          if (hasSnapToken) {
            logInfo('Race loser received fully populated transaction', {
              userId,
              winningTransactionId,
              attempt,
              totalWaitTime: attempt * pollInterval,
              operation: 'create_payment_race_polling_success'
            });
            
            const metadata = winningTransaction.metadata as { snapToken: string; paymentUrl: string };
            return {
              success: true,
              transaction: winningTransaction,
              snapToken: metadata.snapToken,
              redirectUrl: metadata.paymentUrl,
              isExisting: true
            };
          }
          
          // Transaction exists but not yet populated with Midtrans data
          logDebug('Waiting for winning transaction to complete Midtrans API call', {
            userId,
            winningTransactionId,
            attempt,
            maxAttempts,
            operation: 'create_payment_race_polling'
          });
          
          // Don't wait after last attempt
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }
        
        // Timeout: winning transaction didn't complete in time
        logWarning('Timeout waiting for winning transaction to complete', {
          userId,
          winningTransactionId,
          maxAttempts,
          totalWaitTime: maxAttempts * pollInterval,
          operation: 'create_payment_race_polling_timeout'
        });
        
        throw new Error('Payment is being processed. Please wait a moment and check your transaction history.');
      }
      
      // We won the race - proceed with payment creation
      logInfo('Idempotency lock acquired - proceeding with payment creation', {
        userId,
        transactionId: placeholderTransaction.id,
        amount: validatedData.amount,
        operation: 'create_payment_lock_acquired'
      });

      // RISK ASSESSMENT: Assess transaction risk before processing
      if (validatedData.productId) {
        const riskAssessment = await EscrowRiskService.assessTransactionRisk(
          userId,
          validatedData.productId,
          validatedData.amount.toString(),
          req
        );

        // Block or delay high-risk transactions
        if (riskAssessment.level === 'critical') {
          // BUG #22 FIX: Critical risk - delete placeholder transaction and idempotency key
          await db.delete(transactions).where(eq(transactions.id, placeholderTransaction.id));
          await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
          
          // Create fraud alerts for critical risk
          await FraudAlertService.processRiskAssessment(
            userId,
            placeholderTransaction.id,
            riskAssessment,
            validatedData.amount.toString(),
            req
          );
          
          throw new Error(`Transaction blocked due to security concerns: ${riskAssessment.factors[0]}. Please contact customer support.`);
        }
        
        if (riskAssessment.level === 'high' && riskAssessment.requiresManualReview) {
          // For high-risk transactions, create alerts and continue with monitoring
          logWarning('High-risk transaction detected', {
            userId,
            amount: validatedData.amount.toString(),
            riskLevel: riskAssessment.level,
            riskScore: riskAssessment.score,
            riskFactors: riskAssessment.factors,
            operation: 'create_payment'
          });
          
          // Generate fraud alerts for high-risk transactions
          await FraudAlertService.processRiskAssessment(
            userId,
            placeholderTransaction.id,
            riskAssessment,
            validatedData.amount.toString(),
            req
          );
        }
      }
      
      // Get user data for payment
      const user = await userRepo.getUser(userId);
      if (!user) {
        // BUG #22 FIX: User not found - delete placeholder and idempotency key
        await db.delete(transactions).where(eq(transactions.id, placeholderTransaction.id));
        await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
        throw new Error('User account not found. Please log in again.');
      }
      
      // Check if user has any pending transactions
      const pendingTransactions = await paymentsRepo.getTransactionsByUser(userId);
      const activePending = pendingTransactions.filter(t => t.status === 'pending').length;
      if (activePending > 5) {
        // BUG #22 FIX: Too many pending - delete placeholder and idempotency key
        await db.delete(transactions).where(eq(transactions.id, placeholderTransaction.id));
        await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
        throw new Error('Too many pending payments. Please complete or cancel existing payments first.');
      }
    
    try {
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(validatedData.amount)
        },
        credit_card: {
          secure: true
        },
        customer_details: {
          email: user.email,
          first_name: user.displayName || user.username,
        }
      };

      // Create transaction with Midtrans
      const midtransTransaction = await snap.createTransaction(parameter);
      
      // BUG #22 FIX: Update placeholder transaction with Midtrans data instead of creating new one
      const [updatedTransaction] = await db.update(transactions)
        .set({
          metadata: {
            snapToken: midtransTransaction.token,
            paymentUrl: midtransTransaction.redirect_url,
            createdAt: new Date().toISOString()
          }
        })
        .where(eq(transactions.id, placeholderTransaction.id))
        .returning();

      // Update fraud alerts with transaction ID if high-risk transaction
      if (validatedData.productId) {
        const riskAssessment = await EscrowRiskService.getCachedRiskAssessment(
          userId,
          validatedData.productId
        );
        
        if (riskAssessment && (riskAssessment.level === 'high' || riskAssessment.level === 'medium')) {
          // Re-process with transaction ID for tracking
          await FraudAlertService.processRiskAssessment(
            userId,
            updatedTransaction.id,
            riskAssessment,
            validatedData.amount.toString(),
            req
          );
        }
      }

      // Log transaction activity
      await logTransactionActivity(
        userId,
        'create_payment',
        updatedTransaction.id,
        validatedData.amount.toString(),
        'pending',
        req
      );

      return {
        success: true,
        transaction: updatedTransaction,
        snapToken: midtransTransaction.token,
        redirectUrl: midtransTransaction.redirect_url
      };
    } catch (error: any) {
      // BUG #22 FIX: Midtrans failed - clean up placeholder transaction and idempotency key
      // Mark transaction as failed and delete idempotency key to allow retry
      try {
        await db.update(transactions)
          .set({ status: 'failed' })
          .where(eq(transactions.id, placeholderTransaction.id));
        
        await RedisService.deleteIdempotencyKey(generatedIdempotencyKey);
        
        logInfo('Cleaned up failed payment attempt - user can retry', {
          userId,
          transactionId: placeholderTransaction.id,
          amount: validatedData.amount,
          operation: 'cleanup_failed_payment'
        });
      } catch (cleanupError) {
        logError(cleanupError, 'Failed to clean up after Midtrans error', {
          userId,
          transactionId: placeholderTransaction.id
        });
      }
      
      logError(error, 'Midtrans payment creation failed', {
        userId,
        amount: paymentData.amount,
        operation: 'create_midtrans_payment',
        timestamp: new Date().toISOString()
      });
      
      // Provide user-friendly error messages based on error type
      if (error.name === 'ZodError' || error.message.includes('validation')) {
        throw new Error('Invalid payment data. Please check your input and try again.');
      }
      
      if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (error.message.includes('Payment service is currently unavailable')) {
        throw error; // Pass through service unavailable message
      }
      
      if (error.message.includes('User account not found') || 
          error.message.includes('Too many pending payments') ||
          error.message.includes('exceeds maximum limit')) {
        throw error; // Pass through user-friendly messages
      }
      
      // Generic fallback for unexpected errors
      throw new Error('Payment creation failed. Please try again or contact support if the problem persists.');
    }
  } catch (error: any) {
    // Outer catch for validation errors and other early failures
    if (error.message.includes('ZodError')) {
      throw new Error('Invalid payment data provided. Please check your input.');
    }
    throw error;
  }
  }

  static async handleMidtransWebhook(webhookData: any, req?: Request) {
    try {
      // SECURITY STEP 1: Validate webhook data structure
      const validatedData = midtransWebhookSchema.parse(webhookData);
    
    // SECURITY STEP 2: CRITICAL - Verify webhook signature BEFORE any database operations
    const isSignatureValid = this.verifyWebhookSignature(
      validatedData.order_id,
      validatedData.status_code,
      validatedData.gross_amount,
      validatedData.signature_key
    );
    
    if (!isSignatureValid) {
      // SECURITY: Log attempted webhook forgery and reject
      logError(new Error('Webhook forgery attempt'), 'SECURITY ALERT: Webhook forgery attempt detected', {
        orderId: validatedData.order_id,
        statusCode: validatedData.status_code,
        amount: validatedData.gross_amount,
        ipAddress: req?.ip || 'unknown',
        userAgent: req?.get('user-agent') || 'unknown',
        operation: 'webhook_processing'
      });
      throw new Error('Webhook signature verification failed - potential forgery attack');
    }

      // Get transaction from database after signature verification
      const transaction = await paymentsRepo.getTransactionByPaymentId(validatedData.order_id);
      if (!transaction) {
        logError(new Error('Unknown transaction in webhook'), 'Webhook received for unknown transaction', {
          orderId: validatedData.order_id,
          transactionStatus: validatedData.transaction_status,
          amount: validatedData.gross_amount,
          operation: 'webhook_processing',
          timestamp: new Date().toISOString()
        });
        throw new Error(`Transaction with order ID ${validatedData.order_id} not found in database`);
      }

    // SECURITY STEP 3: Determine new status with regression prevention
    let newStatus = transaction.status;
    switch (validatedData.transaction_status) {
      case 'settlement':
      case 'capture':
        newStatus = 'completed';
        break;
      case 'pending':
        newStatus = 'pending';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'refund':
        newStatus = 'failed';
        break;
    }

    // FIX BUG #11: Add comprehensive status transition logging for debugging
    if (newStatus !== transaction.status) {
      logInfo('Payment status transition', {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        orderId: validatedData.order_id,
        amount: transaction.amount,
        previousStatus: transaction.status,
        newStatus: newStatus,
        midtransStatus: validatedData.transaction_status,
        paymentType: validatedData.payment_type,
        operation: 'webhook_status_transition',
        timestamp: new Date().toISOString()
      });
    } else {
      logDebug('Payment status unchanged', {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        orderId: validatedData.order_id,
        status: transaction.status,
        midtransStatus: validatedData.transaction_status,
        operation: 'webhook_processing'
      });
    }

    // SECURITY STEP 4: Prevent status regressions - 'completed' is terminal
    if (transaction.status === 'completed' && newStatus !== 'completed') {
      logWarning('SECURITY: Attempted status regression blocked', {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        orderId: validatedData.order_id,
        amount: transaction.amount,
        currentStatus: transaction.status,
        attemptedStatus: newStatus,
        webhookTransactionStatus: validatedData.transaction_status,
        operation: 'webhook_processing'
      });
      // Return current transaction without changes - completed status is terminal
      return transaction;
    }

    // SECURITY STEP 5: Use atomic database operations to prevent race conditions
    const result = await db.transaction(async (tx) => {
      let updatedTransaction;
      let shouldCreditWallet = false;

      if (newStatus === 'completed') {
        // SECURITY: Idempotent completion - only update if not already completed
        // This ensures only one webhook can successfully transition to 'completed'
        const updateResult = await tx.update(transactions)
          .set({
            status: newStatus,
            metadata: {
              ...transaction.metadata as any,
              webhookData: validatedData,
              securityChecks: {
                signatureVerified: true,
                processedAt: new Date().toISOString()
              }
            }
          })
          .where(and(
            eq(transactions.id, transaction.id), 
            ne(transactions.status, 'completed')
          ))
          .returning();
        
        // Only credit wallet if we actually updated a row (prevents race condition)
        if (updateResult.length > 0) {
          updatedTransaction = updateResult[0];
          // RACE CONDITION FIX: Only credit if this webhook successfully transitioned status to completed
          // If updateResult.length > 0, it means this webhook won the race and completed the transaction
          shouldCreditWallet = true;
        } else {
          // Transaction was already completed by another webhook (race condition handled)
          const [currentTransaction] = await tx.select()
            .from(transactions)
            .where(eq(transactions.id, transaction.id));
          updatedTransaction = currentTransaction;
          shouldCreditWallet = false; // Explicitly prevent double credit
          logInfo('Webhook processed but transaction already completed - duplicate prevented', {
            userId: transaction.buyerId,
            transactionId: transaction.id,
            orderId: validatedData.order_id,
            amount: transaction.amount,
            operation: 'webhook_duplicate_prevention'
          });
        }
      } else {
        // For non-completion status updates, only update if current status is not 'completed'
        const updateResult = await tx.update(transactions)
          .set({
            status: newStatus,
            metadata: {
              ...transaction.metadata as any,
              webhookData: validatedData,
              securityChecks: {
                signatureVerified: true,
                processedAt: new Date().toISOString()
              }
            }
          })
          .where(and(
            eq(transactions.id, transaction.id),
            ne(transactions.status, 'completed') // Prevent regression from completed
          ))
          .returning();
        
        updatedTransaction = updateResult[0] || transaction;
        
        // Log if update was blocked due to completed status
        if (updateResult.length === 0 && transaction.status === 'completed') {
          logInfo('Status regression blocked - transaction already completed', {
            userId: transaction.buyerId,
            transactionId: transaction.id,
            orderId: validatedData.order_id,
            amount: transaction.amount,
            attemptedStatus: newStatus,
            operation: 'webhook_processing'
          });
        }
      }

      // SECURITY STEP 6: Atomic wallet balance update using SQL arithmetic
      if (shouldCreditWallet && newStatus === 'completed') {
        // Use atomic SQL arithmetic to prevent race conditions
        await tx.update(users)
          .set({ 
            walletBalance: sql`${users.walletBalance} + ${transaction.amount}` 
          })
          .where(eq(users.id, transaction.buyerId));
        
        // Create wallet transaction record
        await tx.insert(walletTransactions).values({
          userId: transaction.buyerId,
          amount: transaction.amount,
          type: 'deposit',
          status: 'completed',
          description: `Secure payment deposit - Order ${transaction.paymentId || transaction.id}`,
          metadata: {
            relatedTransactionId: transaction.id,
            webhookVerified: true,
            processedAt: new Date().toISOString()
          }
        });
      }

      return updatedTransaction;
    });

    // Log transaction activity (outside transaction as it's not critical)
    await logTransactionActivity(
      transaction.buyerId,
      'webhook_update_secure',
      transaction.id,
      transaction.amount,
      newStatus,
      req
    );

      logInfo('Webhook processed successfully with security checks', {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        orderId: validatedData.order_id,
        amount: transaction.amount,
        oldStatus: transaction.status,
        newStatus: result.status,
        securityVerified: true,
        operation: 'webhook_processing'
      });

      return result;
    } catch (error: any) {
      logError(error, 'Webhook processing failed', {
        orderId: webhookData?.order_id,
        transactionStatus: webhookData?.transaction_status,
        amount: webhookData?.gross_amount,
        operation: 'webhook_processing',
        timestamp: new Date().toISOString()
      });
      
      // Provide specific error messages for different failure scenarios
      if (error.message.includes('Webhook signature verification failed')) {
        throw new Error('Webhook authentication failed. This request may not be from Midtrans.');
      }
      
      if (error.message.includes('Transaction') && error.message.includes('not found')) {
        throw error; // Pass through the detailed message
      }
      
      if (error.message.includes('ZodError') || error.message.includes('validation')) {
        throw new Error('Invalid webhook data format received from payment gateway.');
      }
      
      // Generic fallback
      throw new Error('Webhook processing failed: ' + error.message);
    }
  }

  static async getPaymentStatus(orderId: string, userId: number) {
    const transaction = await paymentsRepo.getTransactionByPaymentId(orderId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Verify user owns this transaction
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new Error('Access denied');
    }

    // If we have Midtrans API, get fresh status
    if (coreApi && transaction.paymentMethod === 'midtrans') {
      try {
        const status = await coreApi.transaction.status(orderId);
        
        // Update local transaction if status changed
        let newStatus = transaction.status;
        switch (status.transaction_status) {
          case 'settlement':
          case 'capture':
            newStatus = 'completed';
            break;
          case 'pending':
            newStatus = 'pending';
            break;
          case 'deny':
          case 'cancel':
          case 'expire':
          case 'failure':
            newStatus = 'failed';
            break;
        }

        if (newStatus !== transaction.status) {
          await paymentsRepo.updateTransaction(transaction.id, { status: newStatus });
        }

        return {
          ...transaction,
          status: newStatus,
          midtransStatus: status
        };
      } catch (error) {
        logError(error as Error, 'Failed to get Midtrans payment status', {
          userId,
          orderId,
          transactionId: transaction.id,
          operation: 'get_payment_status'
        });
      }
    }

    return transaction;
  }

  static async getUserTransactions(userId: number) {
    return await paymentsRepo.getTransactionsByUser(userId);
  }

  static async getUserWalletBalance(userId: number) {
    return await paymentsRepo.getWalletBalance(userId);
  }

  static async getUserWalletTransactions(userId: number) {
    return await paymentsRepo.getWalletTransactionsByUser(userId);
  }

  static async getUserWalletNotificationFlag(userId: number): Promise<boolean> {
    try {
      // Check for pending wallet transactions
      const walletTransactions = await paymentsRepo.getWalletTransactionsByUser(userId);
      const hasPendingTransactions = walletTransactions.some(t => t.status === 'pending');
      
      if (hasPendingTransactions) {
        return true;
      }

      // Check for pending money requests (incoming)
      const moneyRequests = await paymentsRepo.getMoneyRequestsByUser(userId, 'received');
      const hasPendingRequests = moneyRequests.some((r: any) => r.status === 'pending');
      
      return hasPendingRequests;
    } catch (error) {
      logError(error as Error, 'Error checking wallet notifications', {
        userId,
        operation: 'check_wallet_notifications'
      });
      return false; // Return false on error to prevent UI breaking
    }
  }
}