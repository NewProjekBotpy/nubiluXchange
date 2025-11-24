import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  BellRing, 
  X, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  User,
  Shield,
  Activity,
  Clock,
  Trash2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface LiveNotification {
  id: string;
  type: 'user_action' | 'system_alert' | 'admin_request' | 'escrow_update';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

interface LiveNotificationCenterProps {
  notifications: LiveNotification[];
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function LiveNotificationCenter({
  notifications,
  onClearNotification,
  onClearAll,
  className
}: LiveNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'user_action':
        return User;
      case 'admin_request':
        return Shield;
      case 'escrow_update':
        return Activity;
      case 'system_alert':
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'status-error';
      case 'high':
        return 'text-nxe-warning';
      case 'medium':
        return 'text-nxe-info';
      case 'low':
      default:
        return 'text-nxe-secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'outline';
      case 'low':
      default:
        return 'outline';
    }
  };

  const criticalCount = notifications.filter(n => n.priority === 'critical').length;
  const highCount = notifications.filter(n => n.priority === 'high').length;
  const hasImportant = criticalCount > 0 || highCount > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative transition-modern hover-glow',
            hasImportant && 'text-nxe-warning',
            className
          )}
          data-testid="notification-center-trigger"
        >
          {notifications.length > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {notifications.length > 0 && (
            <div className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
              hasImportant ? 'status-error' : 'status-online'
            )}>
              {notifications.length > 99 ? '99+' : notifications.length}
            </div>
          )}
          
          {hasImportant && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 modern-glass border-nxe-border"
        data-testid="notification-center-content"
      >
        {/* Header */}
        <div className="p-4 border-b border-nxe-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-nxe-primary" />
              <span className="font-semibold text-white">Live Notifications</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} Critical
                </Badge>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-6 px-2 text-xs hover:text-white"
                  data-testid="clear-all-notifications"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {hasImportant && (
            <div className="mt-2 text-xs text-nxe-warning flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {criticalCount > 0 && `${criticalCount} critical`}
                {criticalCount > 0 && highCount > 0 && ', '}
                {highCount > 0 && `${highCount} high priority`}
              </span>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-96 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-nxe-secondary mx-auto mb-2" />
              <p className="text-sm text-nxe-secondary">No new notifications</p>
              <p className="text-xs text-nxe-secondary mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => {
                const Icon = getNotificationIcon(notification.type);
                const timeAgo = formatDistanceToNow(new Date(notification.timestamp), {
                  addSuffix: true
                });

                return (
                  <div key={notification.id}>
                    <div
                      className={cn(
                        'group p-3 rounded-lg transition-modern hover:bg-nxe-surface/50 cursor-pointer',
                        notification.priority === 'critical' && 'border-l-2 border-red-500',
                        notification.priority === 'high' && 'border-l-2 border-yellow-500'
                      )}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          notification.priority === 'critical' ? 'bg-red-500/20' :
                          notification.priority === 'high' ? 'bg-yellow-500/20' :
                          notification.priority === 'medium' ? 'bg-blue-500/20' :
                          'bg-nxe-surface'
                        )}>
                          <Icon className={cn(
                            'h-4 w-4',
                            getPriorityColor(notification.priority)
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-nxe-secondary mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearNotification(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
                              data-testid={`clear-notification-${notification.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={getPriorityBadgeVariant(notification.priority)}
                                className="text-xs capitalize"
                              >
                                {notification.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-1 text-xs text-nxe-secondary">
                              <Clock className="h-3 w-3" />
                              <span>{timeAgo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < notifications.length - 1 && (
                      <Separator className="mx-3 my-1 bg-nxe-border" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="bg-nxe-border" />
            <div className="p-3 bg-nxe-surface/30">
              <div className="flex items-center justify-between text-xs text-nxe-secondary">
                <span>
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-nxe-success rounded-full animate-pulse" />
                  <span>Live updates active</span>
                </div>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}