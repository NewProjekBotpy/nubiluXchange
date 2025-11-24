import { Request } from "express";
import { storage } from "../storage";
import { logError } from "./logger";

// Activity Logging Utilities
export const logUserActivity = async (
  userId: number | null, 
  action: string, 
  category: 'user_action' | 'system_action' | 'ai_action' = 'user_action',
  details: Record<string, any> = {},
  adminId?: number,
  req?: Request,
  status: 'success' | 'error' | 'warning' = 'success'
): Promise<void> => {
  try {
    await storage.createAdminActivityLog({
      userId: userId || undefined,
      adminId: adminId || undefined,
      action,
      category,
      details,
      ipAddress: req?.ip || undefined,
      userAgent: req?.get('User-Agent') || undefined,
      status
    });
  } catch (error) {
    logError(error, 'Failed to log user activity');
  }
};

// Specific activity loggers for different types of activities
export const logPostingActivity = async (userId: number, postType: string, postId: number, req?: Request) => {
  await logUserActivity(userId, 'posting', 'user_action', {
    postType,
    postId,
    timestamp: new Date().toISOString()
  }, undefined, req);
};

export const logTransactionActivity = async (
  userId: number, 
  transactionType: string, 
  transactionId: number, 
  amount: string,
  status: string,
  req?: Request
) => {
  await logUserActivity(userId, 'transaction', 'user_action', {
    transactionType,
    transactionId,
    amount,
    status,
    timestamp: new Date().toISOString()
  }, undefined, req);
};

export const logChatActivity = async (
  userId: number, 
  chatAction: string, 
  chatId: number, 
  messageId?: number,
  req?: Request
) => {
  await logUserActivity(userId, 'chat', 'user_action', {
    chatAction,
    chatId,
    messageId,
    timestamp: new Date().toISOString()
  }, undefined, req);
};

export const logAIResponseActivity = async (
  userId: number, 
  aiAction: string, 
  prompt: string, 
  response: string,
  processingTime?: number,
  req?: Request
) => {
  await logUserActivity(userId, 'ai_response', 'ai_action', {
    aiAction,
    prompt: prompt.substring(0, 200), // Limit prompt length for logging
    response: response.substring(0, 500), // Limit response length for logging
    processingTime,
    timestamp: new Date().toISOString()
  }, undefined, req);
};

export const logQRISPaymentActivity = async (
  userId: number, 
  paymentAction: string, 
  paymentId: string, 
  amount: string,
  status: string,
  req?: Request
) => {
  await logUserActivity(userId, 'qris_payment', 'user_action', {
    paymentAction,
    paymentId,
    amount,
    status,
    timestamp: new Date().toISOString()
  }, undefined, req);
};

export const logWalletActivity = async (
  userId: number, 
  walletAction: string, 
  amount: string, 
  balance: string,
  transactionType: string,
  req?: Request
) => {
  await logUserActivity(userId, 'wallet', 'user_action', {
    walletAction,
    amount,
    balance,
    transactionType,
    timestamp: new Date().toISOString()
  }, undefined, req);
};