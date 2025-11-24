import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  CreditCard,
  ShoppingCart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

interface FinancialMetrics {
  balance: {
    current: string;
    change: number;
    changeAmount: string;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  spending: {
    thisMonth: string;
    lastMonth: string;
    change: number;
  };
  earnings: {
    thisMonth: string;
    lastMonth: string;
    change: number;
  };
}

interface TransactionTrend {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export default function FinancialDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch financial metrics
  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['financial-metrics', timeRange],
    queryFn: () => apiRequest(`/api/wallet/metrics?range=${timeRange}`),
    staleTime: 30000
  });

  // Fetch transaction trends
  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['transaction-trends', timeRange],
    queryFn: () => apiRequest(`/api/wallet/trends?range=${timeRange}`),
    staleTime: 30000
  });

  // Fetch category breakdown
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['spending-categories', timeRange],
    queryFn: () => apiRequest(`/api/wallet/categories?range=${timeRange}`),
    staleTime: 30000
  });

  // Real-time refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMetrics();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [refetchMetrics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMetrics()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(numAmount);
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const MetricsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card data-testid="card-current-balance">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-balance-amount">
            {metrics ? formatCurrency(metrics.balance.current) : '...'}
          </div>
          {metrics && (
            <div className="flex items-center mt-1">
              {getChangeIcon(metrics.balance.change)}
              <span className={`text-sm font-medium ml-1 ${getChangeColor(metrics.balance.change)}`}>
                {metrics.balance.change >= 0 ? '+' : ''}{metrics.balance.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatCurrency(metrics.balance.changeAmount)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-monthly-spending">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-spending-amount">
            {metrics ? formatCurrency(metrics.spending.thisMonth) : '...'}
          </div>
          {metrics && (
            <div className="flex items-center mt-1">
              {getChangeIcon(metrics.spending.change)}
              <span className={`text-sm font-medium ml-1 ${getChangeColor(metrics.spending.change)}`}>
                {metrics.spending.change >= 0 ? '+' : ''}{metrics.spending.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-monthly-earnings">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-earnings-amount">
            {metrics ? formatCurrency(metrics.earnings.thisMonth) : '...'}
          </div>
          {metrics && (
            <div className="flex items-center mt-1">
              {getChangeIcon(metrics.earnings.change)}
              <span className={`text-sm font-medium ml-1 ${getChangeColor(metrics.earnings.change)}`}>
                {metrics.earnings.change >= 0 ? '+' : ''}{metrics.earnings.change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs last month</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-transactions-status">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-transactions-total">
            {metrics ? metrics.transactions.total : '...'}
          </div>
          {metrics && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                {metrics.transactions.completed}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                {metrics.transactions.pending}
              </Badge>
              {metrics.transactions.failed > 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
                  {metrics.transactions.failed}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const TrendsChart = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Trends
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="button-refresh-trends"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  data-testid={`button-range-${range}`}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingTrends ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 h-full w-full rounded"></div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    formatCurrency(value),
                    name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Balance'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1" 
                  stroke="#00C49F" 
                  fill="#00C49F" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2" 
                  stroke="#FF8042" 
                  fill="#FF8042" 
                  fillOpacity={0.6}
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CategoryBreakdown = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Spending by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse bg-gray-200 h-full w-full rounded"></div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categories?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories?.map((category: any, index: number) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(category.amount)}</div>
                  <div className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loadingMetrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="title-financial-dashboard">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your money flow and financial insights
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString('id-ID')}
        </Badge>
      </div>

      <MetricsCards />
      <TrendsChart />
      <CategoryBreakdown />
    </div>
  );
}