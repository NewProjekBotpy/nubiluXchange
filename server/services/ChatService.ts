import { ChatRepository } from "../repositories/ChatRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { logChatActivity } from "../utils/activity-logger";
import { logError, logWarning, logInfo, logDebug } from '../utils/logger';
import { insertChatSchema, insertMessageSchema, insertMessageReactionSchema } from "@shared/schema";
import { RedisService } from "./RedisService";
import type { Request } from "express";

const chatRepo = new ChatRepository();
const productRepo = new ProductRepository();

// FIX BUG #14: Helper function to verify product access and chat permissions
async function verifyProductAccess(chat: any, userId: number): Promise<any> {
  const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
  
  // If chat has a productId but product is missing, it's a data inconsistency error
  if (chat.productId && !product) {
    throw new Error('Product not found - the product associated with this chat may have been deleted');
  }
  
  // Verify user has access to this chat (either as buyer or seller)
  if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
    throw new Error('Access denied');
  }
  
  return product;
}

export class ChatService {
  static async createChat(chatData: any, userId: number, req?: Request) {
    try {
      const validatedData = insertChatSchema.parse(chatData);
      
      // Declare newChat variable at function scope
      let newChat;
      
      // Verify user can create chat for this product
      if (validatedData.productId) {
        const product = await productRepo.getProduct(validatedData.productId);
        if (!product) {
          throw new Error('Product not found');
        }
        
        // Check if chat already exists between buyer and seller
        const existingChat = await chatRepo.getChatsByUser(userId);
        const duplicateChat = existingChat.find(chat => 
          chat.productId === validatedData.productId && 
          (chat.buyerId === userId || product.sellerId === userId)
        );
        
        if (duplicateChat) {
          return duplicateChat;
        }
        
        // Determine chat creation based on user role
        let chatData;
        if (product.sellerId === userId) {
          // Seller initiating chat - need buyerId from request
          if (!validatedData.buyerId) {
            throw new Error('Buyer ID is required when seller initiates chat');
          }
          chatData = {
            ...validatedData,
            sellerId: userId
          };
        } else {
          // Buyer initiating chat
          chatData = {
            ...validatedData,
            buyerId: userId
          };
        }
        
        newChat = await chatRepo.createChat(chatData);
      } else {
        // General chat without product context
        newChat = await chatRepo.createChat({
          ...validatedData,
          buyerId: userId
        });
      }
      
      // Log chat creation activity
      await logChatActivity(userId, 'create', newChat.id, undefined, req);
      
      return newChat;
    } catch (error: any) {
      logError(error, 'Create chat error', userId);
      
      if (error.message.includes('not found') || error.message.includes('Buyer ID is required')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid chat data. Please check your input.');
      }
      
      throw new Error('Failed to create chat. Please try again.');
    }
  }

  static async getUserChats(userId: number) {
    try {
      return await chatRepo.getChatsWithDetailsByUser(userId);
    } catch (error: any) {
      logError(error, 'Get user chats error', userId);
      throw new Error('Failed to retrieve chats. Please try again.');
    }
  }

