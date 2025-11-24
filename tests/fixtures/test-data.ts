/**
 * Test Fixtures and Sample Data
 * Reusable test data for all test suites
 */

/**
 * Test users with different roles
 */
export const testUsers = {
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
  
  owner: {
    username: 'owner',
    email: 'owner@example.com',
    password: 'owner123',
    role: 'owner',
  },
  
  regularUser: {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Test123!@#',
    role: 'user',
  },
  
  seller: {
    username: 'seller',
    email: 'seller@example.com',
    password: 'Seller123!@#',
    role: 'seller',
  },
  
  buyer: {
    username: 'buyer',
    email: 'buyer@example.com',
    password: 'Buyer123!@#',
    role: 'user',
  },
};

/**
 * Test products for different categories
 */
export const testProducts = {
  mobileLegends: {
    title: 'Mobile Legends Mythic Account',
    description: 'High tier ML account with exclusive skins and heroes',
    category: 'mobile_legends',
    price: '500000',
    gameData: {
      rank: 'Mythic',
      heroes: 50,
      skins: 30,
      winrate: 65,
    },
  },
  
  pubgMobile: {
    title: 'PUBG Mobile Conqueror Account',
    description: 'Top tier PUBG account with rare items',
    category: 'pubg_mobile',
    price: '750000',
    gameData: {
      tier: 'Conqueror',
      level: 80,
      skins: 45,
      weapons: 100,
    },
  },
  
  valorant: {
    title: 'Valorant Radiant Account',
    description: 'High ELO Valorant account',
    category: 'valorant',
    price: '1000000',
    gameData: {
      rank: 'Radiant',
      agents: 20,
      skins: 50,
    },
  },
  
  cheapProduct: {
    title: 'Starter Account',
    description: 'Basic gaming account',
    category: 'mobile_legends',
    price: '50000',
    gameData: {
      rank: 'Elite',
      heroes: 10,
      skins: 5,
    },
  },
};

/**
 * Test chat messages
 */
export const testMessages = {
  greeting: 'Hello! Is this item still available?',
  negotiation: 'Can you lower the price to 400,000?',
  acceptance: 'Yes, that price works for me!',
  confirmation: 'Great! I will proceed with the payment.',
  imageMessage: {
    content: 'Here is the screenshot of the account',
    messageType: 'image' as const,
  },
};

/**
 * Test payment data
 */
export const testPayments = {
  qris: {
    amount: 500000,
    paymentMethod: 'qris',
    productId: 1,
  },
  
  gopay: {
    amount: 750000,
    paymentMethod: 'gopay',
    productId: 2,
  },
  
  shopeepay: {
    amount: 1000000,
    paymentMethod: 'shopeepay',
    productId: 3,
  },
  
  wallet: {
    amount: 250000,
    paymentMethod: 'wallet',
    productId: 4,
  },
};

/**
 * Test Midtrans webhooks
 */
export const testWebhooks = {
  settlement: {
    order_id: 'ORDER-TEST-123',
    status_code: '200',
    gross_amount: '500000.00',
    signature_key: 'test_signature_settlement',
    transaction_status: 'settlement',
    payment_type: 'qris',
  },
  
  pending: {
    order_id: 'ORDER-TEST-124',
    status_code: '201',
    gross_amount: '750000.00',
    signature_key: 'test_signature_pending',
    transaction_status: 'pending',
    payment_type: 'gopay',
  },
  
  deny: {
    order_id: 'ORDER-TEST-125',
    status_code: '400',
    gross_amount: '1000000.00',
    signature_key: 'test_signature_deny',
    transaction_status: 'deny',
    payment_type: 'shopeepay',
  },
  
  expire: {
    order_id: 'ORDER-TEST-126',
    status_code: '407',
    gross_amount: '250000.00',
    signature_key: 'test_signature_expire',
    transaction_status: 'expire',
    payment_type: 'qris',
  },
};

/**
 * Test 2FA data
 */
export const test2FA = {
  validTOTPSecret: 'JBSWY3DPEHPK3PXP',
  validTOTPToken: '123456',
  backupCodes: [
    'ABCD1234',
    'EFGH5678',
    'IJKL9012',
    'MNOP3456',
    'QRST7890',
  ],
};

