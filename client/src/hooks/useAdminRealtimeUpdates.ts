import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { hasAdminAccess } from '@shared/auth-utils';

interface AdminRealtimeData {
  stats: {
    totalUsers: number;
    totalAdmins: number;
    pendingRequests: number;
    activeEscrows: number;
    systemLoad: number;
    lastActivity: string;
  };
  alerts: {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: string;
    userId?: number;
    action?: string;
  }[];
  activities: {
    id: string;
    type: string;
    user: string;
    action: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }[];
}

interface LiveNotification {
  id: string;
  type: 'user_action' | 'system_alert' | 'admin_request' | 'escrow_update';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

interface UseAdminRealtimeOptions {
  enableNotifications?: boolean;
  enableLiveStats?: boolean;
  enableActivityFeed?: boolean;
  updateInterval?: number;
}

export function useAdminRealtimeUpdates(options: UseAdminRealtimeOptions = {}) {
  const {
    enableNotifications = true,
    enableLiveStats = true,
    enableActivityFeed = true,
    updateInterval = 5000
  } = options;

  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Real-time data state
  const [liveData, setLiveData] = useState<AdminRealtimeData>({
    stats: {
      totalUsers: 0,
      totalAdmins: 0,
      pendingRequests: 0,
      activeEscrows: 0,
      systemLoad: 0,
      lastActivity: new Date().toISOString()
    },
    alerts: [],
    activities: []
  });

  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [connectionHealth, setConnectionHealth] = useState({
    isHealthy: true,
    latency: 0,
    lastPing: Date.now(),
    reconnectCount: 0
  });

  // Activity buffer to prevent spam
  const activityBufferRef = useRef<Map<string, number>>(new Map());
  const notificationBufferRef = useRef<Set<string>>(new Set());

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    const now = Date.now();

    switch (message.type) {
      case 'admin_stats_update':
        if (enableLiveStats) {
          setLiveData(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              ...message.data,
              lastActivity: new Date().toISOString()
            }
          }));
          
