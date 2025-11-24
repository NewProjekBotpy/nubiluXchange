import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@/lib/websocket';
import { logger } from '@/lib/logger';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onStatusUpdate?: (update: { messageId: number; status: 'sent' | 'delivered' | 'read'; timestamp?: string }) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(userId: number | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());
  const batchQueueRef = useRef<WebSocketMessage[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 10;
  const maxQueueSize = 500;
  const queueFlushTimeout = 30000;
  const batchWindow = 50;
  const maxBatchSize = 10;

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onStatusUpdate,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options;

  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onStatusUpdateRef = useRef(onStatusUpdate);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onStatusUpdateRef.current = onStatusUpdate;
  }, [onMessage, onConnect, onDisconnect, onStatusUpdate]);

  const getReconnectDelay = useCallback((attempt: number) => {
    const baseDelay = reconnectInterval;
    if (attempt === 0) return 1000;
    if (attempt === 1) return 2000;
    
    const multiplier = Math.pow(2, attempt - 2);
    const exponentialDelay = Math.min(baseDelay * multiplier, 60000);
    const jitter = Math.random() * 0.3;
    return exponentialDelay * (1 + jitter);
  }, [reconnectInterval]);

  const checkBackpressure = useCallback(() => {
    const queueSize = messageQueueRef.current.length;
    const utilizationPercent = (queueSize / maxQueueSize) * 100;
    
    if (utilizationPercent >= 90) {
      logger.warn(`Message queue critically full: ${queueSize}/${maxQueueSize}`, { 
        component: 'useWebSocket', 
        operation: 'checkBackpressure',
        queueSize, 
        maxQueueSize, 
        utilizationPercent: utilizationPercent.toFixed(0) 
      });
      setLastError(`Message queue critically full (${utilizationPercent.toFixed(0)}%)`);
    } else if (utilizationPercent >= 75) {
      logger.warn(`Message queue high: ${queueSize}/${maxQueueSize}`, { 
        component: 'useWebSocket', 
        operation: 'checkBackpressure',
        queueSize, 
        maxQueueSize, 
        utilizationPercent: utilizationPercent.toFixed(0) 
      });
    }
    
    return queueSize < maxQueueSize;
  }, []);

  const flushMessageQueue = useCallback((ws: WebSocket) => {
    if (messageQueueRef.current.length === 0) return;

    logger.info(`Flushing ${messageQueueRef.current.length} queued messages`, { 
      component: 'useWebSocket', 
      operation: 'flushMessageQueue',
      queueLength: messageQueueRef.current.length 
    });
    const queueSnapshot = [...messageQueueRef.current];
    messageQueueRef.current = [];

    if (queueFlushTimeoutRef.current) {
      clearTimeout(queueFlushTimeoutRef.current);
    }

    let flushedCount = 0;
    let failedCount = 0;

    queueSnapshot.forEach((queuedMessage) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(queuedMessage));
          flushedCount++;
        } else {
          messageQueueRef.current.push(queuedMessage);
          failedCount++;
        }
      } catch (error) {
        logger.error('Failed to send queued message', error, { 
          component: 'useWebSocket', 
          operation: 'flushMessageQueue' 
        });
        messageQueueRef.current.push(queuedMessage);
        failedCount++;
      }
    });

    if (flushedCount > 0) {
      logger.info(`Successfully flushed ${flushedCount} messages`, { 
        component: 'useWebSocket', 
        operation: 'flushMessageQueue',
        flushedCount 
      });
    }
    if (failedCount > 0) {
      logger.warn(`Failed to flush ${failedCount} messages, re-queued`, { 
        component: 'useWebSocket', 
        operation: 'flushMessageQueue',
        failedCount 
      });
    }

    queueFlushTimeoutRef.current = setTimeout(() => {
      if (messageQueueRef.current.length > 0) {
        logger.warn(`Queue flush timeout: ${messageQueueRef.current.length} messages still pending`, { 
          component: 'useWebSocket', 
          operation: 'flushMessageQueue',
          pendingMessages: messageQueueRef.current.length 
        });
        setLastError(`Queue flush timeout: ${messageQueueRef.current.length} messages pending`);
      }
    }, queueFlushTimeout);
  }, [queueFlushTimeout]);

  const connect = useCallback(() => {
    if (!userId) {
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      setLastError(null);
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      let host = window.location.host;
      
      if (!host) {
        host = 'localhost:5000';
      } else {
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        if (isLocalhost && !host.includes(':')) {
          host = window.location.hostname + ':5000';
        }
      }
      
      const wsUrl = `${protocol}//${host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setLastError(null);
        reconnectAttemptsRef.current = 0;
        logger.info('WebSocket connected successfully', { component: 'useWebSocket', operation: 'onopen', userId });
        onConnectRef.current?.();
        
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        flushMessageQueue(ws);
        
        const startHeartbeat = () => {
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }
          heartbeatTimeoutRef.current = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              
              if (pongTimeoutRef.current) {
                clearTimeout(pongTimeoutRef.current);
              }
              pongTimeoutRef.current = setTimeout(() => {
                logger.warn('Pong timeout - connection appears dead, closing', { component: 'useWebSocket', operation: 'heartbeat' });
                setLastError('Heartbeat timeout - connection lost');
                ws.close(4000, 'Heartbeat timeout');
              }, 15000);
              
              startHeartbeat();
            }
          }, 30000);
        };
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          if (!event.data || typeof event.data !== 'string') {
            logger.error('Invalid WebSocket message format', null, { component: 'useWebSocket', operation: 'onmessage', dataType: typeof event.data });
            return;
          }

          const message = JSON.parse(event.data);
          
          if (!message || typeof message !== 'object' || !message.type) {
            logger.error('Invalid message structure', null, { component: 'useWebSocket', operation: 'onmessage', hasMessage: !!message });
            return;
          }
          
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          
          if (message.type === 'pong') {
            const latency = message.timestamp ? Date.now() - message.timestamp : null;
            logger.debug(`Heartbeat acknowledged${latency ? ` (${latency}ms)` : ''}`, { component: 'useWebSocket', operation: 'heartbeat', latency });
            return;
          }

          if (message.type === 'queue_flushed' || message.type === 'ack') {
            if (queueFlushTimeoutRef.current) {
              clearTimeout(queueFlushTimeoutRef.current);
              queueFlushTimeoutRef.current = null;
            }
            logger.info('Queue flush acknowledged by server', { component: 'useWebSocket', operation: 'onmessage', messageType: message.type });
            return;
          }
          
          if (message.type === 'message_status' && message.messageId && message.status) {
            logger.debug(`Status update: Message ${message.messageId} is now ${message.status}`, { component: 'useWebSocket', operation: 'onmessage', messageId: message.messageId, status: message.status });
            onStatusUpdateRef.current?.({
              messageId: message.messageId,
              status: message.status,
              timestamp: message.timestamp
            });
            return;
          }

          if (message.type === 'batch' && message.messages && Array.isArray(message.messages)) {
            logger.info(`Received batch of ${message.messages.length} messages`, { component: 'useWebSocket', operation: 'onmessage', batchSize: message.messages.length });
            message.messages.forEach((batchedMessage: WebSocketMessage) => {
              const msgWithTempId = batchedMessage as any;
              if (msgWithTempId.tempId && !sentMessageIdsRef.current.has(msgWithTempId.tempId)) {
                sentMessageIdsRef.current.add(msgWithTempId.tempId);
                onMessageRef.current?.(batchedMessage);
              } else if (!msgWithTempId.tempId) {
                onMessageRef.current?.(batchedMessage);
              }
            });
            return;
          }

          if (message.tempId) {
            if (sentMessageIdsRef.current.has(message.tempId)) {
              logger.debug(`Duplicate message detected, ignoring`, { component: 'useWebSocket', operation: 'onmessage', tempId: message.tempId });
              return;
            }
            sentMessageIdsRef.current.add(message.tempId);
            
            if (sentMessageIdsRef.current.size > 1000) {
              const idsArray = Array.from(sentMessageIdsRef.current);
              sentMessageIdsRef.current = new Set(idsArray.slice(-1000));
            }
          }
          
          onMessageRef.current?.(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error, { component: 'useWebSocket', operation: 'onmessage' });
          setLastError(`Message parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        const closeReason = event.reason || 'Unknown reason';
        logger.info('WebSocket disconnected', { component: 'useWebSocket', operation: 'onclose', code: event.code, reason: closeReason });
        setLastError(`Disconnected: ${closeReason} (code: ${event.code})`);
        onDisconnectRef.current?.();

        if (queueFlushTimeoutRef.current) {
          clearTimeout(queueFlushTimeoutRef.current);
          queueFlushTimeoutRef.current = null;
        }

        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          if (document.hidden) {
            logger.info('Skipping reconnect while document is hidden', { component: 'useWebSocket', operation: 'onclose' });
            return;
          }
          
          const shouldReconnect = ![1000, 1001, 1005, 4001].includes(event.code);
          
          if (shouldReconnect) {
            reconnectAttemptsRef.current++;
            const delay = getReconnectDelay(reconnectAttemptsRef.current - 1);
            logger.info(`Reconnecting in ${Math.round(delay)}ms`, { component: 'useWebSocket', operation: 'reconnect', attempt: reconnectAttemptsRef.current, maxAttempts: maxReconnectAttempts, delay });
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            logger.info('Connection closed intentionally, not reconnecting', { component: 'useWebSocket', operation: 'onclose', code: event.code });
            if (event.code === 4001) {
              const authError = 'Authentication failed - please refresh and log in again';
              logger.error(authError, null, { component: 'useWebSocket', operation: 'onclose' });
              setLastError(authError);
            }
          }
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          const maxAttemptsError = 'Unable to establish connection after multiple attempts';
          logger.error(`${maxAttemptsError}. Please refresh the page.`, null, { component: 'useWebSocket', operation: 'onclose', reconnectAttempts: reconnectAttemptsRef.current });
          setLastError(maxAttemptsError);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error', error, { component: 'useWebSocket', operation: 'onerror', readyState: wsRef.current?.readyState });
        
        let errorMessage = 'WebSocket error occurred';
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          errorMessage = 'Connection failed - will attempt to reconnect';
          logger.warn(errorMessage, { component: 'useWebSocket', operation: 'onerror' });
        } else if (wsRef.current?.readyState === WebSocket.OPEN) {
          errorMessage = 'Connection error during active session';
          logger.warn(errorMessage, { component: 'useWebSocket', operation: 'onerror' });
        }
        setLastError(errorMessage);
      };

    } catch (error) {
      const setupError = `Failed to create WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(setupError, error, { component: 'useWebSocket', operation: 'connect', userId });
      setConnectionStatus('disconnected');
      setLastError(setupError);
    }
  }, [userId, autoReconnect, getReconnectDelay, flushMessageQueue]);

  const flushBatch = useCallback(() => {
    if (batchQueueRef.current.length === 0) return;
    
    const batch = [...batchQueueRef.current];
    batchQueueRef.current = [];
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const batchMessage: WebSocketMessage = {
          type: 'batch',
          messages: batch
        };
        
        wsRef.current.send(JSON.stringify(batchMessage));
        logger.info(`Sent batch of ${batch.length} messages`, { component: 'useWebSocket', operation: 'flushBatch', batchSize: batch.length });
        return true;
      } catch (error) {
        logger.error('Failed to send batch', error, { component: 'useWebSocket', operation: 'flushBatch', batchSize: batch.length });
        batchQueueRef.current.push(...batch);
        return false;
      }
    }
    
    batchQueueRef.current.push(...batch);
    return false;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }

    if (queueFlushTimeoutRef.current) {
      clearTimeout(queueFlushTimeoutRef.current);
      queueFlushTimeoutRef.current = null;
    }

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage, queueIfDisconnected: boolean = true, enableBatching: boolean = false) => {
    // Add tempId for deduplication (cast to any to add extra property)
    const messageWithTempId = message as WebSocketMessage & { tempId?: string };
    if (!messageWithTempId.tempId && message.type !== 'ping' && message.type !== 'batch') {
      messageWithTempId.tempId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Use batching for high-frequency non-critical messages
      if (enableBatching && message.type !== 'ping' && message.type !== 'batch') {
        batchQueueRef.current.push(messageWithTempId);
        
        // Flush immediately if batch is full
        if (batchQueueRef.current.length >= maxBatchSize) {
          flushBatch();
        } else {
          // Schedule batch flush if not already scheduled
          if (!batchTimeoutRef.current) {
            batchTimeoutRef.current = setTimeout(() => {
              flushBatch();
            }, batchWindow);
          }
        }
        
        return true;
      }
      
      // Send immediately for non-batched messages
      try {
        wsRef.current.send(JSON.stringify(messageWithTempId));
        
        if (messageWithTempId.tempId) {
          sentMessageIdsRef.current.add(messageWithTempId.tempId);
        }
        
        return true;
      } catch (error) {
        logger.error('Failed to send WebSocket message', error, { component: 'useWebSocket', operation: 'sendMessage' });
        setLastError(`Send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (queueIfDisconnected && message.type !== 'ping') {
          if (checkBackpressure()) {
            messageQueueRef.current.push(message);
            logger.info(`Message queued`, { component: 'useWebSocket', operation: 'sendMessage', queueLength: messageQueueRef.current.length, maxQueueSize });
          } else {
            messageQueueRef.current.shift();
            messageQueueRef.current.push(message);
            logger.warn(`Queue full, removed oldest message`, { component: 'useWebSocket', operation: 'sendMessage', maxQueueSize });
          }
        }
        return false;
      }
    }
    
    if (queueIfDisconnected && message.type !== 'ping') {
      if (checkBackpressure()) {
        messageQueueRef.current.push(message);
        logger.info(`Message queued for retry`, { component: 'useWebSocket', operation: 'sendMessage', queueLength: messageQueueRef.current.length, maxQueueSize });
      } else {
        messageQueueRef.current.shift();
        messageQueueRef.current.push(message);
        logger.warn(`Queue full, removed oldest message`, { component: 'useWebSocket', operation: 'sendMessage', maxQueueSize });
      }
    }
    return false;
  }, [checkBackpressure, flushBatch, maxBatchSize, batchWindow]);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
      if (queueFlushTimeoutRef.current) {
        clearTimeout(queueFlushTimeoutRef.current);
        queueFlushTimeoutRef.current = null;
      }
      if (pongTimeoutRef.current) {
        clearTimeout(pongTimeoutRef.current);
        pongTimeoutRef.current = null;
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [userId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          wsRef.current?.readyState !== WebSocket.OPEN && 
          autoReconnect && 
          userId) {
        logger.info('Tab became visible, attempting to reconnect', { component: 'useWebSocket', operation: 'visibilitychange', userId });
        // Manually reconnect instead of calling connect to avoid dependency
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}`;
        
        if (wsRef.current) {
          wsRef.current.close();
        }
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          setIsConnected(true);
          setConnectionStatus('connected');
          logger.info('WebSocket reconnected on visibility change', { component: 'useWebSocket', userId });
        };
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, autoReconnect]);

  return {
    isConnected,
    connectionStatus,
    lastError,
    sendMessage,
    connect,
    disconnect,
    queueSize: messageQueueRef.current.length
  };
}
