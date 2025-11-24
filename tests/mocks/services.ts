/**
 * Mock Services for Unit Testing
 * Mock implementations of backend services
 */

import { vi } from 'vitest';

/**
 * Mock AuthService
 */
export const mockAuthService = {
  register: vi.fn().mockResolvedValue({
    message: 'User registered successfully',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    },
  }),

  login: vi.fn().mockResolvedValue({
    message: 'Login successful',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    },
  }),

  logout: vi.fn().mockResolvedValue({
    message: 'Logout successful',
  }),

  setupTwoFactor: vi.fn().mockResolvedValue({
    secret: 'JBSWY3DPEHPK3PXP',
    qrCodeDataUrl: 'data:image/png;base64,test',
    backupCodes: ['CODE1', 'CODE2'],
    message: 'Scan QR code with your authenticator app',
  }),

  verifyTwoFactor: vi.fn().mockResolvedValue({
    message: '2FA enabled successfully',
    backupCodes: ['CODE1', 'CODE2'],
  }),

  disableTwoFactor: vi.fn().mockResolvedValue({
    message: '2FA disabled successfully',
  }),

  loginWithTwoFactor: vi.fn().mockResolvedValue({
    message: 'Login successful',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    },
  }),
};

/**
 * Mock PaymentService
 */
export const mockPaymentService = {
  createMidtransPayment: vi.fn().mockResolvedValue({
    token: 'test-payment-token',
    redirectUrl: 'https://payment.test/redirect',
    orderId: 'ORDER-123',
  }),

  handleMidtransWebhook: vi.fn().mockResolvedValue({
    message: 'Webhook processed successfully',
    transaction: {
      id: 1,
      status: 'completed',
    },
  }),

  getPaymentStatus: vi.fn().mockResolvedValue({
    orderId: 'ORDER-123',
    status: 'settlement',
    amount: '500000',
  }),

  getUserWalletBalance: vi.fn().mockResolvedValue({
    balance: '1000000',
  }),
};

/**
 * Mock ChatService
 */
export const mockChatService = {
  createChat: vi.fn().mockResolvedValue({
    id: 1,
    buyerId: 1,
    sellerId: 2,
    productId: 1,
    status: 'active',
  }),

  getUserChats: vi.fn().mockResolvedValue([
    {
      id: 1,
      buyerId: 1,
      sellerId: 2,
      productId: 1,
      lastMessage: 'Hello!',
      unreadCount: 2,
    },
  ]),

  sendMessage: vi.fn().mockResolvedValue({
    id: 1,
    chatId: 1,
    senderId: 1,
    content: 'Test message',
    status: 'sent',
  }),

  markMessageAsRead: vi.fn().mockResolvedValue({
    message: 'Message marked as read',
  }),

  addReaction: vi.fn().mockResolvedValue({
    id: 1,
    messageId: 1,
    userId: 1,
    emoji: '👍',
  }),
};

/**
 * Mock ProductService
 */
export const mockProductService = {
  createProduct: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Test Product',
    description: 'Test description',
    price: '500000',
    sellerId: 1,
  }),

  getProducts: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Product 1',
      price: '500000',
      category: 'mobile_legends',
    },
    {
      id: 2,
      title: 'Product 2',
      price: '750000',
      category: 'pubg_mobile',
    },
  ]),

  getProduct: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Test Product',
    description: 'Test description',
    price: '500000',
    sellerId: 1,
    category: 'mobile_legends',
  }),

  updateProduct: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Updated Product',
    price: '600000',
  }),

  deleteProduct: vi.fn().mockResolvedValue({
    message: 'Product deleted successfully',
  }),
};

/**
 * Mock RedisService
 */
export const mockRedisService = {
  publishMessage: vi.fn().mockResolvedValue(undefined),
  subscribeToChatMessages: vi.fn().mockResolvedValue(undefined),
  unsubscribeFromChatMessages: vi.fn().mockResolvedValue(undefined),
  setActiveUser: vi.fn().mockResolvedValue(undefined),
  getActiveUser: vi.fn().mockResolvedValue(null),
  setChatParticipants: vi.fn().mockResolvedValue(undefined),
  getChatParticipants: vi.fn().mockResolvedValue([1, 2]),
};

/**
 * Mock CloudStorageService
 */
export const mockCloudStorageService = {
  uploadProductImage: vi.fn().mockResolvedValue({
    public_id: 'test-image-123',
    secure_url: 'https://cloudinary.test/image.jpg',
    width: 800,
    height: 600,
  }),

  uploadProfilePicture: vi.fn().mockResolvedValue({
    public_id: 'test-profile-123',
    secure_url: 'https://cloudinary.test/profile.jpg',
  }),

  deleteImage: vi.fn().mockResolvedValue({
    result: 'ok',
  }),
};

/**
 * Mock EscrowRiskService
 */
export const mockEscrowRiskService = {
  assessTransactionRisk: vi.fn().mockResolvedValue({
    score: 25,
    level: 'low',
    factors: ['User account age is acceptable'],
    recommendations: ['Proceed with transaction'],
    requiresManualReview: false,
    confidence: 85,
    fraudProbability: 5,
  }),
};

/**
 * Mock NotificationService
 */
export const mockNotificationService = {
  createNotification: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: 'Test Notification',
    message: 'Test message',
    type: 'info',
  }),

  getUserNotifications: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: 'Notification 1',
      message: 'Message 1',
      isRead: false,
    },
  ]),

  markNotificationAsRead: vi.fn().mockResolvedValue({
    message: 'Notification marked as read',
  }),

  deleteNotification: vi.fn().mockResolvedValue({
    message: 'Notification deleted successfully',
  }),
};

/**
 * Mock Storage (Database)
 */
export const mockStorage = {
  // User operations
  getUser: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
  }),
  
  getUserByEmail: vi.fn().mockResolvedValue(null),
  getUserByUsername: vi.fn().mockResolvedValue(null),
  
  createUser: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  }),
  
  updateUser: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
  }),

  // Product operations
  getProduct: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Test Product',
    price: '500000',
  }),
  
  getProducts: vi.fn().mockResolvedValue([]),
  
  createProduct: vi.fn().mockResolvedValue({
    id: 1,
    title: 'Test Product',
  }),

  // Chat operations
  createChat: vi.fn().mockResolvedValue({
    id: 1,
    buyerId: 1,
    sellerId: 2,
  }),
  
  getChatsByUser: vi.fn().mockResolvedValue([]),
  
  createMessage: vi.fn().mockResolvedValue({
    id: 1,
    content: 'Test message',
  }),

  // Transaction operations
  createTransaction: vi.fn().mockResolvedValue({
    id: 1,
    status: 'pending',
  }),
  
  getTransactionsByUser: vi.fn().mockResolvedValue([]),
};

/**
 * Export all mocks
 */
export const mocks = {
  authService: mockAuthService,
  paymentService: mockPaymentService,
  chatService: mockChatService,
  productService: mockProductService,
  redisService: mockRedisService,
  cloudStorageService: mockCloudStorageService,
  escrowRiskService: mockEscrowRiskService,
  notificationService: mockNotificationService,
  storage: mockStorage,
};

export default mocks;
