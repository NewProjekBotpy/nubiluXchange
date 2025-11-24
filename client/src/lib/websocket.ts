export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface MessageReaction {
  id: number;
  messageId: number;
  userId: number;
  emoji: string;
  createdAt: string;
}

// Discriminated union for WebSocket messages - each type has its own specific shape
export type WebSocketMessage =
  | {
      type: 'chat_message';
      chatId: number;
      senderId: number;
      content: string;
      tempId?: string;
    }
  | {
      type: 'new_message';
      message: ChatMessage;
      chatId?: number;
      tempId?: string;
    }
  | {
      type: 'user_typing';
      chatId: number;
      userId: number;
      isTyping: boolean;
    }
  | {
      type: 'user_online';
      userId: number;
    }
  | {
      type: 'user_offline';
      userId: number;
    }
  | {
      type: 'user_status';
      userId: number;
      status: 'online' | 'offline';
    }
  | {
      type: 'message_status';
      messageId: number;
      status: 'sent' | 'delivered' | 'read';
      timestamp?: number;
    }
  | {
      type: 'reaction_added';
      reaction: MessageReaction;
    }
  | {
      type: 'add_reaction';
      messageId: number;
      chatId: number;
      emoji: string;
    }
  | {
      type: 'reaction_removed';
      messageId: number;
      userId: number;
    }
  | {
      type: 'remove_reaction';
      reactionId: number;
      messageId: number;
      chatId: number;
    }
  | {
      type: 'join_chat';
      chatId: number;
    }
  | {
      type: 'ping' | 'pong';
      timestamp?: number;
    }
  | {
      type: 'queue_flushed' | 'ack';
    }
  | {
      type: 'subscribe_admin_updates';
      data: {
        enableStats: boolean;
        enableActivities: boolean;
        enableNotifications: boolean;
        updateInterval: number;
      };
    }
  | {
      type: 'request_stats_update';
    }
  | {
      type: 'admin_stats_update';
      data: {
        totalUsers?: number;
        totalAdmins?: number;
        pendingRequests?: number;
        activeEscrows?: number;
        systemLoad?: number;
        lastActivity?: string;
        [key: string]: any;
      };
    }
  | {
      type: 'admin_activity';
      data: {
        type: string;
        userId?: number;
        username?: string;
        action: string;
        status?: 'success' | 'warning' | 'error';
        timestamp?: string;
      };
    }
  | {
      type: 'admin_alert';
      data: {
        type: 'info' | 'warning' | 'error' | 'success';
        message: string;
        userId?: number;
        action?: string;
      };
    }
  | {
      type: 'live_notification';
      data: {
        type: 'user_action' | 'system_alert' | 'admin_request' | 'escrow_update';
        title: string;
        message: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        data?: any;
      };
    }
  | {
      type: 'user_count_update';
      data: {
        action: 'user_joined' | 'user_updated' | 'user_left';
        user: any;
      };
    }
  | {
      type: 'admin_request_update';
      data: {
        action: 'new_request' | 'request_updated' | 'request_resolved';
        username?: string;
        [key: string]: any;
      };
    }
  | {
      type: 'batch';
      messages: WebSocketMessage[];
      compressed?: boolean;
    };

// WebSocket Manager class removed - using useWebSocket hook instead
// This prevents multiple WebSocket connections that were causing page refreshes
