import { useState, useEffect } from "react";
import { logError } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";
import {
  Users,
  DollarSign,
  MessageSquare,
  Shield,
  AlertTriangle,
  TrendingUp,
  Activity,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  Zap,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  Target,
  TrendingDown,
  Calculator,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Download,
  FileText as FileTextIcon
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Enhanced mobile-responsive TouchButton component for Owner dashboard
const TouchButton = ({ 
  children, 
  icon: Icon, 
  loading = false, 
  className = "", 
  variant = "default",
  size = "default",
  ...props 
}: any) => (
  <Button 
    className={`touch-manipulation select-none active:scale-95 transition-transform ${className}`}
    disabled={loading}
    variant={variant}
    size={size}
    {...props}
  >
    {loading ? (
      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
    ) : Icon ? (
      <Icon className="h-4 w-4 mr-2" />
    ) : null}
    {children}
  </Button>
);

interface OwnerAnalytics {
  revenue: {
    totalRevenue: string;
    totalCommission: string;
    totalTransactions: number;
    averageTransactionValue: string;
    topCategories: Array<{ category: string; revenue: string; count: number }>;
    dailyReports: Array<{ reportDate: string; totalRevenue: string; totalCommission: string; totalTransactions: number }>;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    adminUsers: number;
    verifiedUsers: number;
    pendingAdminRequests: number;
  };
  transactions: {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    disputedTransactions: number;
    totalRevenue: string;
    totalCommission: string;
    averageTransactionValue: string;
    transactionsToday: number;
    transactionsThisWeek: number;
    transactionsThisMonth: number;
  };
  escrow: {
    totalEscrows: number;
    pendingEscrows: number;
    activeEscrows: number;
    completedEscrows: number;
    disputedEscrows: number;
    averageEscrowValue: string;
    escrowsToday: number;
    averageCompletionTime: number;
  };
  chat: {
    totalChats: number;
    activeChats: number;
    flaggedChats: number;
    resolvedFlags: number;
    averageResponseTime: number;
    chatsToday: number;
    messagesTotal: number;
    messagesToday: number;
  };
  systemHealth: {
    totalUsers: number;
    activeUsersToday: number;
    totalProducts: number;
    activeProducts: number;
    totalTransactions: number;
    transactionsToday: number;
    systemLoad: number;
    errorRate: number;
    responseTime: number;
  };
}

interface UserDetail {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  role: string;
  isVerified: boolean;
  walletBalance: string;
  totalProducts: number;
  totalTransactions: number;
  adminRequestPending: boolean;
  documentsCount: number;
  approvedDocuments: number;
  createdAt: string;
}

interface ChatDetail {
  id: number;
  productId: number;
  productTitle: string;
  buyerUsername: string;
  sellerUsername: string;
  status: string;
  messageCount: number;
  lastMessageAt: string;
  flaggedCount: number;
  riskLevel: string;
  createdAt: string;
}

interface AdminDocument {
  id: number;
  userId: number;
  documentType: string;
  documentUrl: string;
  status: string;
  reviewerNotes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

interface ChatMonitoring {
  id: number;
  chatId: number;
  flaggedReason: string;
  riskLevel: string;
  moderatorNotes?: string;
  isResolved: boolean;
  flaggedBy: number;
  resolvedBy?: number;
  resolvedAt?: string;
  createdAt: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function OwnerDashboard() {
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dateRange, setDateRange] = useState({ start: "2024-01-01", end: new Date().toISOString().split('T')[0] });
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Analytics queries
  const { data: revenueAnalytics, isLoading: loadingRevenue, error: revenueError, isFetching: fetchingRevenue } = useQuery({
    queryKey: ['owner', 'analytics', 'revenue', dateRange],
    queryFn: () => apiRequest(`/api/owner/analytics/revenue?startDate=${dateRange.start}&endDate=${dateRange.end}`),
    refetchInterval: isRealTimeEnabled ? 30000 : false, // 30 seconds for revenue data
    staleTime: 20000, // 20 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: userAnalytics, isLoading: loadingUsers, error: usersError, isFetching: fetchingUsers } = useQuery({
    queryKey: ['owner', 'analytics', 'users'],
    queryFn: () => apiRequest('/api/owner/analytics/users'),
    refetchInterval: isRealTimeEnabled ? 15000 : false, // 15 seconds for user data (more critical)
    staleTime: 10000, // 10 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: transactionAnalytics, isLoading: loadingTransactions, error: transactionsError, isFetching: fetchingTransactions } = useQuery({
    queryKey: ['owner', 'analytics', 'transactions'],
    queryFn: () => apiRequest('/api/owner/analytics/transactions'),
    refetchInterval: isRealTimeEnabled ? 10000 : false, // 10 seconds for transactions (most critical)
    staleTime: 5000, // 5 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: escrowAnalytics, isLoading: loadingEscrow, error: escrowError, isFetching: fetchingEscrow } = useQuery({
    queryKey: ['owner', 'analytics', 'escrow'],
    queryFn: () => apiRequest('/api/owner/analytics/escrow'),
    refetchInterval: isRealTimeEnabled ? 15000 : false, // 15 seconds for escrow data
    staleTime: 10000, // 10 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: chatAnalytics, isLoading: loadingChat, error: chatError, isFetching: fetchingChat } = useQuery({
    queryKey: ['owner', 'analytics', 'chat'],
    queryFn: () => apiRequest('/api/owner/analytics/chat'),
    refetchInterval: isRealTimeEnabled ? 20000 : false, // 20 seconds for chat data
    staleTime: 15000, // 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const { data: systemHealth, isLoading: loadingHealth, error: healthError, isFetching: fetchingHealth } = useQuery({
    queryKey: ['owner', 'analytics', 'system-health'],
    queryFn: () => apiRequest('/api/owner/analytics/system-health'),
    refetchInterval: isRealTimeEnabled ? 5000 : false, // 5 seconds for system health (critical monitoring)
    staleTime: 3000, // 3 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Detailed data queries with real-time updates
  const { data: allUsers, isLoading: loadingAllUsers, isFetching: fetchingAllUsers } = useQuery({
    queryKey: ['owner', 'users', 'all'],
    queryFn: () => apiRequest('/api/owner/users/all'),
    refetchInterval: isRealTimeEnabled ? 60000 : false, // 1 minute for user list
    staleTime: 45000, // 45 seconds
    retry: 2
  });

  const { data: allChats, isLoading: loadingAllChats, isFetching: fetchingAllChats } = useQuery({
    queryKey: ['owner', 'chats', 'all'],
    queryFn: () => apiRequest('/api/owner/chats/all'),
    refetchInterval: isRealTimeEnabled ? 30000 : false, // 30 seconds for chat list
    staleTime: 20000, // 20 seconds
    retry: 2
  });

  const { data: chatMonitoring, isLoading: loadingChatMonitoring, isFetching: fetchingChatMonitoring } = useQuery({
    queryKey: ['owner', 'chats', 'monitoring'],
    queryFn: () => apiRequest('/api/owner/chats/monitoring'),
    refetchInterval: isRealTimeEnabled ? 15000 : false, // 15 seconds for chat monitoring (critical)
    staleTime: 10000, // 10 seconds
    retry: 2
  });

  const { data: pendingDocuments, isLoading: loadingDocuments, isFetching: fetchingDocuments } = useQuery({
    queryKey: ['owner', 'admin-documents', 'pending'],
    queryFn: () => apiRequest('/api/owner/admin-documents/pending'),
    refetchInterval: isRealTimeEnabled ? 45000 : false, // 45 seconds for documents
    staleTime: 30000, // 30 seconds
    retry: 2
  });

  // Real-time status tracking
  const isAnyDataFetching = fetchingRevenue || fetchingUsers || fetchingTransactions || 
                           fetchingEscrow || fetchingChat || fetchingHealth || 
                           fetchingAllUsers || fetchingAllChats || fetchingChatMonitoring || fetchingDocuments;

  const hasAnyErrors = revenueError || usersError || transactionsError || 
                      escrowError || chatError || healthError;

  // Enhanced real-time polling setup for business intelligence
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRealTimeEnabled) {
      interval = setInterval(() => {
        // Force refresh critical data if needed
        queryClientInstance.invalidateQueries({ queryKey: ['owner', 'analytics', 'system-health'] });
        setLastUpdated(new Date());
      }, 60000); // 1 minute backup polling for critical health data
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRealTimeEnabled, queryClientInstance]);

  // Update last refresh time when any analytics data changes
  useEffect(() => {
    if (revenueAnalytics || userAnalytics || transactionAnalytics) {
      setLastUpdated(new Date());
    }
  }, [revenueAnalytics, userAnalytics, transactionAnalytics]);

  // Document review mutation
  const reviewDocumentMutation = useMutation({
    mutationFn: ({ id, status, reviewerNotes }: { id: number; status: string; reviewerNotes: string }) =>
      apiRequest(`/api/owner/admin-documents/${id}`, {
        method: 'PATCH',
        body: { status, reviewerNotes },
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'admin-documents'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'users'] });
      toast({ title: "Document reviewed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to review document", variant: "destructive" });
    }
  });

  // Chat monitoring mutation
  const updateChatMonitoringMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      apiRequest(`/api/owner/chats/monitoring/${id}`, {
        method: 'PATCH',
        body: updates,
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'chats'] });
      toast({ title: "Chat monitoring updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update chat monitoring", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const OverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card data-testid="card-revenue-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-revenue-amount">
            {revenueAnalytics ? formatCurrency(revenueAnalytics.totalRevenue) : '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            +{transactionAnalytics?.transactionsToday || 0} transactions today
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-users-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-users-count">
            {userAnalytics?.totalUsers || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            +{userAnalytics?.newUsersToday || 0} new today
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-chats-total">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-chats-count">
            {chatAnalytics?.activeChats || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {chatAnalytics?.flaggedChats || 0} flagged
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-admin-requests">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Admin Requests</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-admin-requests-count">
            {userAnalytics?.pendingAdminRequests || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingDocuments?.length || 0} documents to review
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced Revenue Analytics with predictions and insights
  const getRevenueInsights = () => {
    if (!revenueAnalytics || !revenueAnalytics.dailyReports || revenueAnalytics.dailyReports.length === 0) {
      return null;
    }
    
    const allReports = revenueAnalytics.dailyReports;
    const recentDays = allReports.slice(-7);
    const previousWeek = allReports.length >= 14 ? allReports.slice(-14, -7) : [];
    
    // Safe revenue calculations with defensive programming
    const currentWeekRevenue = recentDays.length > 0 
      ? recentDays.reduce((sum: number, report: any) => sum + (parseFloat(report.totalRevenue) || 0), 0)
      : 0;
    
    const previousWeekRevenue = previousWeek.length > 0 
      ? previousWeek.reduce((sum: number, report: any) => sum + (parseFloat(report.totalRevenue) || 0), 0)
      : 0;
    
    // Calculate weekly growth safely
    const weeklyGrowth = (previousWeekRevenue > 0 && currentWeekRevenue >= 0) 
      ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
      : 0;
    
    // Calculate average daily revenue safely
    const avgDailyRevenue = recentDays.length > 0 ? currentWeekRevenue / recentDays.length : 0;
    const projectedMonthlyRevenue = avgDailyRevenue * 30;
    
    // Find best day safely
    const bestDay = recentDays.length > 0 
      ? recentDays.reduce((max: any, report: any) => {
          const maxRevenue = parseFloat(max.totalRevenue) || 0;
          const currentRevenue = parseFloat(report.totalRevenue) || 0;
          return currentRevenue > maxRevenue ? report : max;
        }, recentDays[0])
      : null;
    
    // Calculate commission rate safely
    const totalRevenue = parseFloat(revenueAnalytics.totalRevenue) || 0;
    const totalCommission = parseFloat(revenueAnalytics.totalCommission) || 0;
    const totalCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    
    return {
      weeklyGrowth,
      avgDailyRevenue,
      projectedMonthlyRevenue,
      bestDay,
      totalCommissionRate,
      hasEnoughData: recentDays.length >= 1
    };
  };

  const revenueInsights = getRevenueInsights();

  const RevenueCharts = () => {
    if (!revenueAnalytics) return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;

    const dailyData = revenueAnalytics.dailyReports.map((report: any) => ({
      date: formatDate(report.reportDate),
      shortDate: new Date(report.reportDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(report.totalRevenue),
      commission: parseFloat(report.totalCommission),
      transactions: report.totalTransactions,
      avgPerTransaction: report.totalTransactions > 0 ? parseFloat(report.totalRevenue) / report.totalTransactions : 0
    })).slice(-30); // Last 30 days

    const totalRevenue = parseFloat(revenueAnalytics.totalRevenue) || 0;
    const categoryData = revenueAnalytics.topCategories.map((cat: any, index: number) => {
      const catRevenue = parseFloat(cat.revenue) || 0;
      const percentage = totalRevenue > 0 ? (catRevenue / totalRevenue) * 100 : 0;
      
      return {
        name: cat.category,
        value: catRevenue,
        count: cat.count,
        percentage: isFinite(percentage) ? percentage : 0,
        fill: COLORS[index % COLORS.length]
      };
    });

    return (
      <div className="space-y-6">
        {/* Revenue Insights Cards */}
        {revenueInsights && revenueInsights.hasEnoughData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-weekly-growth">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weekly Growth</p>
                    <p className={`text-2xl font-bold ${revenueInsights.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {revenueInsights.weeklyGrowth >= 0 ? '+' : ''}{revenueInsights.weeklyGrowth.toFixed(1)}%
                    </p>
                  </div>
                  {revenueInsights.weeklyGrowth >= 0 ? (
                    <ArrowUpRight className="h-8 w-8 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-daily-avg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Daily Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(revenueInsights.avgDailyRevenue)}</p>
                  </div>
                  <Calculator className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-monthly-projection">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Projection</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(revenueInsights.projectedMonthlyRevenue)}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-commission-rate">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commission Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{revenueInsights.totalCommissionRate.toFixed(1)}%</p>
                  </div>
                  <Gauge className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenue & Commission Trend (30 Days)</CardTitle>
              <TouchButton
                icon={Download}
                size="sm"
                variant="outline"
                onClick={() => {
                  const csvData = dailyData.map((d: any) => `${d.date},${d.revenue},${d.commission},${d.transactions}`).join('\n');
                  const blob = new Blob([`Date,Revenue,Commission,Transactions\n${csvData}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'revenue_data.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-export-revenue"
              >
                Export
              </TouchButton>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="shortDate" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'transactions') return [value, 'Transactions'];
                      return [formatCurrency(value as number), name === 'revenue' ? 'Revenue' : 'Commission'];
                    }}
                    labelStyle={{ color: '#000' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  <Area yAxisId="left" type="monotone" dataKey="commission" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                  <Bar yAxisId="right" dataKey="transactions" fill="#ffc658" opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Category Details */}
                <div className="space-y-2">
                  {categoryData.map((cat: any, index: number) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: cat.fill }} />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(cat.value)}</div>
                        <div className="text-xs text-gray-500">{cat.count} sales • {cat.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best Performance Insights */}
        {revenueInsights && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Best Performance Day</h4>
                  <p className="text-sm text-green-700">
                    {revenueInsights.bestDay 
                      ? `${formatDate(revenueInsights.bestDay.reportDate)} dengan revenue ${formatCurrency(revenueInsights.bestDay.totalRevenue)}`
                      : 'Tidak ada data tersedia'
                    }
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Commission Efficiency</h4>
                  <p className="text-sm text-blue-700">
                    Rate komisi {revenueInsights.totalCommissionRate.toFixed(1)}% dari total revenue
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Growth Trend</h4>
                  <p className="text-sm text-purple-700">
                    {revenueInsights.weeklyGrowth >= 0 ? '📈 Positive' : '📉 Declining'} {Math.abs(revenueInsights.weeklyGrowth).toFixed(1)}% weekly growth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const UserManagementTable = () => {
    if (!allUsers) return <div>Loading user data...</div>;

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Users Management</CardTitle>
            <TouchButton
              icon={Download}
              size="sm"
              variant="outline"
              disabled={!allUsers || allUsers.length === 0 || loadingAllUsers}
              onClick={() => {
                if (!allUsers || allUsers.length === 0) {
                  toast({ 
                    title: "No data to export", 
                    description: "There is no user data available to export",
                    variant: "destructive" 
                  });
                  return;
                }
                
                try {
                  const csvData = allUsers.map((user: UserDetail) => 
                    `${user.id},${user.username},${user.email},${user.role},${user.isVerified ? 'Yes' : 'No'},${user.walletBalance || 0},${user.totalProducts || 0},${user.totalTransactions || 0},${user.adminRequestPending ? 'Pending' : 'None'},${user.createdAt}`
                  ).join('\n');
                  const blob = new Blob([`ID,Username,Email,Role,Verified,Wallet Balance,Products,Transactions,Admin Request,Joined Date\n${csvData}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Export successful", description: `${allUsers.length} users exported to CSV` });
                } catch (error) {
                  logError('Export error', error as Error);
                  toast({ 
                    title: "Export failed", 
                    description: "Failed to export user data. Please try again.",
                    variant: "destructive" 
                  });
                }
              }}
              className="bg-nxe-primary/20 border-nxe-primary text-nxe-primary"
              data-testid="button-export-users"
            >
              {loadingAllUsers ? 'Loading...' : 'Export Users'}
            </TouchButton>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Admin Request</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((user: UserDetail) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(user.walletBalance)}</TableCell>
                  <TableCell>{user.totalProducts}</TableCell>
                  <TableCell>{user.totalTransactions}</TableCell>
                  <TableCell>
                    {user.adminRequestPending ? (
                      <Badge className="text-yellow-600 bg-yellow-100">
                        Pending ({user.documentsCount} docs)
                      </Badge>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const ChatMonitoringTable = () => {
    if (!allChats) return <div>Loading chat data...</div>;

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Chat Monitoring</CardTitle>
            <TouchButton
              icon={Download}
              size="sm"
              variant="outline"
              disabled={!allChats || allChats.length === 0 || loadingAllChats}
              onClick={() => {
                if (!allChats || allChats.length === 0) {
                  toast({ 
                    title: "No data to export", 
                    description: "There is no chat data available to export",
                    variant: "destructive" 
                  });
                  return;
                }
                
                try {
                  const csvData = allChats.map((chat: ChatDetail) => 
                    `${chat.id},"${chat.productTitle}",${chat.buyerUsername},${chat.sellerUsername},${chat.status},${chat.messageCount || 0},${chat.flaggedCount || 0},${chat.riskLevel},${chat.lastMessageAt}`
                  ).join('\n');
                  const blob = new Blob([`Chat ID,Product,Buyer,Seller,Status,Messages,Flags,Risk Level,Last Activity\n${csvData}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `chat_monitoring_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Export successful", description: `${allChats.length} chat records exported to CSV` });
                } catch (error) {
                  logError('Export error', error as Error);
                  toast({ 
                    title: "Export failed", 
                    description: "Failed to export chat data. Please try again.",
                    variant: "destructive" 
                  });
                }
              }}
              className="bg-nxe-primary/20 border-nxe-primary text-nxe-primary"
              data-testid="button-export-chats"
            >
              {loadingAllChats ? 'Loading...' : 'Export Chats'}
            </TouchButton>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allChats.map((chat: ChatDetail) => (
                <TableRow key={chat.id} data-testid={`row-chat-${chat.id}`}>
                  <TableCell className="font-medium">{chat.productTitle}</TableCell>
                  <TableCell>{chat.buyerUsername}</TableCell>
                  <TableCell>{chat.sellerUsername}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(chat.status)}>
                      {chat.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{chat.messageCount}</TableCell>
                  <TableCell>
                    {chat.flaggedCount > 0 ? (
                      <Badge variant="destructive">{chat.flaggedCount}</Badge>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelColor(chat.riskLevel)}>
                      {chat.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(chat.lastMessageAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-chat-${chat.id}`}
                      onClick={() => {
                        // Navigate to chat detail view
                        window.open(`/chat/${chat.id}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const AdminDocumentReview = () => {
    if (!pendingDocuments) return <div>Loading documents...</div>;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Verification Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending admin verification documents
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDocuments.map((doc: AdminDocument) => (
                <div key={doc.id} className="border rounded-lg p-4" data-testid={`document-${doc.id}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Document Type: {doc.documentType}</h4>
                      <p className="text-sm text-gray-600">User ID: {doc.userId}</p>
                      <p className="text-sm text-gray-600">Submitted: {formatDate(doc.createdAt)}</p>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.documentUrl, '_blank')}
                      data-testid={`button-view-document-${doc.id}`}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                    
                    {doc.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const notes = prompt("Enter review notes:");
                            if (notes !== null) {
                              reviewDocumentMutation.mutate({
                                id: doc.id,
                                status: 'approved',
                                reviewerNotes: notes
                              });
                            }
                          }}
                          data-testid={`button-approve-document-${doc.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const notes = prompt("Enter rejection reason:");
                            if (notes !== null) {
                              reviewDocumentMutation.mutate({
                                id: doc.id,
                                status: 'rejected',
                                reviewerNotes: notes
                              });
                            }
                          }}
                          data-testid={`button-reject-document-${doc.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {doc.reviewerNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Review Notes:</strong> {doc.reviewerNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const SystemHealthMetrics = () => {
    if (!systemHealth) return <div>Loading system health data...</div>;

    const healthData = [
      {
        name: 'System Load',
        value: systemHealth.systemLoad,
        unit: '%',
        color: systemHealth.systemLoad > 80 ? 'text-red-600' : systemHealth.systemLoad > 60 ? 'text-yellow-600' : 'text-green-600'
      },
      {
        name: 'Error Rate',
        value: systemHealth.errorRate,
        unit: '%',
        color: systemHealth.errorRate > 5 ? 'text-red-600' : systemHealth.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'
      },
      {
        name: 'Response Time',
        value: systemHealth.responseTime,
        unit: 'ms',
        color: systemHealth.responseTime > 200 ? 'text-red-600' : systemHealth.responseTime > 100 ? 'text-yellow-600' : 'text-green-600'
      }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>System Health Metrics</CardTitle>
              <TouchButton
                icon={Download}
                size="sm"
                variant="outline"
                disabled={!systemHealth || loadingHealth}
                onClick={() => {
                  if (!systemHealth) {
                    toast({ 
                      title: "No data to export", 
                      description: "System health data is not available yet",
                      variant: "destructive" 
                    });
                    return;
                  }
                  
                  try {
                    const systemData = {
                      timestamp: new Date().toISOString(),
                      metrics: {
                        systemLoad: systemHealth.systemLoad || 0,
                        errorRate: systemHealth.errorRate || 0,
                        responseTime: systemHealth.responseTime || 0,
                        totalUsers: systemHealth.totalUsers || 0,
                        activeUsersToday: systemHealth.activeUsersToday || 0,
                        totalProducts: systemHealth.totalProducts || 0,
                        activeProducts: systemHealth.activeProducts || 0,
                        totalTransactions: systemHealth.totalTransactions || 0,
                        transactionsToday: systemHealth.transactionsToday || 0
                      }
                    };
                    const blob = new Blob([JSON.stringify(systemData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `system_health_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: "Export successful", description: "System health metrics exported to JSON" });
                  } catch (error) {
                    logError('Export error', error as Error);
                    toast({ 
                      title: "Export failed", 
                      description: "Failed to export system health data. Please try again.",
                      variant: "destructive" 
                    });
                  }
                }}
                className="bg-nxe-primary/20 border-nxe-primary text-nxe-primary"
                data-testid="button-export-system-health"
              >
                {loadingHealth ? 'Loading...' : 'Export Metrics'}
              </TouchButton>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthData.map((metric) => (
                <div key={metric.name} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className={`text-lg font-bold ${metric.color}`}>
                    {metric.value.toFixed(1)}{metric.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{systemHealth.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{systemHealth.activeUsersToday}</div>
                <div className="text-sm text-gray-600">Active Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{systemHealth.totalProducts}</div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{systemHealth.transactionsToday}</div>
                <div className="text-sm text-gray-600">Transactions Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-owner-dashboard">Owner Dashboard</h1>
          <p className="text-gray-600">Comprehensive marketplace oversight and analytics</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            data-testid="input-date-start"
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            data-testid="input-date-end"
          />
        </div>
      </div>

      <OverviewCards />

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="chats" data-testid="tab-chats">Chats</TabsTrigger>
          <TabsTrigger value="admin-docs" data-testid="tab-admin-docs">Admin Docs</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RevenueCharts />
          <SystemHealthMetrics />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueCharts />
          
          {/* Advanced Revenue Analytics */}
          {revenueAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card data-testid="card-revenue-summary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Revenue:</span>
                      <span className="font-bold text-lg">{formatCurrency(revenueAnalytics.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Commission:</span>
                      <span className="font-bold text-green-600">{formatCurrency(revenueAnalytics.totalCommission)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Transactions:</span>
                      <span className="font-bold">{revenueAnalytics.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Transaction:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(revenueAnalytics.averageTransactionValue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="card-time-analysis">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Peak Revenue Day:</span>
                      <span className="font-medium text-sm">
                        {revenueInsights && revenueInsights.bestDay ? formatDate(revenueInsights.bestDay.reportDate) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Peak Amount:</span>
                      <span className="font-bold text-green-600">
                        {revenueInsights && revenueInsights.bestDay ? formatCurrency(revenueInsights.bestDay.totalRevenue) : '-'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Weekly Growth:</span>
                      <span className={`font-bold ${
                        revenueInsights && revenueInsights.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {revenueInsights ? `${revenueInsights.weeklyGrowth >= 0 ? '+' : ''}${revenueInsights.weeklyGrowth.toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Projection:</span>
                      <span className="font-bold text-purple-600">
                        {revenueInsights ? formatCurrency(revenueInsights.projectedMonthlyRevenue) : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-testid="card-efficiency-metrics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Efficiency Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Commission Rate:</span>
                      <span className="font-bold text-orange-600">
                        {revenueInsights ? `${revenueInsights.totalCommissionRate.toFixed(1)}%` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Daily Revenue:</span>
                      <span className="font-bold">
                        {revenueInsights ? formatCurrency(revenueInsights.avgDailyRevenue) : '-'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Revenue per Category:</span>
                      <span className="font-medium text-sm">
                        {revenueAnalytics.topCategories.length} active
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Best Category:</span>
                      <span className="font-medium text-sm">
                        {revenueAnalytics.topCategories[0]?.category || '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Data Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <TouchButton
                  icon={Download}
                  onClick={() => {
                    if (!revenueAnalytics) return;
                    const data = {
                      summary: {
                        totalRevenue: revenueAnalytics.totalRevenue,
                        totalCommission: revenueAnalytics.totalCommission,
                        totalTransactions: revenueAnalytics.totalTransactions,
                        averageTransactionValue: revenueAnalytics.averageTransactionValue
                      },
                      dailyReports: revenueAnalytics.dailyReports,
                      topCategories: revenueAnalytics.topCategories,
                      exportedAt: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `revenue_report_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-export-full-report"
                >
                  Export Full Report (JSON)
                </TouchButton>
                
                <TouchButton
                  icon={FileTextIcon}
                  variant="outline"
                  onClick={() => {
                    if (!revenueAnalytics) return;
                    const csvData = revenueAnalytics.dailyReports.map((report: any) => 
                      `${report.reportDate},${report.totalRevenue},${report.totalCommission},${report.totalTransactions}`
                    ).join('\n');
                    const blob = new Blob([`Date,Revenue,Commission,Transactions\n${csvData}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `daily_revenue_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-export-daily-csv"
                >
                  Export Daily Data (CSV)
                </TouchButton>
                
                <TouchButton
                  icon={PieChartIcon}
                  variant="outline"
                  onClick={() => {
                    if (!revenueAnalytics) return;
                    const csvData = revenueAnalytics.topCategories.map((cat: any) => 
                      `${cat.category},${cat.revenue},${cat.count}`
                    ).join('\n');
                    const blob = new Blob([`Category,Revenue,Count\n${csvData}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `category_revenue_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-export-category-csv"
                >
                  Export Categories (CSV)
                </TouchButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagementTable />
        </TabsContent>

        <TabsContent value="chats" className="space-y-6">
          <ChatMonitoringTable />
        </TabsContent>

        <TabsContent value="admin-docs" className="space-y-6">
          <AdminDocumentReview />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SystemHealthMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
}