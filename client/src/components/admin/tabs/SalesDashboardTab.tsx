import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CardSkeleton from "@/components/admin/CardSkeleton";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  RefreshCw,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface SalesDashboardTabProps {
  hasAdminAccess?: boolean;
}

interface SalesStats {
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  totalTransactions: number;
  transactionsToday: number;
  transactionsThisWeek: number;
  transactionsThisMonth: number;
  averageOrderValue: number;
  topProducts: Array<{
    id: number;
    name: string;
    category: string;
    revenue: number;
    sales: number;
  }>;
  recentTransactions: Array<{
    id: number;
    amount: number;
    status: string;
    createdAt: string;
    buyerUsername: string;
    productTitle: string;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export default function SalesDashboardTab({ hasAdminAccess = true }: SalesDashboardTabProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  const { data: salesStats, isLoading, error, refetch } = useQuery<SalesStats>({
    queryKey: ['/api/admin/sales/stats'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const revenueData = useMemo(() => {
    if (!salesStats?.dailyRevenue) return [];
    return salesStats.dailyRevenue.map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [salesStats]);

  const topProductsData = useMemo(() => {
    if (!salesStats?.topProducts) return [];
    return salesStats.topProducts.slice(0, 5);
  }, [salesStats]);

  const getRevenueByTimeRange = () => {
    if (!salesStats) return 0;
    switch (timeRange) {
      case 'today': return salesStats.revenueToday;
      case 'week': return salesStats.revenueThisWeek;
      case 'month': return salesStats.revenueThisMonth;
      default: return 0;
    }
  };

  const getTransactionsByTimeRange = () => {
    if (!salesStats) return 0;
    switch (timeRange) {
      case 'today': return salesStats.transactionsToday;
      case 'week': return salesStats.transactionsThisWeek;
      case 'month': return salesStats.transactionsThisMonth;
      default: return 0;
    }
  };

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Access Denied"
        description="You don't have permission to access the sales dashboard."
      />
    );
  }

  if (isLoading) {
    return <CardSkeleton variant="card" count={4} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading Sales Data"
        description="Failed to load sales statistics. Please try again."
        action={{
          label: "Retry",
          onClick: () => refetch()
        }}
      />
    );
  }

  if (!salesStats) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No Sales Data Available"
        description="There is no sales data to display at this time."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Sales Dashboard</h2>
            <p className="text-sm text-gray-400">Revenue and transaction analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-nxe-surface rounded-lg p-1">
            <Button
              size="sm"
              variant={timeRange === 'today' ? 'default' : 'ghost'}
              onClick={() => setTimeRange('today')}
              className={timeRange === 'today' ? 'bg-nxe-primary' : ''}
              data-testid="button-timerange-today"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              onClick={() => setTimeRange('week')}
              className={timeRange === 'week' ? 'bg-nxe-primary' : ''}
              data-testid="button-timerange-week"
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              onClick={() => setTimeRange('month')}
              className={timeRange === 'month' ? 'bg-nxe-primary' : ''}
              data-testid="button-timerange-month"
            >
              Month
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-sales"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-total-revenue">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : `Rp ${(getRevenueByTimeRange() || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This week' : 'This month'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-transactions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : getTransactionsByTimeRange()}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This week' : 'This month'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-average-order">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : `Rp ${(salesStats?.averageOrderValue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-gray-400 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-total-sales">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isLoading ? '...' : `Rp ${(salesStats?.totalRevenue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Revenue Trend (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse space-y-3 w-full">
                <div className="h-4 bg-nxe-surface rounded w-3/4"></div>
                <div className="h-32 bg-nxe-surface rounded"></div>
              </div>
            </div>
          ) : revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                  name="Revenue"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No revenue data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-400" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-nxe-surface rounded w-3/4"></div>
                    <div className="h-3 bg-nxe-surface rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : topProductsData.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {topProductsData.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-nxe-surface rounded-lg"
                      data-testid={`product-item-${product.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <p className="font-medium text-white truncate">{product.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">
                          Rp {product.revenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">{product.sales} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-nxe-surface border-nxe-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-nxe-surface rounded w-3/4"></div>
                    <div className="h-3 bg-nxe-surface rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : salesStats?.recentTransactions && salesStats.recentTransactions.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {salesStats.recentTransactions.slice(0, 10).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-nxe-surface rounded-lg"
                      data-testid={`transaction-item-${transaction.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{transaction.productTitle}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          By {transaction.buyerUsername} • {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          Rp {transaction.amount.toLocaleString()}
                        </p>
                        <Badge
                          variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>No recent transactions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
