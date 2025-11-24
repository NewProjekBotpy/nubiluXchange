import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  user: string;
  action: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface LiveActivityFeedProps {
  activities: ActivityItem[];
  onClearActivities: () => void;
  onRefresh?: () => void;
  isLive?: boolean;
  className?: string;
}

type ActivityFilter = 'all' | 'success' | 'warning' | 'error' | 'recent';

export function LiveActivityFeed({
  activities,
  onClearActivities,
  onRefresh,
  isLive = true,
  className
}: LiveActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [isMinimized, setIsMinimized] = useState(false);

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'error') return XCircle;
    if (status === 'warning') return AlertTriangle;
    if (status === 'success') return CheckCircle;
    
    switch (type.toLowerCase()) {
      case 'user':
      case 'user_action':
        return Users;
      case 'admin':
      case 'admin_action':
        return Shield;
      case 'system':
      case 'system_action':
        return Activity;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-nxe-success';
      case 'warning':
        return 'text-nxe-warning';
      case 'error':
        return 'text-nxe-error';
      default:
        return 'text-nxe-secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'outline';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    switch (filter) {
      case 'success':
        filtered = activities.filter(a => a.status === 'success');
        break;
      case 'warning':
        filtered = activities.filter(a => a.status === 'warning');
        break;
      case 'error':
        filtered = activities.filter(a => a.status === 'error');
        break;
      case 'recent':
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        filtered = activities.filter(a => new Date(a.timestamp) > oneHourAgo);
        break;
      case 'all':
      default:
        filtered = activities;
        break;
    }

    return filtered.slice(0, 50); // Limit to 50 for performance
  }, [activities, filter]);

  const statusCounts = useMemo(() => {
    return {
      success: activities.filter(a => a.status === 'success').length,
      warning: activities.filter(a => a.status === 'warning').length,
      error: activities.filter(a => a.status === 'error').length,
      total: activities.length
    };
  }, [activities]);

  return (
    <Card className={cn('admin-glass transition-modern', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-nxe-primary" />
            <CardTitle className="text-lg font-semibold">Live Activity Feed</CardTitle>
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-nxe-success rounded-full animate-pulse" />
                <span className="text-xs text-nxe-success">Live</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
                data-testid="refresh-activities"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            
            {activities.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearActivities}
                className="h-8 w-8 p-0 text-nxe-error hover:text-red-400"
                data-testid="clear-activities"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Status Summary */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-nxe-success rounded-full" />
                <span className="text-nxe-secondary">{statusCounts.success} Success</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-nxe-warning rounded-full" />
                <span className="text-nxe-secondary">{statusCounts.warning} Warning</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-nxe-error rounded-full" />
                <span className="text-nxe-secondary">{statusCounts.error} Error</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-nxe-secondary">Total: {statusCounts.total}</span>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-nxe-secondary" />
                <span className="text-sm text-nxe-secondary">Filter:</span>
              </div>
              
              <Select value={filter} onValueChange={(value: ActivityFilter) => setFilter(value)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="modern-glass">
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="recent">Recent (1h)</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                  <SelectItem value="warning">Warnings Only</SelectItem>
                  <SelectItem value="error">Errors Only</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-xs text-nxe-secondary">
                Showing {filteredActivities.length} of {activities.length}
              </span>
            </div>
          </>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="pt-0">
          <ScrollArea className="h-80 pr-4 custom-scrollbar">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Activity className="h-8 w-8 text-nxe-secondary mb-2" />
                <p className="text-sm text-nxe-secondary">
                  {filter === 'all' ? 'No activities yet' : `No ${filter} activities`}
                </p>
                <p className="text-xs text-nxe-secondary mt-1">
                  {isLive ? 'Monitoring for new activities...' : 'Activities will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type, activity.status);
                  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true
                  });

                  return (
                    <div
                      key={activity.id}
                      className={cn(
                        'flex items-start space-x-3 p-3 rounded-lg transition-modern hover:bg-nxe-surface/30',
                        index === 0 && 'animate-scale-in' // Animate newest item
                      )}
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        activity.status === 'success' ? 'bg-nxe-success/20' :
                        activity.status === 'warning' ? 'bg-nxe-warning/20' :
                        activity.status === 'error' ? 'bg-nxe-error/20' :
                        'bg-nxe-surface'
                      )}>
                        <Icon className={cn(
                          'h-4 w-4',
                          getStatusColor(activity.status)
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">
                              <span className="text-nxe-accent">{activity.user}</span>
                              {' '}
                              <span className="text-nxe-secondary">{activity.action}</span>
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge
                                variant={getStatusBadgeVariant(activity.status)}
                                className="text-xs capitalize"
                              >
                                {activity.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {activity.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs text-nxe-secondary">
                            <Clock className="h-3 w-3" />
                            <span>{timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}