  static async getChatById(chatId: number, userId: number) {
    try {
      const chat = await chatRepo.getChatWithDetails(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // FIX BUG #14: Use helper function to verify access
      await verifyProductAccess(chat, userId);
      
      return chat;
    } catch (error: any) {
      logError(error, `Get chat by ID error - chatId: ${chatId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve chat. Please try again.');
    }
  }

  static async getChatMessages(chatId: number, userId: number, options?: { before?: number; limit?: number }) {
    try {
      // First verify user has access to this chat
      const chat = await chatRepo.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      // FIX BUG #14: Use helper function to verify access
      await verifyProductAccess(chat, userId);
      
      // If pagination params are provided, skip cache and go directly to database
      if (options?.before || options?.limit) {
        return await chatRepo.getMessagesByChatId(chatId, options);
      }
      
      // FIX BUG #10: Try to get from Redis cache first with error recovery
      try {
        const cachedMessages = await RedisService.getRecentMessages(chatId);
        if (cachedMessages && cachedMessages.length > 0) {
          return cachedMessages;
        }
      } catch (redisError) {
        // Log Redis error but continue with database fallback
        logError(redisError as Error, 'Redis cache read failed, falling back to database', userId);
      }
      
      // Fallback to database
      const messages = await chatRepo.getMessagesByChatId(chatId);
      
      // Cache the messages for future requests with error recovery
      if (messages.length > 0) {
        const chatMessages = messages.map(msg => ({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          messageType: msg.messageType || 'text',
          timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
          metadata: msg.metadata || {}
        }));
        
        try {
          await RedisService.cacheRecentMessages(chatId, chatMessages);
        } catch (redisCacheError) {
          // Log caching error but don't fail the request
          logError(redisCacheError as Error, 'Redis cache write failed', userId);
        }
      }
      
      return messages;
    } catch (error: any) {
      logError(error, `Get chat messages error - chatId: ${chatId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve chat messages. Please try again.');
    }
  }

  static async sendMessage(messageData: any, chatId: number, userId: number, req?: Request) {
    try {
      const validatedData = insertMessageSchema.parse(messageData);
      
      // Check rate limiting
      const rateLimit = await RedisService.checkMessageRateLimit(userId);
      if (!rateLimit.allowed) {
        throw new Error('Rate limit exceeded. Please slow down your messaging.');
      }
      
      // Verify user has access to this chat
      const chat = await chatRepo.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }
      
      const newMessage = await chatRepo.createMessage({
        ...validatedData,
        chatId: chatId,
        senderId: userId // Use authenticated user ID, not client-provided
      });
      
      // Create message object for Redis
      const chatMessage = {
        id: newMessage.id,
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        content: newMessage.content,
        messageType: newMessage.messageType || 'text',
        timestamp: newMessage.createdAt?.toISOString() || new Date().toISOString(),
        metadata: newMessage.metadata || {}
      };
      
      // Publish message to Redis for real-time delivery
      await RedisService.publishMessage(chatId, chatMessage);
      
      // Update cached participants
      const participants = [chat.buyerId];
      if (product) participants.push(product.sellerId);
      await RedisService.setChatParticipants(chatId, participants);
      
      // Invalidate cached messages to force refresh
      const cachedMessages = await RedisService.getRecentMessages(chatId);
      if (cachedMessages) {
        const updatedMessages = [...cachedMessages, chatMessage].slice(-50); // Keep last 50 messages
        await RedisService.cacheRecentMessages(chatId, updatedMessages);
      }
      
      // Log chat activity
      await logChatActivity(userId, 'send_message', chatId, newMessage.id, req);
      
      return newMessage;
    } catch (error: any) {
      logError(error, `Send message error - chatId: ${chatId}`, userId);
      
      if (error.message.includes('Rate limit') || error.message.includes('not found') || 
          error.message.includes('Access denied')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid message data. Please check your input.');
      }
      
      throw new Error('Failed to send message. Please try again.');
    }
  }

  static async getUnreadChatsCount(userId: number) {
    try {
      const unreadCounts = await chatRepo.getUnreadCountsForUser(userId);
      return Object.values(unreadCounts).reduce((total, count) => total + (count > 0 ? 1 : 0), 0);
    } catch (error: any) {
      logError(error, 'Get unread chats count error', userId);
      throw new Error('Failed to retrieve unread chats count. Please try again.');
    }
  }

  static async markMessageAsDelivered(messageId: number, userId: number, req?: Request) {
    try {
      // Get message and verify authorization
      const message = await chatRepo.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      const chat = await chatRepo.getChat(message.chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }
      
      // Only the recipient can mark as delivered
      if (message.senderId === userId) {
        throw new Error('Cannot mark your own message as delivered');
      }
      
      // Log activity
      await logChatActivity(userId, 'mark_delivered', message.chatId, messageId, req);
      
      return { message: 'Message marked as delivered' };
    } catch (error: any) {
      logError(error, `Mark message as delivered error - messageId: ${messageId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied') || 
          error.message.includes('Cannot mark')) {
        throw error;
      }
      
      throw new Error('Failed to mark message as delivered. Please try again.');
    }
  }

  static async markMessageAsRead(messageId: number, userId: number, req?: Request) {
    try {
      // Get message first
      const message = await chatRepo.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      
      const chat = await chatRepo.getChat(message.chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }
      
      // Only the recipient can mark as read
      if (message.senderId === userId) {
        throw new Error('Cannot mark your own message as read');
      }
      
      // Update message status and chat read tracking
      await chatRepo.updateMessageStatus(messageId, 'read');
      await chatRepo.updateChatReadTracking(userId, message.chatId, messageId);
      
      // Log activity
      await logChatActivity(userId, 'mark_read', message.chatId, messageId, req);
      
      return { message: 'Message marked as read' };
    } catch (error: any) {
      logError(error, `Mark message as read error - messageId: ${messageId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied') || 
          error.message.includes('Cannot mark')) {
        throw error;
      }
      
      throw new Error('Failed to mark message as read. Please try again.');
    }
  }

  static async addReaction(messageId: number, userId: number, emoji: string, req?: Request) {
    try {
      const validatedData = insertMessageReactionSchema.parse({
        messageId,
        userId,
        emoji
      });

      // Verify message exists and user has access
      const message = await chatRepo.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const chat = await chatRepo.getChat(message.chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }

      // Check if user already has a reaction on this message
      const existingReaction = await chatRepo.getReactionsByUser(userId, messageId);
      
      if (existingReaction) {
        // If same emoji, do nothing
        if (existingReaction.emoji === emoji) {
          return existingReaction;
        }
        
        // Remove old reaction first
        await chatRepo.removeMessageReaction(messageId, userId);
      }

      // Add new reaction
      const newReaction = await chatRepo.addMessageReaction(validatedData);

      // Publish reaction update via Redis for real-time delivery
      await RedisService.publishReactionUpdate(message.chatId, {
        type: 'add_reaction',
        messageId,
        userId,
        emoji,
        reactionId: newReaction.id,
        timestamp: new Date().toISOString()
      });

      // Log activity
      await logChatActivity(userId, 'add_reaction', message.chatId, messageId, req);

      return newReaction;
    } catch (error: any) {
      logError(error, `Add reaction error - messageId: ${messageId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        throw error;
      }
      
      if (error.name === 'ZodError') {
        throw new Error('Invalid reaction data. Please check your input.');
      }
      
      throw new Error('Failed to add reaction. Please try again.');
    }
  }

  static async removeReaction(messageId: number, userId: number, req?: Request) {
    try {
      // Verify message exists and user has access
      const message = await chatRepo.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const chat = await chatRepo.getChat(message.chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }

      // Remove reaction
      const removed = await chatRepo.removeMessageReaction(messageId, userId);
      
      if (!removed) {
        throw new Error('Reaction not found');
      }

      // Publish reaction update via Redis for real-time delivery
      await RedisService.publishReactionUpdate(message.chatId, {
        type: 'remove_reaction',
        messageId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Log activity
      await logChatActivity(userId, 'remove_reaction', message.chatId, messageId, req);

      return { message: 'Reaction removed' };
    } catch (error: any) {
      logError(error, `Remove reaction error - messageId: ${messageId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        throw error;
      }
      
      throw new Error('Failed to remove reaction. Please try again.');
    }
  }

  static async getMessageReactions(messageId: number, userId: number) {
    try {
      // Verify message exists and user has access
      const message = await chatRepo.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const chat = await chatRepo.getChat(message.chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const product = chat.productId ? await productRepo.getProduct(chat.productId) : null;
      
      // If chat has a productId but product is missing, it's a data inconsistency error
      if (chat.productId && !product) {
        throw new Error('Product not found - the product associated with this chat may have been deleted');
      }
      
      if (chat.buyerId !== userId && (!product || product.sellerId !== userId)) {
        throw new Error('Access denied');
      }

      return await chatRepo.getMessageReactions(messageId);
    } catch (error: any) {
      logError(error, `Get message reactions error - messageId: ${messageId}`, userId);
      
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        throw error;
      }
      
      throw new Error('Failed to retrieve message reactions. Please try again.');
    }
  }
}
