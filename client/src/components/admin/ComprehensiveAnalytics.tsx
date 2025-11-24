import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Package, ShoppingCart, Users, AlertCircle, BarChart3, Trophy, Inbox } from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface AnalyticsData {
  revenue: {
    daily: Array<{ date: string; amount: number; transactions: number; commission: number }>;
    totalRevenue: number;
    growth: number;
    avgPerTransaction: number;
  };
  productPosting: {
    daily: Array<{ date: string; total: number; [key: string]: any }>;
    activeVsSold: { active: number; sold: number };
    topCategories: Array<{ name: string; count: number }>;
  };
  purchases: {
    daily: Array<{ date: string; purchases: number; uniqueBuyers: number; totalValue: number; avgOrderValue: number }>;
    repeatPurchaseRate: number;
  };
  dropship: {
    activeSellers: number;
    productsDropshipped: number;
    revenue: number;
    conversionRate: number;
  };
  reports: {
    daily: Array<{ date: string; total: number; [key: string]: any }>;
    resolutionRate: number;
    avgResolutionTime: number;
  };
  platformGrowth: {
    daily: Array<{ date: string; newUsers: number; newSellers: number; newAdmins: number }>;
  };
  transactionDistribution: {
    ranges: Array<{ range: string; count: number }>;
    avgValue: number;
    medianValue: number;
  };
  topPerformers: {
    sellers: Array<{ id: number; name: string; revenue: number; sales: number; products: number }>;
    products: Array<{ id: number; name: string; category: string; revenue: number; sales: number }>;
    categories: Array<{ name: string; revenue: number; sales: number }>;
  };
}

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  categories: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316']
};

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-nxe-card border border-nxe-surface p-3 rounded-lg shadow-lg">
        <p className="text-white text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ComprehensiveAnalytics() {
  const [period, setPeriod] = useState('30');
  const [renderTime, setRenderTime] = useState<number>(0);

  const { data: analyticsData, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: [`/api/admin/analytics/comprehensive?period=${period}`],
    refetchInterval: 300000,
    staleTime: 60000,
  });

  // Performance monitoring hook
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setRenderTime(duration);
    };
  }, [analyticsData]);

  if (error) {
    return (
      <Card className="bg-nxe-card border-nxe-surface mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Failed to load analytics data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-nxe-card border-nxe-surface mt-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comprehensive Analytics & Growth Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-[350px] bg-nxe-surface" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no data available
  if (!analyticsData || 
      (!analyticsData.revenue?.daily?.length && 
       !analyticsData.productPosting?.daily?.length &&
       !analyticsData.purchases?.daily?.length)) {
    return (
      <Card className="bg-nxe-card border-nxe-surface mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No Analytics Data Available
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              Analytics data will appear here once there are transactions, products, or user activities on the platform.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-nxe-card border-nxe-surface mt-6" data-testid="card-comprehensive-analytics">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comprehensive Analytics & Growth Metrics
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Complete platform performance analysis and trends
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px] bg-nxe-surface border-nxe-surface text-white" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nxe-card border-nxe-surface">
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-1.5 pt-0 xs:p-3 xs:pt-0 sm:p-4 sm:pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-4 lg:gap-6">
          {/* 1. Revenue Analytics */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-revenue">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                    <span className="font-semibold">Revenue</span>
                  </span>
                  <span className="text-green-400 font-bold text-[11px] sm:text-sm">{formatIDR(analyticsData.revenue.totalRevenue)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.revenue.daily.slice(-7)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#9ca3af" tick={{ fontSize: 11 }} height={22} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} tickFormatter={(value) => `${(value/1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip formatter={formatIDR} />} />
                  <Area type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCommission)" />
                </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 2. Product Posting Trends */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-products">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                    <span className="font-semibold">Products</span>
                  </span>
                  <span className="text-blue-400 font-bold text-[11px] sm:text-sm">{analyticsData.productPosting.activeVsSold.active}/{analyticsData.productPosting.activeVsSold.sold}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.productPosting.daily.slice(-7)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#9ca3af" tick={{ fontSize: 11 }} height={22} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 3. Purchase Activity */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-purchases">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                    <span className="font-semibold">Purchases</span>
                  </span>
                  <span className="text-purple-400 font-bold text-[11px] sm:text-sm">{analyticsData.purchases.repeatPurchaseRate.toFixed(1)}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.purchases.daily.slice(-7)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#9ca3af" tick={{ fontSize: 11 }} height={22} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="purchases" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 4. Dropship/Reseller Activity */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-dropship">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400" />
                    <span className="font-semibold">Sellers</span>
                  </span>
                  <span className="text-cyan-400 font-bold text-[11px] sm:text-sm">{analyticsData.dropship.activeSellers}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={[
                      { name: 'Products', value: analyticsData.dropship.productsDropshipped },
                      { name: 'Sellers', value: analyticsData.dropship.activeSellers * 10 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="75%"
                    paddingAngle={5}
                    dataKey="value"
                    strokeWidth={3}
                  >
                    <Cell fill="#06b6d4" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 5. User Reports */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-reports">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                    <span className="font-semibold">Reports</span>
                  </span>
                  <span className="text-green-400 font-bold text-[11px] sm:text-sm">{analyticsData.reports.resolutionRate.toFixed(1)}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.reports.daily.slice(-7)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#9ca3af" tick={{ fontSize: 11 }} height={22} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={false} />
                </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 6. Platform Growth */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-growth">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                    <span className="font-semibold">Growth</span>
                  </span>
                  <span className="text-green-400 font-bold text-[11px] sm:text-sm">{analyticsData.platformGrowth.daily.slice(-7).reduce((sum, d) => sum + d.newUsers, 0)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.platformGrowth.daily.slice(-7)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={formatShortDate} stroke="#9ca3af" tick={{ fontSize: 11 }} height={22} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 7. Transaction Value Distribution */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-distribution">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center justify-between">
                  <span className="font-semibold">Transaction</span>
                  <span className="text-blue-400 font-bold text-[11px] sm:text-sm">{formatIDR(analyticsData.transactionDistribution.avgValue)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.transactionDistribution.ranges.slice(0, 5)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <XAxis dataKey="range" stroke="#9ca3af" tick={{ fontSize: 9 }} height={25} angle={-20} textAnchor="end" />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </div>
          </Card>

          {/* 8. Top Performers */}
          <Card className="bg-nxe-surface border-nxe-border aspect-video lg:aspect-auto" data-testid="chart-performers">
            <div className="h-full flex flex-col">
              <CardHeader className="p-1.5 pb-0 sm:p-4 flex-shrink-0">
                <CardTitle className="text-white text-[11px] sm:text-sm lg:text-base flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                  <span className="font-semibold">Top Sellers</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-1 sm:p-4 sm:pt-2 flex-1 flex flex-col justify-center min-h-0">
                <div className="space-y-1.5">
                  {analyticsData.topPerformers.sellers.slice(0, 3).map((seller, i) => {
                    const rankColors = [
                      { bg: 'bg-gradient-to-r from-yellow-500/25 to-yellow-600/15', border: 'border-yellow-500/40', medal: '🥇', text: 'text-yellow-400' },
                      { bg: 'bg-gradient-to-r from-gray-400/25 to-gray-500/15', border: 'border-gray-400/40', medal: '🥈', text: 'text-gray-300' },
                      { bg: 'bg-gradient-to-r from-orange-600/25 to-orange-700/15', border: 'border-orange-600/40', medal: '🥉', text: 'text-orange-400' }
                    ];
                    const rank = rankColors[i] || rankColors[2];
                    
                    return (
                      <div 
                        key={seller.id} 
                        className={`flex items-center justify-between ${rank.bg} border ${rank.border} p-1.5 sm:p-2 rounded-lg`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-base sm:text-lg">{rank.medal}</span>
                          <span className="text-[11px] sm:text-xs text-white font-semibold truncate">{seller.name}</span>
                        </div>
                        <span className={`text-[10px] sm:text-xs font-bold ${rank.text} truncate ml-1`}>
                          {formatIDR(seller.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
