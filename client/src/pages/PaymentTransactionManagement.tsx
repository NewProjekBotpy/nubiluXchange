import { useState, useCallback, useMemo } from "react";
import { logDebug } from '@/lib/logger';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  RefreshCw,
  Download,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Wallet,
  Building,
  Globe,
  Shield,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Zap,
  TrendingUpIcon,
  Ban,
  Play,
  Pause,
  Settings,
  FileText,
  Coins
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import ResponsiveDataList, { DataListItem } from "@/components/admin/ResponsiveDataList";
import { format } from "date-fns";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import type { PaymentStats, TransactionWithDetails, WalletTransactionWithUser, FraudAlert } from "@shared/schema";

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316'];

export default function PaymentTransactionManagement() {
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [fraudMonitoringEnabled, setFraudMonitoringEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "payments"] });
    }
  });

  // Payment statistics
  const { data: paymentStats, isLoading: loadingStats } = useQuery<PaymentStats>({
    queryKey: ["/api/admin/payments/stats"],
    refetchInterval: 30000,
  });

  // Transactions query
  const { data: transactions, isLoading: loadingTransactions } = useQuery<{transactions: TransactionWithDetails[], total: number}>({
    queryKey: ["/api/admin/payments/transactions", { search: searchTerm, status: statusFilter, method: paymentMethodFilter, page: currentPage, limit: pageSize }],
  });

  // Wallet transactions query
  const { data: walletTransactions, isLoading: loadingWalletTransactions } = useQuery<WalletTransactionWithUser[]>({
    queryKey: ["/api/admin/payments/wallet-transactions", { search: searchTerm, status: statusFilter }],
  });

  // Fraud alerts query
  const { data: fraudAlerts, isLoading: loadingFraudAlerts } = useQuery<FraudAlert[]>({
    queryKey: ["/api/admin/payments/fraud-alerts"],
    refetchInterval: 15000,
    enabled: fraudMonitoringEnabled,
  });

  // Revenue analytics query
  const { data: revenueAnalytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["/api/admin/payments/analytics", { start: dateRange.start, end: dateRange.end }],
  });

  // Mutations
  const refundTransactionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiRequest(`/api/admin/payments/transactions/${id}/refund`, { 
        method: "POST", 
        body: { reason }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction refunded successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refund transaction",
        variant: "destructive",
      });
    },
  });

  const retryTransactionMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/payments/transactions/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction retry initiated",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retry transaction",
        variant: "destructive",
      });
    },
  });

  const resolveFraudAlertMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/payments/fraud-alerts/${id}/resolve`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fraud alert resolved",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "payments", "fraud-alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve fraud alert",
        variant: "destructive",
      });
    },
  });

  const toggleFraudMonitoringMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("/api/admin/payments/fraud-monitoring", { 
        method: "POST", 
        body: { enabled }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Fraud monitoring ${fraudMonitoringEnabled ? 'disabled' : 'enabled'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fraud monitoring",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      refunded: "outline"
    } as const;
    
    return {
      text: status.charAt(0).toUpperCase() + status.slice(1),
      variant: variants[status as keyof typeof variants] || "secondary"
    };
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: "text-blue-400",
      medium: "text-yellow-400", 
      high: "text-orange-400",
      critical: "text-red-400"
    };
    return colors[severity as keyof typeof colors] || "text-gray-400";
  };

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (amount === null || amount === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), "MMM dd, yyyy HH:mm");
    } catch {
      return 'Invalid Date';
    }
  };

  // Data for lists
  const transactionItems: DataListItem[] = useMemo(() => transactions?.transactions?.map((transaction) => ({
    id: transaction.id,
    title: `Transaction #${transaction.id}`,
    subtitle: `${transaction.buyer?.username} → ${transaction.seller?.username}`,
    badge: getStatusBadge(transaction.status),
    metadata: [
      { label: "Amount", value: formatCurrency(transaction.amount) },
      { label: "Method", value: transaction.paymentMethod || "N/A" },
      { label: "Date", value: formatDate(transaction.createdAt) },
      { label: "Commission", value: formatCurrency(transaction.commission) },
    ],
    actions: [
      {
        label: "View Details",
        onClick: () => {
          setSelectedTransaction(transaction);
          setShowTransactionDetails(true);
        },
        icon: Eye,
      },
      ...(transaction.status === "completed" ? [{
        label: "Refund",
        onClick: () => refundTransactionMutation.mutate({ 
          id: transaction.id, 
          reason: "Admin initiated refund" 
        }),
        variant: "destructive" as const,
        icon: XCircle,
      }] : []),
      ...(transaction.status === "failed" ? [{
        label: "Retry",
        onClick: () => retryTransactionMutation.mutate(transaction.id),
        icon: RefreshCw,
      }] : []),
    ],
  })) || [], [transactions, refundTransactionMutation, retryTransactionMutation]);

  const walletTransactionItems: DataListItem[] = useMemo(() => walletTransactions?.map((transaction) => ({
    id: transaction.id,
    title: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} #${transaction.id}`,
    subtitle: transaction.user?.username || "Unknown User",
    badge: getStatusBadge(transaction.status),
    metadata: [
      { label: "Amount", value: formatCurrency(transaction.amount) },
      { label: "Type", value: transaction.type || "N/A" },
      { label: "Date", value: formatDate(transaction.createdAt) },
      { label: "Description", value: transaction.description || "-" },
    ],
    actions: [
      {
        label: "View Details",
        onClick: () => {
          // Handle wallet transaction details
        },
        icon: Eye,
      },
    ],
  })) || [], [walletTransactions]);

  const fraudAlertItems: DataListItem[] = useMemo(() => fraudAlerts?.map((alert) => ({
    id: alert.id,
    title: `Fraud Alert #${alert.id}`,
    subtitle: alert.message,
    badge: {
      text: alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1),
      variant: alert.severity === "critical" ? "destructive" : 
               alert.severity === "high" ? "destructive" :
               alert.severity === "medium" ? "secondary" : "outline"
    },
    metadata: [
      { label: "Type", value: alert.title || "Unknown" },
      { label: "Transaction", value: `#${alert.transactionId || 'N/A'}` },
      { label: "Date", value: formatDate(alert.createdAt) },
      { label: "Status", value: alert.status === "resolved" ? "Resolved" : "Open", highlight: alert.status !== "resolved" },
    ],
    actions: [
      {
        label: "View Transaction",
        onClick: () => {
          // Fetch transaction details for fraud alert
          logDebug(`View transaction ${alert.transactionId}`);
        },
        icon: Eye,
      },
      ...((alert.status !== "resolved") ? [{
        label: "Resolve",
        onClick: () => resolveFraudAlertMutation.mutate(alert.id),
        icon: CheckCircle,
      }] : []),
    ],
  })) || [], [fraudAlerts, resolveFraudAlertMutation]);

  // Stats cards
  const statsCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(paymentStats?.totalRevenue || 0),
      icon: DollarSign,
      trend: { value: `${paymentStats?.weeklyGrowth || 0}%`, isPositive: (paymentStats?.weeklyGrowth || 0) > 0 },
    },
    {
      title: "Total Transactions",
      value: paymentStats?.totalTransactions || 0,
      icon: CreditCard,
      trend: { value: "+12%", isPositive: true },
    },
    {
      title: "Pending Transactions",
      value: paymentStats?.pendingTransactions || 0,
      icon: Clock,
      trend: { value: "-5%", isPositive: true },
    },
    {
      title: "Fraud Alerts",
      value: fraudAlerts?.filter(alert => alert.status !== "resolved").length || 0,
      icon: Shield,
      trend: { value: "-15%", isPositive: true },
    },
  ];

  return (
    <div className="min-h-screen bg-nxe-dark">
      <AdminNavbar currentTab="payments" />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" data-testid="text-page-title">
              Payment & Transaction Management
            </h1>
            <p className="text-gray-400">Monitor and manage all platform payments and transactions</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClientInstance.invalidateQueries({ queryKey: ["admin", "payments"] });
              }}
              className="border-nxe-border hover:bg-nxe-primary/10"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                // Handle export functionality
              }}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Payment Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-fit bg-nxe-card">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="wallets" data-testid="tab-wallets">Wallets</TabsTrigger>
            <TabsTrigger value="fraud" data-testid="tab-fraud">Fraud Monitor</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((stat, index) => (
                <Card key={index} className="bg-nxe-card border-nxe-border" data-testid={`card-stat-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        {stat.trend && (
                          <p className={`text-xs ${stat.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.trend.value} from last week
                          </p>
                        )}
                      </div>
                      <stat.icon className="h-8 w-8 text-nxe-accent" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Methods Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Top Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentStats?.topPaymentMethods?.map((method, index) => (
                      <div key={method.method} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-white capitalize">{method.method}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(method.amount)}</p>
                          <p className="text-gray-400 text-sm">{method.count} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Fraud Monitoring</CardTitle>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fraud-monitoring" className="text-gray-400">
                      Real-time fraud detection
                    </Label>
                    <Switch
                      id="fraud-monitoring"
                      checked={fraudMonitoringEnabled}
                      onCheckedChange={(checked) => {
                        setFraudMonitoringEnabled(checked);
                        toggleFraudMonitoringMutation.mutate(checked);
                      }}
                      data-testid="switch-fraud-monitoring"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Alerts</span>
                      <span className="text-white font-medium">
                        {fraudAlerts?.filter(alert => alert.status !== "resolved").length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Fraudulent Transactions</span>
                      <span className="text-white font-medium">
                        {paymentStats?.fraudulentTransactions || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Chargeback Rate</span>
                      <span className="text-white font-medium">
                        {paymentStats?.chargebackRate || 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-card border-nxe-border text-white"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-method-filter">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveDataList
              items={transactionItems}
              title="Transactions"
              searchable={false}
              isLoading={loadingTransactions}
              emptyMessage="No transactions found"
            />

            {/* Pagination */}
            {transactions && transactions.total > pageSize && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border-nxe-border"
                  data-testid="button-prev-page"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-white px-4">
                  Page {currentPage} of {Math.ceil(transactions.total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(Math.ceil(transactions.total / pageSize), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(transactions.total / pageSize)}
                  className="border-nxe-border"
                  data-testid="button-next-page"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search wallet transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-card border-nxe-border text-white"
                  data-testid="input-search-wallet"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-wallet-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveDataList
              items={walletTransactionItems}
              title="Wallet Transactions"
              searchable={false}
              isLoading={loadingWalletTransactions}
              emptyMessage="No wallet transactions found"
            />
          </TabsContent>

          {/* Fraud Monitor Tab */}
          <TabsContent value="fraud" className="space-y-6">
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Fraud Detection Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Real-time Monitoring</Label>
                    <p className="text-gray-400 text-sm">Monitor transactions for suspicious patterns</p>
                  </div>
                  <Switch
                    checked={fraudMonitoringEnabled}
                    onCheckedChange={(checked) => {
                      setFraudMonitoringEnabled(checked);
                      toggleFraudMonitoringMutation.mutate(checked);
                    }}
                    data-testid="switch-realtime-monitoring"
                  />
                </div>
              </CardContent>
            </Card>

            <ResponsiveDataList
              items={fraudAlertItems}
              title="Fraud Alerts"
              searchable={false}
              isLoading={loadingFraudAlerts}
              emptyMessage="No fraud alerts"
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(revenueAnalytics as any)?.daily || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }} 
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-nxe-card border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(revenueAnalytics as any)?.daily || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="transactions" fill="#06b6d4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Transaction Details Dialog */}
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="bg-nxe-card border-nxe-border text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>
                Complete information about transaction #{selectedTransaction?.id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTransaction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Transaction ID</Label>
                    <p className="text-white font-medium">#{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Status</Label>
                    <Badge variant={getStatusBadge(selectedTransaction.status).variant as any}>
                      {getStatusBadge(selectedTransaction.status).text}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-400">Amount</Label>
                    <p className="text-white font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Commission</Label>
                    <p className="text-white font-medium">{formatCurrency(selectedTransaction.commission)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Payment Method</Label>
                    <p className="text-white font-medium">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Created</Label>
                    <p className="text-white font-medium">
                      {formatDateTime(selectedTransaction.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400">Buyer</Label>
                    <p className="text-white">{selectedTransaction.buyer?.username}</p>
                    <p className="text-gray-400 text-sm">{selectedTransaction.buyer?.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Seller</Label>
                    <p className="text-white">{selectedTransaction.seller?.username}</p>
                    <p className="text-gray-400 text-sm">{selectedTransaction.seller?.email}</p>
                  </div>
                  {selectedTransaction.product && (
                    <div>
                      <Label className="text-gray-400">Product</Label>
                      <p className="text-white">{selectedTransaction.product.title}</p>
                      <p className="text-gray-400 text-sm">{selectedTransaction.product.category}</p>
                    </div>
                  )}
                </div>

                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <Label className="text-gray-400">Metadata</Label>
                    <pre className="text-xs text-gray-300 bg-gray-800 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}