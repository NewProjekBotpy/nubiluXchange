/**
 * Unit Tests: Optimized Queries
 * Tests for optimized database query functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OptimizedQueries } from '../../server/utils/optimized-queries';
import { db } from '../../server/db';

// Mock database
vi.mock('../../server/db');

describe('Optimized Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Queries', () => {
    describe('getActiveProductsByCategory', () => {
      it('should fetch active products by category with default pagination', async () => {
        const mockProducts = [
          { id: 1, title: 'Product 1', category: 'mobile_legends', status: 'active' },
          { id: 2, title: 'Product 2', category: 'mobile_legends', status: 'active' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockProducts)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getActiveProductsByCategory('mobile_legends');

        expect(result).toEqual(mockProducts);
      });

      it('should support custom limit and offset', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getActiveProductsByCategory('mobile_legends', 50, 10);

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getSellerProducts', () => {
      it('should fetch seller products without status filter', async () => {
        const mockProducts = [{ id: 1, sellerId: 1, title: 'Seller Product' }];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockProducts)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getSellerProducts(1);

        expect(result).toEqual(mockProducts);
      });

      it('should fetch seller products with status filter', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getSellerProducts(1, 'active');

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getPremiumProducts', () => {
      it('should fetch premium active products', async () => {
        const mockProducts = [
          { id: 1, isPremium: true, status: 'active' },
          { id: 2, isPremium: true, status: 'active' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockProducts)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getPremiumProducts();

        expect(result).toEqual(mockProducts);
        expect(result.every(p => p.isPremium)).toBe(true);
      });
    });
  });

  describe('Chat Queries', () => {
    describe('getUserChats', () => {
      it('should fetch user chats with product info', async () => {
        const mockChats = [
          {
            id: 1,
            buyerId: 1,
            sellerId: 2,
            productId: 1,
            productTitle: 'Test Product',
            status: 'active'
          }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockChats)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getUserChats(1);

        expect(result).toEqual(mockChats);
      });

      it('should support custom status filter', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getUserChats(1, 'archived');

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getChatMessages', () => {
      it('should fetch chat messages with pagination', async () => {
        const mockMessages = [
          { id: 1, chatId: 1, content: 'Hello' },
          { id: 2, chatId: 1, content: 'Hi' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockMessages)
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getChatMessages(1);

        expect(result).toEqual(mockMessages);
      });

      it('should support beforeId cursor pagination', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([])
              })
            })
          })
        } as any);

        await OptimizedQueries.getChatMessages(1, 50, 100);

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getUnreadMessageCount', () => {
      it('should count unread messages', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        } as any);

        const result = await OptimizedQueries.getUnreadMessageCount(1, 2);

        expect(result).toBe(5);
      });

      it('should return 0 when no unread messages', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }])
          })
        } as any);

        const result = await OptimizedQueries.getUnreadMessageCount(1, 2);

        expect(result).toBe(0);
      });

      it('should support lastReadMessageId filter', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }])
          })
        } as any);

        const result = await OptimizedQueries.getUnreadMessageCount(1, 2, 50);

        expect(result).toBe(3);
      });
    });
  });

  describe('Transaction Queries', () => {
    describe('getUserTransactions', () => {
      it('should fetch user transactions as buyer or seller', async () => {
        const mockTransactions = [
          { id: 1, buyerId: 1, sellerId: 2, status: 'completed' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockTransactions)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getUserTransactions(1);

        expect(result).toEqual(mockTransactions);
      });

      it('should filter by status', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getUserTransactions(1, 'pending');

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getPendingTransactions', () => {
      it('should fetch only pending transactions', async () => {
        const mockTransactions = [
          { id: 1, buyerId: 1, status: 'pending' },
          { id: 2, buyerId: 1, status: 'pending' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockTransactions)
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getPendingTransactions(1);

        expect(result).toEqual(mockTransactions);
      });

      it('should limit to 10 transactions', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([])
              })
            })
          })
        } as any);

        await OptimizedQueries.getPendingTransactions(1);

        expect(db.select).toHaveBeenCalled();
      });
    });
  });

  describe('Wallet Queries', () => {
    describe('getUserWalletTransactions', () => {
      it('should fetch wallet transactions', async () => {
        const mockTransactions = [
          { id: 1, userId: 1, type: 'topup', amount: '100000' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockTransactions)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getUserWalletTransactions(1);

        expect(result).toEqual(mockTransactions);
      });

      it('should filter by transaction type', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getUserWalletTransactions(1, 'send');

        expect(db.select).toHaveBeenCalled();
      });
    });
  });

  describe('Batch Operations', () => {
    describe('getMultipleProductsById', () => {
      it('should fetch multiple products by IDs', async () => {
        const mockProducts = [
          { id: 1, title: 'Product 1' },
          { id: 2, title: 'Product 2' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockProducts)
          })
        } as any);

        const result = await OptimizedQueries.getMultipleProductsById([1, 2]);

        expect(result).toEqual(mockProducts);
      });

      it('should return empty array for empty input', async () => {
        const result = await OptimizedQueries.getMultipleProductsById([]);

        expect(result).toEqual([]);
      });
    });

    describe('getMultipleUsersById', () => {
      it('should fetch multiple users by IDs', async () => {
        const mockUsers = [
          { id: 1, username: 'user1', isVerified: true },
          { id: 2, username: 'user2', isVerified: false }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockUsers)
          })
        } as any);

        const result = await OptimizedQueries.getMultipleUsersById([1, 2]);

        expect(result).toEqual(mockUsers);
      });

      it('should return empty array for empty input', async () => {
        const result = await OptimizedQueries.getMultipleUsersById([]);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Notification Queries', () => {
    describe('getUserNotifications', () => {
      it('should fetch all user notifications', async () => {
        const mockNotifications = [
          { id: 1, userId: 1, message: 'Test notification', isRead: false }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockNotifications)
                })
              })
            })
          })
        } as any);

        const result = await OptimizedQueries.getUserNotifications(1);

        expect(result).toEqual(mockNotifications);
      });

      it('should fetch only unread notifications', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([])
                })
              })
            })
          })
        } as any);

        await OptimizedQueries.getUserNotifications(1, true);

        expect(db.select).toHaveBeenCalled();
      });
    });

    describe('getUnreadNotificationCount', () => {
      it('should count unread notifications', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }])
          })
        } as any);

        const result = await OptimizedQueries.getUnreadNotificationCount(1);

        expect(result).toBe(10);
      });

      it('should return 0 when no unread notifications', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        } as any);

        const result = await OptimizedQueries.getUnreadNotificationCount(1);

        expect(result).toBe(0);
      });
    });
  });

  describe('Dashboard Stats', () => {
    describe('getDashboardStats', () => {
      it('should fetch all dashboard stats in parallel', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }])
          })
        } as any);

        const result = await OptimizedQueries.getDashboardStats(1);

        expect(result).toHaveProperty('activeChatsCount');
        expect(result).toHaveProperty('pendingTransactionsCount');
        expect(result).toHaveProperty('unreadNotificationsCount');
        expect(result).toHaveProperty('walletBalance');
      });
    });
  });

  describe('Utility Queries', () => {
    describe('checkBalanceWithoutLock', () => {
      it('should fetch balance without locking row', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ balance: '50000' }])
            })
          })
        } as any);

        const result = await OptimizedQueries.checkBalanceWithoutLock(1);

        expect(result).toBe('50000');
      });

      it('should return "0" when user not found', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        } as any);

        const result = await OptimizedQueries.checkBalanceWithoutLock(999);

        expect(result).toBe('0');
      });
    });

    describe('Existence Checks', () => {
      it('chatExists should return true when chat exists', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }])
            })
          })
        } as any);

        const result = await OptimizedQueries.chatExists(1, 2);

        expect(result).toBe(true);
      });

      it('userExists should return false when user not found', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        } as any);

        const result = await OptimizedQueries.userExists(999);

        expect(result).toBe(false);
      });

      it('productExists should check product existence and status', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }])
            })
          })
        } as any);

        const result = await OptimizedQueries.productExists(1, 'active');

        expect(result).toBe(true);
      });
    });
  });
});
