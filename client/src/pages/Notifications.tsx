import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { 
  Bell,
  ShoppingCart,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  X,
  Settings,
  Trash2,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'order' | 'message' | 'payment' | 'system';
  isRead: boolean;
  metadata?: {
    productId?: number;
    chatId?: number;
    transactionId?: number;
    amount?: string;
  };
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order':
      return <ShoppingCart className="h-5 w-5 text-blue-500" />;
    case 'message':
      return <MessageCircle className="h-5 w-5 text-green-500" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-purple-500" />;
    case 'system':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications', filter],
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      refetch();
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notifikasi dihapus",
        description: "Notifikasi berhasil dihapus"
      });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/mark-all-read', {
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Semua notifikasi telah dibaca",
        description: "Semua notifikasi berhasil ditandai sebagai sudah dibaca"
      });
    }
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari lalu`;
  };

  const filteredNotifications = (notifications as Notification[]).filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    return true;
  });

  const unreadCount = (notifications as Notification[]).filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-nxe-dark p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Bell className="h-6 w-6 mr-2 text-nxe-primary" />
            Notifikasi
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-nxe-text">
            Tetap update dengan aktivitas akun dan transaksi Anda
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              variant="outline"
              size="sm"
              className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white"
              data-testid="button-mark-all-read"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Tandai Semua Dibaca
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="text-nxe-primary hover:bg-nxe-primary/10"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-nxe-surface border border-nxe-border">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Semua ({(notifications as Notification[]).length})
          </TabsTrigger>
          <TabsTrigger 
            value="unread"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Belum Dibaca ({unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-64" data-testid="notifications-loading">
          <Loading variant="gaming" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'unread' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
          </h3>
          <p className="text-nxe-text">
            {filter === 'unread' 
              ? 'Semua notifikasi sudah dibaca'
              : 'Notifikasi akan muncul di sini ketika ada aktivitas baru'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                notification.isRead
                  ? 'bg-nxe-surface border-nxe-border'
                  : 'bg-nxe-surface border-nxe-primary/50 shadow-lg shadow-nxe-primary/10'
              }`}
              data-testid={`notification-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    notification.isRead ? 'bg-nxe-dark' : 'bg-nxe-primary/20'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          notification.isRead ? 'text-white' : 'text-white font-semibold'
                        } mb-1`}>
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 w-2 h-2 bg-nxe-primary rounded-full inline-block" />
                          )}
                        </h4>
                        <p className="text-nxe-text text-sm mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Metadata */}
                        {notification.metadata?.amount && (
                          <Badge variant="outline" className="text-xs mb-2">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                            }).format(parseFloat(notification.metadata.amount))}
                          </Badge>
                        )}
                        
                        <p className="text-xs text-nxe-text">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.isRead && (
                          <Button
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            variant="ghost"
                            size="sm"
                            className="text-nxe-primary hover:bg-nxe-primary/10"
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-400/10"
                          data-testid={`button-delete-${notification.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}