/**
 * Test admin configurations
 */
export const testAdminConfig = {
  commissionRate: {
    key: 'commission_rate',
    value: '0.05',
    type: 'number',
    description: 'Platform commission rate (5%)',
  },
  
  minWithdrawal: {
    key: 'min_withdrawal',
    value: '50000',
    type: 'number',
    description: 'Minimum withdrawal amount',
  },
  
  autoApprovalLimit: {
    key: 'auto_approval_limit',
    value: '100000',
    type: 'number',
    description: 'Auto-approval limit for transactions',
  },
};

/**
 * Test fraud scenarios
 */
export const testFraudScenarios = {
  suspiciousUser: {
    username: 'fraud_user',
    email: 'fraud@example.com',
    password: 'Fraud123!@#',
    accountAge: 0, // New account
  },
  
  highValueTransaction: {
    amount: 5000000, // Very high amount
    productId: 1,
  },
  
  multipleFailedTransactions: {
    count: 5,
    userId: 1,
  },
  
  suspiciousIP: {
    ipAddress: '192.168.1.100',
    isVPN: true,
    country: 'Unknown',
  },
};

/**
 * Test WebSocket messages
 */
export const testWSMessages = {
  ping: {
    type: 'ping',
  },
  
  joinChat: {
    type: 'join_chat',
    chatId: 1,
  },
  
  leaveChat: {
    type: 'leave_chat',
    chatId: 1,
  },
  
  chatMessage: {
    type: 'chat_message',
    chatId: 1,
    content: 'Hello from WebSocket!',
    tempId: 'temp-123',
    messageType: 'text',
  },
  
  userTyping: {
    type: 'user_typing',
    chatId: 1,
    isTyping: true,
  },
  
  addReaction: {
    type: 'add_reaction',
    messageId: 1,
    emoji: '👍',
  },
};

/**
 * Test validation errors
 */
export const testValidationErrors = {
  invalidEmail: {
    email: 'invalid-email',
    expectedError: 'Invalid email',
  },
  
  shortPassword: {
    password: '123',
    expectedError: 'Password must be at least 6 characters',
  },
  
  negativePrice: {
    price: '-100',
    expectedError: 'Price must be positive',
  },
  
  emptyTitle: {
    title: '',
    expectedError: 'Title is required',
  },
};

/**
 * Test performance scenarios
 */
export const performanceScenarios = {
  bulkProducts: Array.from({ length: 100 }, (_, i) => ({
    title: `Bulk Product ${i + 1}`,
    description: `Description for bulk product ${i + 1}`,
    category: 'mobile_legends',
    price: '100000',
  })),
  
  bulkMessages: Array.from({ length: 100 }, (_, i) => ({
    content: `Test message ${i + 1}`,
    messageType: 'text' as const,
  })),
  
  concurrentUsers: 50,
  messagesPerSecond: 100,
};

/**
 * Test offline scenarios
 */
export const testOfflineScenarios = {
  queuedMessage: {
    chatId: 1,
    content: 'Message sent while offline',
    tempId: 'offline-temp-123',
  },
  
  queuedProduct: {
    title: 'Product created offline',
    description: 'This product was created while offline',
    category: 'mobile_legends',
    price: '300000',
  },
  
  conflictResolution: {
    serverVersion: {
      content: 'Server version of message',
      updatedAt: '2024-01-01T12:00:00Z',
    },
    localVersion: {
      content: 'Local version of message',
      updatedAt: '2024-01-01T12:01:00Z',
    },
  },
};

/**
 * Export all fixtures
 */
export const testFixtures = {
  users: testUsers,
  products: testProducts,
  messages: testMessages,
  payments: testPayments,
  webhooks: testWebhooks,
  twoFA: test2FA,
  adminConfig: testAdminConfig,
  fraudScenarios: testFraudScenarios,
  wsMessages: testWSMessages,
  validationErrors: testValidationErrors,
  performance: performanceScenarios,
  offline: testOfflineScenarios,
};

export default testFixtures;