          // Update query cache with fresh data
          queryClient.setQueryData(['/api/admin/stats'], (oldData: any) => ({
            ...oldData,
            ...message.data
          }));
        }
        break;

      case 'admin_activity':
        if (enableActivityFeed) {
          const activityId = `${message.data.type}-${message.data.userId || 'system'}`;
          const lastActivity = activityBufferRef.current.get(activityId) || 0;
          
          // Debounce rapid activities (max 1 per 3 seconds per type+user)
          if (now - lastActivity > 3000) {
            activityBufferRef.current.set(activityId, now);
            
            setLiveData(prev => ({
              ...prev,
              activities: [
                {
                  id: `${Date.now()}-${Math.random()}`,
                  type: message.data.type,
                  user: message.data.username || 'System',
                  action: message.data.action,
                  timestamp: new Date().toISOString(),
                  status: message.data.status || 'success'
                },
                ...prev.activities.slice(0, 49) // Keep max 50 activities
              ]
            }));
          }
        }
        break;

      case 'admin_alert':
        const alertId = `${message.data.type}-${message.data.message}`;
        
        setLiveData(prev => ({
          ...prev,
          alerts: [
            {
              id: `${Date.now()}-${Math.random()}`,
              type: message.data.type,
              message: message.data.message,
              timestamp: new Date().toISOString(),
              userId: message.data.userId,
              action: message.data.action
            },
            ...prev.alerts.slice(0, 19) // Keep max 20 alerts
          ]
        }));
        break;

      case 'live_notification':
        if (enableNotifications) {
          const notificationId = `${message.data.type}-${message.data.title}`;
          
          // Prevent duplicate notifications (max 1 per minute for same type+title)
          if (!notificationBufferRef.current.has(notificationId)) {
            notificationBufferRef.current.add(notificationId);
            
            const notification: LiveNotification = {
              id: `${Date.now()}-${Math.random()}`,
              type: message.data.type,
              title: message.data.title,
              message: message.data.message,
              timestamp: new Date().toISOString(),
              priority: message.data.priority || 'medium',
              data: message.data.data
            };
            
            setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep max 10 notifications
            
            // Clear from buffer after 1 minute
            setTimeout(() => {
              notificationBufferRef.current.delete(notificationId);
            }, 60000);
          }
        }
        break;

      case 'pong':
        // Update connection health
        setConnectionHealth(prev => ({
          ...prev,
          isHealthy: true,
          latency: now - prev.lastPing,
          lastPing: now
        }));
        break;

      case 'user_count_update':
        // Live user count updates
        queryClient.setQueryData(['/api/admin/users'], (oldData: any[]) => {
          if (!oldData) return oldData;
          
          if (message.data.action === 'user_joined') {
            // Add new user if not already present
            const userExists = oldData.find(user => user.id === message.data.user.id);
            if (!userExists) {
              return [message.data.user, ...oldData];
            }
          } else if (message.data.action === 'user_updated') {
            // Update existing user
            return oldData.map(user => 
              user.id === message.data.user.id ? { ...user, ...message.data.user } : user
            );
          }
          
          return oldData;
        });
        break;

      case 'admin_request_update':
        // Live admin request updates
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
        
        if (message.data.action === 'new_request') {
          setNotifications(prev => [{
            id: `request-${Date.now()}`,
            type: 'admin_request',
            title: 'New Admin Request',
            message: `${message.data.username} requested admin access`,
            timestamp: new Date().toISOString(),
            priority: 'high',
            data: message.data
          }, ...prev.slice(0, 9)]);
        }
        break;
    }
  }, [enableNotifications, enableLiveStats, enableActivityFeed, queryClient]);

  // Connection health monitoring
  const handleConnect = useCallback(() => {
    setConnectionHealth(prev => ({
      ...prev,
      isHealthy: true,
      reconnectCount: prev.reconnectCount + (prev.reconnectCount > 0 ? 1 : 0)
    }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionHealth(prev => ({
      ...prev,
      isHealthy: false
    }));
  }, []);

  // Initialize WebSocket connection
  const { isConnected, connectionStatus, sendMessage } = useWebSocket(
    user?.id || null,
    {
      onMessage: handleWebSocketMessage,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      autoReconnect: true,
      reconnectInterval: 3000
    }
  );

  // Subscribe to admin events when connected
  useEffect(() => {
    if (isConnected && hasAdminAccess(user)) {
      sendMessage({
        type: 'subscribe_admin_updates',
        data: {
          enableStats: enableLiveStats,
          enableActivities: enableActivityFeed,
          enableNotifications: enableNotifications,
          updateInterval
        }
      });
    }
  }, [isConnected, user?.role, enableLiveStats, enableActivityFeed, enableNotifications, updateInterval, sendMessage]);

  // Periodic health check
  useEffect(() => {
    const healthInterval = setInterval(() => {
      if (isConnected) {
        setConnectionHealth(prev => ({ ...prev, lastPing: Date.now() }));
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(healthInterval);
  }, [isConnected, sendMessage]);

  // Clear notifications
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear activities
  const clearActivities = useCallback(() => {
    setLiveData(prev => ({
      ...prev,
      activities: []
    }));
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setLiveData(prev => ({
      ...prev,
      alerts: []
    }));
  }, []);

  // Request immediate stats update
  const requestStatsUpdate = useCallback(() => {
    if (isConnected) {
      sendMessage({ type: 'request_stats_update' });
    }
  }, [isConnected, sendMessage]);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    connectionHealth,
    
    // Live data
    liveData,
    notifications,
    
    // Actions
    clearNotification,
    clearAllNotifications,
    clearActivities,
    clearAlerts,
    requestStatsUpdate,
    
    // Utility
    hasNewNotifications: notifications.length > 0,
    criticalNotifications: notifications.filter(n => n.priority === 'critical'),
    recentActivities: liveData.activities.slice(0, 10),
    activeAlerts: liveData.alerts.filter(a => a.type === 'error' || a.type === 'warning')
  };
}