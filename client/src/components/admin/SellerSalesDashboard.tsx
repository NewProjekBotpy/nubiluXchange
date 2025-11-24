import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  Star,
  Eye,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  activeProducts: number;
  totalViews: number;
  conversionRate: number;
  topSellingProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    orders: number;
  }>;
  salesTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  orderStatus: {
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
}

interface SellerSalesDashboardProps {
  sellerId?: number;
  hasAdminAccess?: boolean;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function SellerSalesDashboard({ sellerId, hasAdminAccess = false }: SellerSalesDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders'>('revenue');

  // Fetch sales statistics
  const { data: stats, isLoading, refetch } = useQuery<SalesStats>({
    queryKey: ['/api/seller/sales/stats', timeRange, sellerId],
    queryFn: () => {
      const params = new URLSearchParams({ timeRange });
      if (sellerId) params.append('sellerId', sellerId.toString());
      return apiRequest(`/api/seller/sales/stats?${params}`);
    },
    enabled: true,
    refetchInterval: 60000 // Refresh every minute
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  const revenueGrowth = useMemo(() => {
    if (!stats?.salesTrend || stats.salesTrend.length < 2) return 0;
    const latest = stats.salesTrend[stats.salesTrend.length - 1].revenue;
    const previous = stats.salesTrend[stats.salesTrend.length - 2].revenue;
    return previous > 0 ? ((latest - previous) / previous) * 100 : 0;
  }, [stats]);

  const ordersGrowth = useMemo(() => {
    if (!stats?.salesTrend || stats.salesTrend.length < 2) return 0;
    const latest = stats.salesTrend[stats.salesTrend.length - 1].orders;
    const previous = stats.salesTrend[stats.salesTrend.length - 2].orders;
    return previous > 0 ? ((latest - previous) / previous) * 100 : 0;
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <BarChart3 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Sales Dashboard</h2>
            <p className="text-sm text-gray-400">Real-time sales analytics and performance insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-40 bg-nxe-surface border-nxe-border text-white" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nxe-surface border-nxe-border">
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            data-testid="button-refresh-sales"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-white mb-1">
                  {isLoading ? '—' : formatCurrency(stats?.totalRevenue || 0)}
                </p>
                <div className="flex items-center gap-1">
                  {revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`text-xs ${revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Orders</p>
                <p className="text-xl font-bold text-white mb-1">
                  {isLoading ? '—' : formatNumber(stats?.totalOrders || 0)}
                </p>
                <div className="flex items-center gap-1">
                  {ordersGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`text-xs ${ordersGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(ordersGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Avg Order Value</p>
                <p className="text-xl font-bold text-white mb-1">
                  {isLoading ? '—' : formatCurrency(stats?.averageOrderValue || 0)}
                </p>
                <p className="text-xs text-gray-400">Per transaction</p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Conversion Rate</p>
                <p className="text-xl font-bold text-white mb-1">
                  {isLoading ? '—' : `${(stats?.conversionRate || 0).toFixed(2)}%`}
                </p>
                <p className="text-xs text-gray-400">
                  {stats?.totalViews || 0} views
                </p>
              </div>
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-nxe-surface">
          <TabsTrigger value="overview" className="data-[state=active]:bg-nxe-primary">
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-nxe-primary">
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-nxe-primary">
            Orders
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-nxe-primary">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Sales Trend Chart */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Sales Trend</CardTitle>
                  <CardDescription className="text-gray-400">
                    {getTimeRangeLabel()} performance overview
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedMetric === 'revenue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMetric('revenue')}
                  >
                    Revenue
                  </Button>
                  <Button
                    variant={selectedMetric === 'orders' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMetric('orders')}
                  >
                    Orders
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={stats?.salesTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    {selectedMetric === 'revenue' ? (
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                        name="Revenue (IDR)"
                      />
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                        name="Orders"
                      />
                    )}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Revenue by Category</CardTitle>
                <CardDescription className="text-gray-400">
                  Sales distribution across product categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={stats?.revenueByCategory || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {stats?.revenueByCategory?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Order Status Distribution</CardTitle>
                <CardDescription className="text-gray-400">
                  Current status of all orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500' },
                    { status: 'processing', label: 'Processing', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500' },
                    { status: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500' },
                    { status: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500' }
                  ].map(({ status, label, icon: Icon, color, bg }) => {
                    const count = stats?.orderStatus?.[status as keyof typeof stats.orderStatus] || 0;
                    const total = Object.values(stats?.orderStatus || {}).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className="text-sm text-white">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium">{count}</span>
                            <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${bg} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Top Selling Products</CardTitle>
              <CardDescription className="text-gray-400">
                Best performing products in {getTimeRangeLabel().toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topSellingProducts?.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-nxe-dark rounded-lg border border-nxe-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          index === 1 ? 'bg-gray-500/20 text-gray-400' :
                          index === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'}
                      `}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sales} sales</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{formatCurrency(product.revenue)}</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">Orders Overview</CardTitle>
              <CardDescription className="text-gray-400">
                Detailed breakdown of order metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats?.orderStatus || {}).map(([status, count]) => {
                  const config = {
                    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
                    processing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
                    cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' }
                  }[status] || { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20' };

                  const Icon = config.icon;

                  return (
                    <div key={status} className={`p-4 rounded-lg border border-nxe-border ${config.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <span className="text-sm text-white capitalize">{status}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-gray-400 mt-1">orders</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-green-400 font-medium mb-1">Revenue Growth</p>
                  <p className="text-xs text-gray-300">
                    Your revenue has {revenueGrowth >= 0 ? 'increased' : 'decreased'} by{' '}
                    <span className="font-bold">{Math.abs(revenueGrowth).toFixed(1)}%</span> compared to the previous period.
                  </p>
                </div>

                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-400 font-medium mb-1">Conversion Rate</p>
                  <p className="text-xs text-gray-300">
                    {(stats?.conversionRate || 0).toFixed(2)}% of visitors are converting to customers.
                    {stats?.conversionRate && stats.conversionRate < 5 && (
                      <span className="block mt-1 text-yellow-400">
                        Consider optimizing product descriptions and images.
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-purple-400 font-medium mb-1">Average Order Value</p>
                  <p className="text-xs text-gray-300">
                    Customers spend an average of {formatCurrency(stats?.averageOrderValue || 0)} per order.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.conversionRate && stats.conversionRate < 3 && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 font-medium mb-1">⚠️ Low Conversion Rate</p>
                    <p className="text-xs text-gray-300">
                      Your conversion rate is below average. Consider improving product photos and descriptions.
                    </p>
                  </div>
                )}

                {stats?.orderStatus?.cancelled && stats.orderStatus.cancelled > (stats?.totalOrders || 0) * 0.1 && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium mb-1">⚠️ High Cancellation Rate</p>
                    <p className="text-xs text-gray-300">
                      More than 10% of orders are cancelled. Review your order processing and customer communication.
                    </p>
                  </div>
                )}

                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium mb-1">✅ Product Performance</p>
                  <p className="text-xs text-gray-300">
                    {stats?.topSellingProducts?.[0]?.name} is your best seller. Consider promoting similar products.
                  </p>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-blue-400 font-medium mb-1">💡 Growth Opportunity</p>
                  <p className="text-xs text-gray-300">
                    Focus on categories with high revenue to maximize your earnings potential.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
