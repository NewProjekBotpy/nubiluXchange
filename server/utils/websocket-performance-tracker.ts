import { logInfo, logWarning } from './logger';

/**
 * WebSocket Performance Metrics
 */
interface WebSocketMetrics {
  totalMessages: number;
  totalErrors: number;
  averageResponseTime: number;
  messagesByType: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
    avgTime: number;
  }>;
  activeConnections: number;
  peakConnections: number;
  totalConnectionTime: number;
  connectionCount: number;
}

interface MessageTiming {
  type: string;
  duration: number;
  timestamp: Date;
  success: boolean;
}

class WebSocketPerformanceTracker {
  private static metrics: WebSocketMetrics = {
    totalMessages: 0,
    totalErrors: 0,
    averageResponseTime: 0,
    messagesByType: new Map(),
    activeConnections: 0,
    peakConnections: 0,
    totalConnectionTime: 0,
    connectionCount: 0
  };

  private static messageTimes: number[] = [];
  private static readonly MAX_MESSAGE_TIMES = 1000;
  private static connectionStartTimes = new Map<string, number>();

  /**
   * Record WebSocket message processing time
   */
  static recordMessage(
    type: string,
    duration: number,
    success: boolean = true
  ): void {
    this.metrics.totalMessages++;
    
    if (!success) {
      this.metrics.totalErrors++;
    }

    // Track message times for average calculation
    this.messageTimes.push(duration);
    if (this.messageTimes.length > this.MAX_MESSAGE_TIMES) {
      this.messageTimes.shift();
    }

    // Update average response time
    const sum = this.messageTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.messageTimes.length;

    // Update message type specific metrics
    let typeMetric = this.metrics.messagesByType.get(type);
    if (!typeMetric) {
      typeMetric = {
        count: 0,
        totalTime: 0,
        errors: 0,
        avgTime: 0
      };
      this.metrics.messagesByType.set(type, typeMetric);
    }

    typeMetric.count++;
    typeMetric.totalTime += duration;
    typeMetric.avgTime = typeMetric.totalTime / typeMetric.count;
    
    if (!success) {
      typeMetric.errors++;
    }

    // Log slow messages
    if (duration > 1000) {
      logWarning(`⚠️  Slow WebSocket message: ${type} took ${duration}ms`);
    }
  }

  /**
   * Track WebSocket connection
   */
  static trackConnection(connectionId: string): void {
    this.metrics.activeConnections++;
    this.metrics.connectionCount++;
    
    if (this.metrics.activeConnections > this.metrics.peakConnections) {
      this.metrics.peakConnections = this.metrics.activeConnections;
    }

    this.connectionStartTimes.set(connectionId, Date.now());
  }

  /**
   * Track WebSocket disconnection
   */
  static trackDisconnection(connectionId: string): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    
    const startTime = this.connectionStartTimes.get(connectionId);
    if (startTime) {
      const connectionDuration = Date.now() - startTime;
      this.metrics.totalConnectionTime += connectionDuration;
      this.connectionStartTimes.delete(connectionId);
    }
  }

  /**
   * Get all metrics
   */
  static getMetrics(): any {
    const messageTypeStats = Array.from(this.metrics.messagesByType.entries()).map(
      ([type, metric]) => ({
        type,
        count: metric.count,
        avgTime: Math.round(metric.avgTime),
        errors: metric.errors,
        errorRate: ((metric.errors / metric.count) * 100).toFixed(2) + '%'
      })
    );

    const avgConnectionDuration = this.metrics.connectionCount > 0
      ? this.metrics.totalConnectionTime / this.metrics.connectionCount
      : 0;

    return {
      summary: {
        totalMessages: this.metrics.totalMessages,
        totalErrors: this.metrics.totalErrors,
        errorRate: this.metrics.totalMessages > 0
          ? ((this.metrics.totalErrors / this.metrics.totalMessages) * 100).toFixed(2) + '%'
          : '0%',
        averageResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
        activeConnections: this.metrics.activeConnections,
        peakConnections: this.metrics.peakConnections,
        totalConnections: this.metrics.connectionCount,
        avgConnectionDuration: Math.round(avgConnectionDuration / 1000) + 's'
      },
      messageTypes: messageTypeStats.sort((a, b) => b.count - a.count),
      performance: {
        messagesProcessed: this.metrics.totalMessages,
        averageLatency: Math.round(this.metrics.averageResponseTime),
        fastestMessages: this.messageTimes.length > 0 
          ? Math.min(...this.messageTimes) 
          : 0,
        slowestMessages: this.messageTimes.length > 0 
          ? Math.max(...this.messageTimes) 
          : 0
      }
    };
  }

  /**
   * Get summary statistics
   */
  static getSummary(): any {
    return {
      websocket: {
        totalMessages: this.metrics.totalMessages,
        totalErrors: this.metrics.totalErrors,
        avgResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
        activeConnections: this.metrics.activeConnections,
        peakConnections: this.metrics.peakConnections
      }
    };
  }

  /**
   * Get chat-specific performance metrics
   */
  static getChatMetrics(): any {
    const chatMessageMetric = this.metrics.messagesByType.get('chat_message');
    const typingMetric = this.metrics.messagesByType.get('user_typing');
    
    return {
      chatMessages: chatMessageMetric ? {
        count: chatMessageMetric.count,
        avgTime: Math.round(chatMessageMetric.avgTime) + 'ms',
        errors: chatMessageMetric.errors,
        errorRate: ((chatMessageMetric.errors / chatMessageMetric.count) * 100).toFixed(2) + '%'
      } : null,
      typingIndicators: typingMetric ? {
        count: typingMetric.count,
        avgTime: Math.round(typingMetric.avgTime) + 'ms'
      } : null,
      connections: {
        active: this.metrics.activeConnections,
        peak: this.metrics.peakConnections,
        total: this.metrics.connectionCount
      }
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalMessages: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      messagesByType: new Map(),
      activeConnections: this.metrics.activeConnections, // Keep active connections
      peakConnections: 0,
      totalConnectionTime: 0,
      connectionCount: 0
    };
    this.messageTimes = [];
    logInfo('WebSocket performance metrics reset');
  }

  /**
   * Track message with timing wrapper
   */
  static async trackMessageExecution<T>(
    type: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = Date.now();
    let success = true;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.recordMessage(type, duration, success);
    }
  }
}

/**
 * Export tracking functions
 */
export function trackWebSocketMessage(type: string, duration: number, success: boolean = true): void {
  WebSocketPerformanceTracker.recordMessage(type, duration, success);
}

export function trackWebSocketConnection(connectionId: string): void {
  WebSocketPerformanceTracker.trackConnection(connectionId);
}

export function trackWebSocketDisconnection(connectionId: string): void {
  WebSocketPerformanceTracker.trackDisconnection(connectionId);
}

export function getWebSocketMetrics(): any {
  return WebSocketPerformanceTracker.getMetrics();
}

export function getWebSocketSummary(): any {
  return WebSocketPerformanceTracker.getSummary();
}

export function getChatPerformanceMetrics(): any {
  return WebSocketPerformanceTracker.getChatMetrics();
}

export function resetWebSocketMetrics(): void {
  WebSocketPerformanceTracker.resetMetrics();
}

export async function trackMessageExecution<T>(
  type: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return WebSocketPerformanceTracker.trackMessageExecution(type, fn);
}
