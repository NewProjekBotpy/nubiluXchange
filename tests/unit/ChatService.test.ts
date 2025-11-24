/**
 * Unit Tests: ChatService
 * Tests for chat service methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../../server/services/ChatService';
import { storage } from '../../server/storage';
import { logChatActivity } from '../../server/utils/activity-logger';
import { RedisService } from '../../server/services/RedisService';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/utils/activity-logger');
vi.mock('../../server/services/RedisService');

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChat', () => {
    it('should create chat for product between buyer and seller', async () => {
      const chatData = {
        productId: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        title: 'Test Product',
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);
      vi.mocked(storage.createChat).mockResolvedValue({
        id: 1,
        productId: 1,
        buyerId: 1,
        sellerId: 2
      } as any);

      const result = await ChatService.createChat(chatData, 1);

      expect(result.id).toBe(1);
      expect(storage.createChat).toHaveBeenCalled();
      expect(logChatActivity).toHaveBeenCalledWith(1, 'create', 1, undefined, undefined);
    });

    it('should return existing chat if already exists', async () => {
      const chatData = {
        productId: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      const existingChat = {
        id: 5,
        productId: 1,
        buyerId: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([existingChat] as any);

      const result = await ChatService.createChat(chatData, 1);

      expect(result.id).toBe(5);
      expect(storage.createChat).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent product', async () => {
      const chatData = {
        productId: 999,
        buyerId: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(null);

      await expect(ChatService.createChat(chatData, 1))
        .rejects.toThrow('Product not found');
    });

    it('should allow seller to initiate chat', async () => {
      const chatData = {
        productId: 1,
        buyerId: 3,
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);
      vi.mocked(storage.createChat).mockResolvedValue({
        id: 1,
        productId: 1,
        buyerId: 3,
        sellerId: 2
      } as any);

      const result = await ChatService.createChat(chatData, 2); // Seller initiating

      expect(result.sellerId).toBe(2);
      expect(result.buyerId).toBe(3);
    });

    it('should throw error when seller initiates without buyerId', async () => {
      const chatData = {
        productId: 1,
        buyerId: 0,  // Invalid buyerId to trigger validation
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(storage.getChatsByUser).mockResolvedValue([]);

      await expect(ChatService.createChat(chatData, 2))
        .rejects.toThrow();
    });
  });

  describe('getUserChats', () => {
    it('should return all chats for user', async () => {
      const userId = 1;
      const mockChats = [
        { id: 1, productId: 1, buyerId: 1 },
        { id: 2, productId: 2, buyerId: 1 }
      ];

      vi.mocked(storage.getChatsWithDetailsByUser).mockResolvedValue(mockChats as any);

      const result = await ChatService.getUserChats(userId);

      expect(result).toEqual(mockChats);
      expect(storage.getChatsWithDetailsByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getChatById', () => {
    it('should return chat for authorized user', async () => {
      const chatId = 1;
      const userId = 1;

      const mockChat = {
        id: chatId,
        productId: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      vi.mocked(storage.getChatWithDetails).mockResolvedValue(mockChat as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      const result = await ChatService.getChatById(chatId, userId);

      expect(result).toEqual(mockChat);
    });

    it('should throw error for non-existent chat', async () => {
      vi.mocked(storage.getChatWithDetails).mockResolvedValue(null);

      await expect(ChatService.getChatById(999, 1))
        .rejects.toThrow('Chat not found');
    });

    it('should throw error for unauthorized user', async () => {
      const mockChat = {
        id: 1,
        productId: 1,
        buyerId: 2,
        sellerId: 3
      };

      const mockProduct = {
        id: 1,
        sellerId: 3
      };

      vi.mocked(storage.getChatWithDetails).mockResolvedValue(mockChat as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      await expect(ChatService.getChatById(1, 1)) // User 1 not authorized
        .rejects.toThrow('Access denied');
    });
  });

  describe('getChatMessages', () => {
    it('should return messages for authorized user', async () => {
      const chatId = 1;
      const userId = 1;

      const mockChat = {
        id: chatId,
        productId: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockProduct = {
        id: 1,
        sellerId: 2
      };

      const mockMessages = [
        { id: 1, chatId: 1, senderId: 1, content: 'Hello' },
        { id: 2, chatId: 1, senderId: 2, content: 'Hi' }
      ];

      vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);
      vi.mocked(RedisService.getRecentMessages).mockResolvedValue(null);
      vi.mocked(storage.getMessagesByChatId).mockResolvedValue(mockMessages as any);

      const result = await ChatService.getChatMessages(chatId, userId);

      expect(result.length).toBe(2);
    });

    it('should throw error for unauthorized access', async () => {
      const mockChat = {
        id: 1,
        productId: 1,
        buyerId: 2,
        sellerId: 3
      };

      const mockProduct = {
        id: 1,
        sellerId: 3
      };

      vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
      vi.mocked(storage.getProduct).mockResolvedValue(mockProduct as any);

      await expect(ChatService.getChatMessages(1, 1))
        .rejects.toThrow('Access denied');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const messageData = {
        content: 'Test message',
        messageType: 'text',
        chatId: 1,
        senderId: 1
      };

      const mockChat = {
        id: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockMessage = {
        id: 1,
        chatId: 1,
        content: messageData.content,
        messageType: messageData.messageType,
        senderId: 1,
        createdAt: new Date()
      };

      vi.mocked(RedisService.checkMessageRateLimit).mockResolvedValue({ allowed: true, remaining: 10 });
      vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
      vi.mocked(storage.createMessage).mockResolvedValue(mockMessage as any);
      vi.mocked(RedisService.publishMessage).mockResolvedValue(undefined);
      vi.mocked(RedisService.setChatParticipants).mockResolvedValue(undefined);
      vi.mocked(RedisService.getRecentMessages).mockResolvedValue(null);

      const result = await ChatService.sendMessage(messageData, 1, 1);

      expect(result.content).toBe('Test message');
      expect(storage.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 1,
          senderId: 1,
          content: 'Test message'
        })
      );
    });

    it('should throw error for non-existent chat', async () => {
      const messageData = {
        content: 'Test message',
        messageType: 'text'
      };

      vi.mocked(storage.getChat).mockResolvedValue(null);

      await expect(ChatService.sendMessage(messageData, 999, 1))
        .rejects.toThrow();
    });
  });

  describe('addReaction', () => {
    it('should add reaction to message', async () => {
      const messageId = 1;
      const emoji = '👍';
      const userId = 1;

      const mockMessage = {
        id: 1,
        chatId: 1,
        senderId: 2
      };

      const mockChat = {
        id: 1,
        buyerId: 1,
        sellerId: 2
      };

      const mockReaction = {
        id: 1,
        messageId,
        emoji,
        userId
      };

      vi.mocked(storage.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
      vi.mocked(storage.getReactionsByUser).mockResolvedValue(null);
      vi.mocked(storage.addMessageReaction).mockResolvedValue(mockReaction as any);
      vi.mocked(RedisService.publishReactionUpdate).mockResolvedValue(undefined);

      const result = await ChatService.addReaction(messageId, userId, emoji);

      expect(result.emoji).toBe('👍');
      expect(storage.addMessageReaction).toHaveBeenCalled();
    });

    it('should throw error for non-existent message', async () => {
      const messageId = 999;
      const emoji = '👍';
      const userId = 1;

      vi.mocked(storage.getMessageById).mockResolvedValue(null);

      await expect(ChatService.addReaction(messageId, userId, emoji))
        .rejects.toThrow();
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      const messageId = 1;
      const userId = 1;

      const mockMessage = {
        id: messageId,
        chatId: 1,
        senderId: 2,
        content: 'Test message'
      };

      const mockChat = {
        id: 1,
        buyerId: 1,
        sellerId: 2
      };

      vi.mocked(storage.getMessageById).mockResolvedValue(mockMessage as any);
      vi.mocked(storage.getChat).mockResolvedValue(mockChat as any);
      vi.mocked(storage.updateMessageStatus).mockResolvedValue(undefined);
      vi.mocked(storage.updateChatReadTracking).mockResolvedValue(undefined);

      const result = await ChatService.markMessageAsRead(messageId, userId);

      expect(result.message).toBe('Message marked as read');
      expect(storage.updateMessageStatus).toHaveBeenCalledWith(messageId, 'read');
      expect(storage.updateChatReadTracking).toHaveBeenCalledWith(userId, 1, messageId);
    });
  });
});
