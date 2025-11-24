import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LiveStatusIndicatorProps {
  isConnected: boolean;
  connectionHealth: {
    isHealthy: boolean;
    latency: number;
    lastPing: number;
    reconnectCount: number;
  };
  className?: string;
  showLatency?: boolean;
  showDetails?: boolean;
}

export function LiveStatusIndicator({
  isConnected,
  connectionHealth,
  className,
  showLatency = false,
  showDetails = false
}: LiveStatusIndicatorProps) {
  const [displayLatency, setDisplayLatency] = useState(connectionHealth.latency);

  // Update display latency with smooth transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayLatency(connectionHealth.latency);
    }, 100);
    return () => clearTimeout(timer);
  }, [connectionHealth.latency]);

  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        status: 'disconnected' as const,
        color: 'status-error',
        icon: WifiOff,
        text: 'Disconnected',
        description: 'Real-time updates unavailable'
      };
    }

    if (!connectionHealth.isHealthy) {
      return {
        status: 'unhealthy' as const,
        color: 'status-warning',
        icon: AlertCircle,
        text: 'Unstable',
        description: 'Connection issues detected'
      };
    }

    if (connectionHealth.latency > 1000) {
      return {
        status: 'slow' as const,
        color: 'status-warning',
        icon: Activity,
        text: 'Slow',
        description: `High latency: ${connectionHealth.latency}ms`
      };
    }

    return {
      status: 'connected' as const,
      color: 'status-online',
      icon: CheckCircle,
      text: 'Live',
      description: connectionHealth.latency > 0 ? `Latency: ${connectionHealth.latency}ms` : 'Real-time updates active'
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const formatLatency = (latency: number) => {
    if (latency === 0) return '--';
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const getLatencyColor = (latency: number) => {
    if (latency === 0) return 'text-nxe-secondary';
    if (latency < 200) return 'text-nxe-success';
    if (latency < 500) return 'text-nxe-warning';
    return 'text-nxe-error';
  };

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center space-x-2 transition-modern',
              className
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full transition-modern',
                statusInfo.color,
                isConnected && connectionHealth.isHealthy && 'animate-pulse'
              )} />
              {showLatency && (
                <span className={cn(
                  'text-xs font-medium transition-modern',
                  getLatencyColor(displayLatency)
                )}>
                  {formatLatency(displayLatency)}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="modern-glass">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Icon className="h-3 w-3" />
                <span className="text-sm font-medium">{statusInfo.text}</span>
              </div>
              <p className="text-xs text-nxe-secondary">{statusInfo.description}</p>
              {connectionHealth.reconnectCount > 0 && (
                <p className="text-xs text-nxe-warning">
                  Reconnected {connectionHealth.reconnectCount} times
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      'flex items-center space-x-3 admin-glass rounded-lg p-3 transition-modern',
      className
    )}>
      <div className="flex items-center space-x-2">
        <div className={cn(
          'w-3 h-3 rounded-full transition-modern',
          statusInfo.color,
          isConnected && connectionHealth.isHealthy && 'animate-pulse'
        )} />
        <Icon className="h-4 w-4 text-nxe-text" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-white">
            {statusInfo.text}
          </span>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
        <p className="text-xs text-nxe-secondary truncate">
          {statusInfo.description}
        </p>
      </div>

      {showLatency && (
        <div className="flex flex-col items-end">
          <span className={cn(
            'text-sm font-mono transition-modern',
            getLatencyColor(displayLatency)
          )}>
            {formatLatency(displayLatency)}
          </span>
          <div className="flex items-center space-x-1 text-xs text-nxe-secondary">
            <Clock className="h-3 w-3" />
            <span>Ping</span>
          </div>
        </div>
      )}

      {connectionHealth.reconnectCount > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-xs text-nxe-warning">
            {connectionHealth.reconnectCount}
          </span>
          <span className="text-xs text-nxe-secondary">
            Reconnects
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for navigation bars
export function CompactLiveStatus({ 
  isConnected, 
  connectionHealth, 
  className 
}: Omit<LiveStatusIndicatorProps, 'showLatency' | 'showDetails'>) {
  return (
    <LiveStatusIndicator
      isConnected={isConnected}
      connectionHealth={connectionHealth}
      className={className}
      showLatency={false}
      showDetails={false}
    />
  );
}

// Detailed version for dashboard widgets
export function DetailedLiveStatus({ 
  isConnected, 
  connectionHealth, 
  className 
}: Omit<LiveStatusIndicatorProps, 'showLatency' | 'showDetails'>) {
  return (
    <LiveStatusIndicator
      isConnected={isConnected}
      connectionHealth={connectionHealth}
      className={className}
      showLatency={true}
      showDetails={true}
    />
  );
}