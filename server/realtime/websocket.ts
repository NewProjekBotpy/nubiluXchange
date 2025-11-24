import { type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { hasAdminAccess } from "@shared/auth-utils";
import { storage } from "../storage";
import { verifyToken } from "../utils/auth";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";
import { RedisService } from "../services/RedisService";
import { ChatService } from "../services/ChatService";
import { FraudAlertService } from "../services/FraudAlertService";

// WebSocket message validation schemas
const wsMessageBaseSchema = z.object({
  type: z.string()
});

const wsPingSchema = z.object({
  type: z.literal('ping')
});

const wsJoinChatSchema = z.object({
  type: z.literal('join_chat'),
  chatId: z.number().int().positive()
});

const wsLeaveChatSchema = z.object({
  type: z.literal('leave_chat'),
  chatId: z.number().int().positive()
});

const wsUserTypingSchema = z.object({
  type: z.literal('user_typing'),
  chatId: z.number().int().positive(),
  isTyping: z.boolean().optional()
});

const wsUserOnlineSchema = z.object({
  type: z.literal('user_online')
});

const wsChatMessageSchema = z.object({
  type: z.literal('chat_message'),
  chatId: z.number().int().positive(),
  content: z.string().min(1).max(10000),
  tempId: z.string().optional(),
  messageType: z.enum(['text', 'image', 'file', 'audio', 'video']).optional()
});

const wsAddReactionSchema = z.object({
  type: z.literal('add_reaction'),
  messageId: z.number().int().positive(),
  chatId: z.number().int().positive(),
  emoji: z.string().min(1).max(10)
});

const wsRemoveReactionSchema = z.object({
  type: z.literal('remove_reaction'),
  reactionId: z.number().int().positive(),
  messageId: z.number().int().positive(),
  chatId: z.number().int().positive()
});

const wsSubscribeAdminUpdatesSchema = z.object({
  type: z.literal('subscribe_admin_updates'),
  data: z.object({
    enableStats: z.boolean(),
    enableActivities: z.boolean(),
    enableNotifications: z.boolean(),
    updateInterval: z.number()
  })
});

const wsRequestStatsUpdateSchema = z.object({
  type: z.literal('request_stats_update')
});

const wsBatchSchema = z.object({
  type: z.literal('batch'),
  messages: z.array(z.any()),
  compressed: z.boolean().optional()
});

const wsMessageSchema = z.discriminatedUnion('type', [
  wsPingSchema,
  wsJoinChatSchema,
  wsLeaveChatSchema,
  wsUserTypingSchema,
  wsUserOnlineSchema,
  wsChatMessageSchema,
  wsAddReactionSchema,
  wsRemoveReactionSchema,
  wsSubscribeAdminUpdatesSchema,
  wsRequestStatsUpdateSchema,
  wsBatchSchema
]);

// Global references for graceful shutdown
let wsServer: WebSocketServer | null = null;
let wsClients: Map<number, Set<WebSocket>> | null = null;

/**
 * Setup WebSocket server for real-time chat with Redis scaling
 * 
 * @param httpServer - HTTP server instance to attach WebSocket server to
 * @returns WebSocketServer instance
 */
export function setupWebSocket(httpServer: Server): WebSocketServer {
  // WebSocket setup for real-time chat with Redis scaling
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wsServer = wss; // Store reference for graceful shutdown
  const clients = new Map<number, Set<WebSocket>>();
  wsClients = clients; // Store reference for graceful shutdown
  const chatSubscriptions = new Map<number, Set<number>>(); // chatId -> Set of userIds
  const redisSubscriptions = new Set<number>(); // Track which chats have Redis subscriptions
  const adminClients = new Set<number>(); // Track admin users for fraud alerts
  // FIX BUG #4: Track which chats each WebSocket is in for efficient cleanup
  const wsToChatsMap = new WeakMap<WebSocket, Set<number>>(); // ws -> Set of chatIds
  
  // FIX BUG #8: Initialize fraud alert subscription at server startup to prevent race condition
  // Setup fraud alert subscription once during server initialization
  (async () => {
    try {
      // Broadcast function for fraud alerts to all admin clients
      const broadcastFraudAlert = (fraudAlert: any) => {
        try {
          // Broadcast to all connected admin clients
          adminClients.forEach(adminUserId => {
            const adminSockets = clients.get(adminUserId);
            if (adminSockets) {
              adminSockets.forEach(socket => {
                if (socket.readyState === WebSocket.OPEN) {
                  try {
                    socket.send(JSON.stringify({
                      type: 'fraud_alert',
                      alert: fraudAlert,
                      timestamp: new Date().toISOString()
                    }));
                  } catch (sendError) {
                    logError(sendError as Error, 'Failed to send fraud alert to admin');
                  }
                }
              });
            }
          });
          
          logInfo(`🚨 Fraud alert broadcasted to ${adminClients.size} admin clients`);
        } catch (error) {
          logError(error as Error, 'Failed to process fraud alert for WebSocket broadcast');
        }
      };
      
      // If Redis is available, use Redis pub/sub for horizontal scaling
      if (RedisService.isAvailable()) {
        await RedisService.subscribeToFraudAlerts(broadcastFraudAlert);
        logInfo('✅ Fraud alert WebSocket broadcasting setup complete (via Redis)');
      } 
      // Otherwise, register direct callback as fallback
      else {
        FraudAlertService.registerDirectBroadcast(broadcastFraudAlert);
        logInfo('✅ Fraud alert WebSocket broadcasting setup complete (direct callback fallback)');
      }
    } catch (setupError) {
      logError(setupError as Error, 'Failed to setup fraud alert subscription at server startup');
    }
  })();

  wss.on('connection', async (ws, req) => {
    try {
      // Always validate WebSocket origin for security
      const origin = req.headers.origin;
      
      // Build list of allowed origins from environment variables
      const allowedDomains = process.env.ALLOWED_DOMAINS || process.env.CORS_ORIGINS || '';
      const allowedDomainList = allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
      
      const allowedOrigins = [
        'http://localhost:5000',
        'https://localhost:5000',
        'http://127.0.0.1:5000',
        'https://127.0.0.1:5000',
        'http://localhost:3000', // For separate dev frontend
        process.env.FRONTEND_URL,
        // Map each allowed domain to both http and https
        ...allowedDomainList.flatMap(domain => [
          `https://${domain}`,
          `http://${domain}`
        ])
      ].filter(Boolean);
      
      if (origin && !allowedOrigins.includes(origin)) {
        logWarning(`Rejected WebSocket connection from origin: ${origin}`);
        ws.close(1008, Buffer.from('Invalid origin'));
        return;
      }
      
      // Parse cookies from the WebSocket upgrade request headers
      const cookieHeader = req.headers.cookie;
      let token: string | undefined;
      
      if (cookieHeader) {
        // Parse cookies manually since WebSocket doesn't have req.cookies
        // Robust parsing that handles malformed cookies and values with '=' signs
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const trimmedCookie = cookie.trim();
          if (!trimmedCookie) return acc; // Skip empty cookies
          
          const equalIndex = trimmedCookie.indexOf('=');
          if (equalIndex === -1) return acc; // Skip malformed cookies without '='
          
          const name = trimmedCookie.substring(0, equalIndex).trim();
          const value = trimmedCookie.substring(equalIndex + 1).trim();
          
          // Only add cookie if both name and value are non-empty
          if (name && value) {
            acc[name] = value;
          }
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies.auth_token;
      }
      
      if (!token) {
        ws.close(4001, Buffer.from('Authentication required'));
        return;
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        ws.close(4001, Buffer.from('Invalid token'));
        return;
      }
      
      const user = await storage.getUser(decoded.id);
      if (!user) {
        ws.close(4001, Buffer.from('User not found'));
        return;
      }
      
      // Support multiple connections per user
      if (!clients.has(user.id)) {
        clients.set(user.id, new Set());
      }
      clients.get(user.id)!.add(ws);
      
      // Store user info for this connection
      (ws as any).userId = user.id;
      (ws as any).userRole = user.role;
      
      // FIX BUG #8: Track admin clients for fraud alert notifications
      // Fraud alert subscription is now setup at server startup to prevent race condition
      if (hasAdminAccess(user)) {
        adminClients.add(user.id);
      }
      
      // Update Redis with active user session
      await RedisService.setActiveUser(user.id, {
        userId: user.id,
        username: user.username,
        socketId: 'ws-' + Date.now(),
        chatRooms: [], // Will be populated as user joins chats
        lastActivity: Date.now()
      });

      // Safe WebSocket send helper to prevent crashes from closed connections
      const safeSend = (socket: WebSocket, data: any): boolean => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
          } catch (error) {
            logError(error as Error, 'Failed to send WebSocket message');
            return false;
          }
        }
        return false;
      };

      // Helper function to process a validated WebSocket message
      const processWebSocketMessage = async (message: z.infer<typeof wsMessageSchema>) => {
        // Handle ping/pong for connection health
        if (message.type === 'ping') {
          safeSend(ws, { type: 'pong' });
          return;
        }

        // Handle batch messages - process each message in the batch
        if (message.type === 'batch' && message.messages && Array.isArray(message.messages)) {
          logDebug(`📦 Processing batch of ${message.messages.length} messages`);
          let processedCount = 0;
          let errorCount = 0;
          
          for (const batchedMessage of message.messages) {
            try {
              const batchValidation = wsMessageSchema.safeParse(batchedMessage);
              if (batchValidation.success && batchValidation.data.type !== 'batch') {
                await processWebSocketMessage(batchValidation.data);
                processedCount++;
              } else {
                logError(new Error(batchValidation.success ? 'nested batch not allowed' : String(batchValidation.error)), 'Invalid batched message format');
                errorCount++;
              }
            } catch (batchError) {
              logError(batchError as Error, 'Failed to process batched message');
              errorCount++;
            }
          }
          
          logDebug(`✅ Batch processing complete: ${processedCount} succeeded, ${errorCount} failed`);
          return;
        }

        // Handle admin updates subscription
        if (message.type === 'subscribe_admin_updates') {
          if ((ws as any).userRole !== 'admin' && (ws as any).userRole !== 'owner') {
            safeSend(ws, { type: 'error', message: 'Unauthorized: Admin access required' });
            return;
          }
          
          logInfo(`👑 Admin ${(ws as any).userId} subscribed to real-time updates`, { userId: (ws as any).userId });
          (ws as any).adminSubscription = message.data;
          
          safeSend(ws, { 
            type: 'admin_subscription_confirmed',
            data: message.data
          });
          return;
        }

        // Handle stats update request
        if (message.type === 'request_stats_update') {
          if ((ws as any).userRole !== 'admin' && (ws as any).userRole !== 'owner') {
            safeSend(ws, { type: 'error', message: 'Unauthorized: Admin access required' });
            return;
          }
          
          try {
            const allUsers = await storage.getAllUsers();
            const stats = {
              totalUsers: allUsers.length,
              totalAdmins: allUsers.filter((u: any) => u.role === 'admin' || u.role === 'owner').length,
              pendingRequests: 0,
              activeEscrows: 0,
              systemLoad: process.cpuUsage ? process.cpuUsage().system / 1000000 : 0,
              lastActivity: new Date().toISOString()
            };
            
            safeSend(ws, {
              type: 'admin_stats_update',
              data: stats
            });
          } catch (error) {
            logError(error as Error, 'Failed to get admin stats', (ws as any).userId);
            safeSend(ws, { type: 'error', message: 'Failed to retrieve stats' });
          }
          return;
        }
        
        // Handle chat join - subscribe to Redis immediately when user joins a chat
        if (message.type === 'join_chat' && message.chatId) {
          try {
            // Verify user can access this chat
            const chat = await storage.getChat(message.chatId);
            if (!chat || (chat.buyerId !== (ws as any).userId && chat.sellerId !== (ws as any).userId)) {
              safeSend(ws, { type: 'error', message: 'Unauthorized chat access' });
              return;
            }
            
            // Always initialize chat subscription regardless of Redis availability
            if (!chatSubscriptions.has(message.chatId)) {
              chatSubscriptions.set(message.chatId, new Set());
            }
            
            // Add user to chat subscription for message routing (both Redis and fallback)
            chatSubscriptions.get(message.chatId)!.add((ws as any).userId);
            
            // FIX BUG #4: Track which chat this WebSocket is in for efficient cleanup
            if (!wsToChatsMap.has(ws)) {
              wsToChatsMap.set(ws, new Set());
            }
            wsToChatsMap.get(ws)!.add(message.chatId);
            
            // Set up Redis subscription for this chat if Redis is available AND not already subscribed
            if (RedisService.isAvailable() && !redisSubscriptions.has(message.chatId)) {
              redisSubscriptions.add(message.chatId);
              
              // Subscribe to Redis messages for this chat (only once per chat)
              await RedisService.subscribeToChatMessages(message.chatId, (chatMessage) => {
                // Forward Redis messages to all connected WebSocket clients in this chat
                const chatUsers = chatSubscriptions.get(message.chatId);
                if (chatUsers && chatUsers.size > 0) {
                  chatUsers.forEach(userId => {
                    const userSockets = clients.get(userId);
                    if (userSockets) {
                      userSockets.forEach(socket => {
                        if (socket.readyState === WebSocket.OPEN) {
                          try {
                            socket.send(JSON.stringify({
                              type: 'new_message',
                              message: chatMessage,
                              fromRedis: true
                            }));
                          } catch (sendError) {
                            logError(sendError as Error, 'Failed to send Redis message to WebSocket client');
                          }
                        }
                      });
                    }
                  });
                }
              });
              logInfo(`✅ User ${(ws as any).userId} joined chat ${message.chatId} with Redis scaling`, { userId: (ws as any).userId, chatId: message.chatId });
            } else {
              logInfo(`✅ User ${(ws as any).userId} joined chat ${message.chatId} with local-only messaging`, { userId: (ws as any).userId, chatId: message.chatId });
            }
            
            safeSend(ws, { 
              type: 'chat_joined', 
              chatId: message.chatId,
              redisEnabled: RedisService.isAvailable()
            });
            
          } catch (error: any) {
            safeSend(ws, { type: 'error', message: error.message });
          }
          return;
        }
        
        // Handle leaving chat
        if (message.type === 'leave_chat' && message.chatId) {
          if (chatSubscriptions.has(message.chatId)) {
            const chatUsers = chatSubscriptions.get(message.chatId)!;
            chatUsers.delete((ws as any).userId);
            
            // FIX BUG #4: Remove chat from WebSocket tracking
            const wsChats = wsToChatsMap.get(ws);
            if (wsChats) {
              wsChats.delete(message.chatId);
            }
            
            // Clean up subscription if no users left
            if (chatUsers.size === 0) {
              chatSubscriptions.delete(message.chatId);
              if (RedisService.isAvailable() && redisSubscriptions.has(message.chatId)) {
                redisSubscriptions.delete(message.chatId);
                await RedisService.unsubscribeFromChatMessages(message.chatId);
                logInfo(`✅ Chat ${message.chatId} Redis subscription cleaned up`, { chatId: message.chatId });
              }
            }
          }
          
          safeSend(ws, { type: 'chat_left', chatId: message.chatId });
          return;
        }
        
        // Handle typing indicators
        if (message.type === 'user_typing' && message.chatId) {
          try {
            // Verify user can access this chat
            const chat = await storage.getChat(message.chatId);
            if (!chat || (chat.buyerId !== (ws as any).userId && chat.sellerId !== (ws as any).userId)) {
              return; // Silently ignore unauthorized typing
            }
            
            // Broadcast typing status to other users in the chat
            const recipients = [chat.buyerId, chat.sellerId].filter(id => id !== (ws as any).userId);
            
            for (const recipientId of recipients) {
              const recipientSockets = clients.get(recipientId);
              if (recipientSockets) {
                recipientSockets.forEach(recipientSocket => {
                  if (recipientSocket.readyState === WebSocket.OPEN) {
                    recipientSocket.send(JSON.stringify({
                      type: 'user_typing',
                      chatId: message.chatId,
                      userId: (ws as any).userId,
                      isTyping: !!message.isTyping
                    }));
                  }
                });
              }
            }
            
            // Also publish to Redis for scaling
            if (RedisService.isAvailable()) {
              await RedisService.publishTypingStatus(message.chatId, {
                userId: (ws as any).userId,
                isTyping: !!message.isTyping,
                timestamp: Date.now()
              });
            }
          } catch (error: any) {
            logError(error as Error, 'Typing indicator error:');
          }
          return;
        }
        
        // Handle user online status
        if (message.type === 'user_online') {
          try {
            // Update user's last activity in Redis
            if (RedisService.isAvailable()) {
              await RedisService.updateUserActivity((ws as any).userId);
            }
            
            // Broadcast online status to chat participants
            const userChats = await storage.getChatsByUser((ws as any).userId);
            for (const chat of userChats) {
              const otherUserId = chat.buyerId === (ws as any).userId ? chat.sellerId : chat.buyerId;
              const otherUserSockets = clients.get(otherUserId);
              if (otherUserSockets) {
                otherUserSockets.forEach(socket => {
                  if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                      type: 'user_status',
                      userId: (ws as any).userId,
                      status: 'online',
                      timestamp: Date.now()
                    }));
                  }
                });
              }
            }
            
            // Confirm to sender
            safeSend(ws, {
              type: 'status_updated',
              status: 'online',
              timestamp: Date.now()
            });
          } catch (error: any) {
            logError(error as Error, 'Online status error:');
          }
          return;
        }
        
        if (message.type === 'chat_message') {
          // Use ChatService with Redis integration
          try {
            const messageData = {
              content: message.content,
              messageType: 'text'
            };
            
            // FIX BUG #2: Verify user has joined chat BEFORE sending message
            // Subscription setup is ONLY done in join_chat handler to prevent duplicate subscriptions
            const chatUsers = chatSubscriptions.get(message.chatId);
            if (!chatUsers || !chatUsers.has((ws as any).userId)) {
              safeSend(ws, { 
                type: 'error', 
                message: 'You must join the chat before sending messages. Please send join_chat first.' 
              });
              return;
            }
            
            const newMessage = await ChatService.sendMessage(messageData, message.chatId, (ws as any).userId, req as any);
            
            // Message delivery is handled by Redis pub/sub (if available) or local broadcast
            // Redis subscriptions are already set up in join_chat handler
            if (!RedisService.isAvailable()) {
              // Fallback to direct WebSocket delivery for local-only deployments
              chatUsers.forEach(userId => {
                if (userId !== (ws as any).userId) {
                  const recipientSockets = clients.get(userId);
                  if (recipientSockets) {
                    recipientSockets.forEach(recipientSocket => {
                      if (recipientSocket.readyState === WebSocket.OPEN) {
                        recipientSocket.send(JSON.stringify({
                          type: 'new_message',
                          message: newMessage,
                          fromLocal: true
                        }));
                      }
                    });
                  }
                }
              });
              logInfo(`📨 Message sent to ${chatUsers.size - 1} users in chat ${message.chatId} (local-only)`);
            }
            
            // Send confirmation to sender
            safeSend(ws, {
              type: 'message_sent',
              message: newMessage
            });
            
          } catch (error: any) {
            safeSend(ws, { 
              type: 'error', 
              message: error.message 
            });
          }
          return;
        }
        
        if (message.type === 'add_reaction') {
          try {
            const reaction = await ChatService.addReaction(
              message.messageId,
              (ws as any).userId,
              message.emoji,
              req as any
            );
            
            // Broadcast reaction to other chat participants
            const chatUsers = chatSubscriptions.get(message.chatId);
            if (chatUsers && !RedisService.isAvailable()) {
              chatUsers.forEach(userId => {
                const recipientSockets = clients.get(userId);
                if (recipientSockets) {
                  recipientSockets.forEach(recipientSocket => {
                    if (recipientSocket.readyState === WebSocket.OPEN) {
                      recipientSocket.send(JSON.stringify({
                        type: 'reaction_added',
                        reaction: {
                          id: reaction.id,
                          messageId: message.messageId,
                          userId: (ws as any).userId,
                          emoji: message.emoji,
                          createdAt: reaction.createdAt
                        }
                      }));
                    }
                  });
                }
              });
            }
            
            // Send confirmation to sender
            safeSend(ws, {
              type: 'reaction_added',
              reaction: {
                id: reaction.id,
                messageId: message.messageId,
                userId: (ws as any).userId,
                emoji: message.emoji,
                createdAt: reaction.createdAt
              }
            });
          } catch (error: any) {
            safeSend(ws, { 
              type: 'error', 
              message: error.message 
            });
          }
          return;
        }
        
        if (message.type === 'remove_reaction') {
          try {
            await ChatService.removeReaction(
              message.messageId,
              (ws as any).userId,
              req as any
            );
            
            // Broadcast reaction removal to other chat participants
            const chatUsers = chatSubscriptions.get(message.chatId);
            if (chatUsers && !RedisService.isAvailable()) {
              chatUsers.forEach(userId => {
                const recipientSockets = clients.get(userId);
                if (recipientSockets) {
                  recipientSockets.forEach(recipientSocket => {
                    if (recipientSocket.readyState === WebSocket.OPEN) {
                      recipientSocket.send(JSON.stringify({
                        type: 'reaction_removed',
                        messageId: message.messageId,
                        userId: (ws as any).userId,
                        timestamp: new Date().toISOString()
                      }));
                    }
                  });
                }
              });
            }
            
            // Send confirmation to sender
            safeSend(ws, {
              type: 'reaction_removed',
              messageId: message.messageId,
              userId: (ws as any).userId,
              timestamp: new Date().toISOString()
            });
          } catch (error: any) {
            safeSend(ws, { 
              type: 'error', 
              message: error.message 
            });
          }
          return;
        }
      };

      ws.on('message', async (data) => {
        try {
          // Parse JSON message
          let rawMessage;
          try {
            rawMessage = JSON.parse(data.toString());
          } catch (parseError) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid JSON message format' 
            }));
            return;
          }
          
          // Validate message schema
          const validationResult = wsMessageSchema.safeParse(rawMessage);
          if (!validationResult.success) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid message format', 
              details: validationResult.error.errors.map(e => ({ 
                path: e.path.join('.'), 
                message: e.message 
              }))
            }));
            return;
          }
          
          const message = validationResult.data;
          
          // Process the validated message using the helper function
          await processWebSocketMessage(message);
        } catch (error: any) {
          logError(error as Error, 'WebSocket message error:');
          try {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: error.message || 'Failed to process message'
            }));
          } catch (sendError) {
            logError(sendError as Error, 'Failed to send error message to client:');
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1002, Buffer.from('Protocol error'));
            }
          }
        }
      });

      ws.on('close', async () => {
        const userId = (ws as any).userId;
        
        // Clean up WebSocket-to-chat mapping first
        const wsChats = wsToChatsMap.get(ws);
        if (wsChats) {
          wsChats.forEach(chatId => {
            const chatUsers = chatSubscriptions.get(chatId);
            if (chatUsers && userId) {
              chatUsers.delete(userId);
              // Clean up subscription if no users left
              if (chatUsers.size === 0) {
                chatSubscriptions.delete(chatId);
                // Unsubscribe from Redis when no users left in chat
                if (RedisService.isAvailable() && redisSubscriptions.has(chatId)) {
                  redisSubscriptions.delete(chatId);
                  RedisService.unsubscribeFromChatMessages(chatId);
                  logInfo(`✅ Chat ${chatId} Redis subscription cleaned up - no users remaining`);
                }
              }
            }
          });
          wsToChatsMap.delete(ws);
        }
        
        if (userId) {
          const userSockets = clients.get(userId);
          if (userSockets) {
            userSockets.delete(ws);
            
            // Remove user from clients map if no more connections
            if (userSockets.size === 0) {
              clients.delete(userId);
              
              // Remove admin from adminClients set if they were an admin
              const userRole = (ws as any).userRole;
              if (userRole === 'admin' || userRole === 'owner') {
                adminClients.delete(userId);
                logInfo(`🔒 Admin user ${userId} disconnected from fraud alert notifications`);
              }
              
              // Remove active user from Redis and broadcast offline status
              await RedisService.removeActiveUser(userId);
              
              // Broadcast offline status to chat participants
              try {
                const userChats = await storage.getChatsByUser(userId);
                for (const chat of userChats) {
                  const otherUserId = chat.buyerId === userId ? chat.sellerId : chat.buyerId;
                  const otherUserSockets = clients.get(otherUserId);
                  if (otherUserSockets) {
                    otherUserSockets.forEach(socket => {
                      if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                          type: 'user_status',
                          userId: userId,
                          status: 'offline',
                          timestamp: Date.now()
                        }));
                      }
                    });
                  }
                }
                
                // Also publish to Redis for scaling if available
                if (RedisService.isAvailable()) {
                  await RedisService.publishUserStatus(userId, {
                    status: 'offline',
                    timestamp: Date.now()
                  });
                }
              } catch (error: any) {
                logError(error as Error, 'Error broadcasting offline status:');
              }
            }
          }
        }
      });
      
    } catch (error) {
      logError(error as Error, 'WebSocket connection error:');
      ws.close(1011, Buffer.from('Connection failed'));
    }
  });

  logInfo('✅ WebSocket server initialized successfully');
  return wss;
}

/**
 * Gracefully shutdown WebSocket server and connections
 */
export async function gracefulShutdownWebSocket(): Promise<void> {
  logInfo('🔄 Shutting down WebSocket server...');
  
  // Close all WebSocket connections
  if (wsServer && wsClients) {
    logInfo(`📡 Closing ${wsClients.size} WebSocket connections...`);
    wsClients.forEach((sockets, userId) => {
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1001, Buffer.from('Server shutting down'));
        }
      });
    });
    wsClients.clear();
    
    // Close WebSocket server
    wsServer.close(() => {
      logInfo('✅ WebSocket server closed');
    });
  }
  
  logInfo('✅ WebSocket shutdown complete');
}

// Export for graceful shutdown
export { wsServer, wsClients };
