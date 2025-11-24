import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ComposedChart,
  Legend
} from "recharts";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Users,
  DollarSign,
  ShoppingCart,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Search,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Gauge
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

interface AdvancedReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  reportType: 'revenue' | 'users' | 'transactions' | 'products' | 'performance';
  granularity: 'daily' | 'weekly' | 'monthly';
  category?: string;
  userRole?: string;
  status?: string;
  comparisonPeriod?: boolean;
}

interface ReportData {
  id: string;
  period: string;
  value: number;
  change?: number;
  metadata?: Record<string, any>;
}

interface AdvancedMetrics {
  growthRate: number;
  volatility: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast: number[];
  confidence: number;
}

export default function AdvancedDataReports() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AdvancedReportFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    reportType: 'revenue',
    granularity: 'daily',
    comparisonPeriod: false
  });

  const [selectedTab, setSelectedTab] = useState("overview");
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [customDateRange, setCustomDateRange] = useState(false);

  // Advanced analytics queries
  const { data: reportData, isLoading: loadingReports, refetch: refetchReports } = useQuery({
    queryKey: ['advanced-reports', filters],
    queryFn: () => apiRequest(`/api/owner/reports/advanced`, {
      method: 'POST',
      body: filters,
      headers: { 'Content-Type': 'application/json' }
    }),
    staleTime: 30000
  });

  const { data: comparativeData, isLoading: loadingComparative } = useQuery({
    queryKey: ['comparative-reports', filters],
    queryFn: () => filters.comparisonPeriod 
      ? apiRequest(`/api/owner/reports/comparative`, {
          method: 'POST',
          body: filters,
          headers: { 'Content-Type': 'application/json' }
        })
      : Promise.resolve(null),
    enabled: filters.comparisonPeriod,
    staleTime: 30000
  });

  const { data: trendsData, isLoading: loadingTrends } = useQuery({
    queryKey: ['trends-analysis', filters.reportType],
    queryFn: () => apiRequest(`/api/owner/reports/trends/${filters.reportType}`),
    staleTime: 60000
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: ({ format, data }: { format: string; data: any }) =>
      apiRequest(`/api/owner/reports/export`, {
        method: 'POST',
        body: { format, data, filters },
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: (data) => {
      // Download the exported file
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Report exported successfully" });
    },
    onError: () => {
      toast({ title: "Failed to export report", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const handleFilterChange = (key: keyof AdvancedReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = () => {
    if (!reportData) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    exportMutation.mutate({ format: exportFormat, data: reportData });
  };

  const QuickDateRanges = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {[
        { label: 'Last 7 days', days: 7 },
        { label: 'Last 30 days', days: 30 },
        { label: 'Last 90 days', days: 90 },
        { label: 'This month', days: new Date().getDate() },
        { label: 'Last month', days: 30, offset: 30 }
      ].map((range, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          data-testid={`button-quick-range-${range.label.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={() => {
            const end = new Date();
            const start = new Date();
            if (range.offset) {
              end.setDate(end.getDate() - range.offset);
              start.setDate(end.getDate() - range.days + 1);
            } else {
              start.setDate(start.getDate() - range.days + 1);
            }
            handleFilterChange('dateRange', {
              start: start.toISOString().split('T')[0],
              end: end.toISOString().split('T')[0]
            });
          }}
        >
          {range.label}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        data-testid="button-custom-range"
        onClick={() => setCustomDateRange(!customDateRange)}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Custom Range
      </Button>
    </div>
  );

  const AdvancedFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuickDateRanges />
        
        {customDateRange && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  start: e.target.value
                })}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', {
                  ...filters.dateRange,
                  end: e.target.value
                })}
                data-testid="input-end-date"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="report-type">Report Type</Label>
            <Select
              value={filters.reportType}
              onValueChange={(value) => handleFilterChange('reportType', value)}
            >
              <SelectTrigger data-testid="select-report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue Analysis</SelectItem>
                <SelectItem value="users">User Analytics</SelectItem>
                <SelectItem value="transactions">Transaction Reports</SelectItem>
                <SelectItem value="products">Product Performance</SelectItem>
                <SelectItem value="performance">System Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="granularity">Time Granularity</Label>
            <Select
              value={filters.granularity}
              onValueChange={(value) => handleFilterChange('granularity', value)}
            >
              <SelectTrigger data-testid="select-granularity">
                <SelectValue placeholder="Select granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comparison">Comparison</Label>
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="comparison"
                checked={filters.comparisonPeriod}
                onChange={(e) => handleFilterChange('comparisonPeriod', e.target.checked)}
                data-testid="checkbox-comparison"
              />
              <Label htmlFor="comparison">Compare with previous period</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            onClick={() => refetchReports()}
            disabled={loadingReports}
            data-testid="button-apply-filters"
          >
            {loadingReports ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Apply Filters
          </Button>

          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'xlsx' | 'pdf')}>
              <SelectTrigger className="w-24" data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || !reportData}
              data-testid="button-export"
            >
              {exportMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MetricsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {reportData?.summary?.map((metric: any, index: number) => (
        <Card key={index} data-testid={`card-metric-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">
                  {metric.type === 'currency' ? formatCurrency(metric.value) : metric.value}
                </p>
                {metric.change !== undefined && (
                  <div className="flex items-center mt-1">
                    {getChangeIcon(metric.change)}
                    <span className={`text-sm font-medium ml-1 ${getChangeColor(metric.change)}`}>
                      {formatPercentage(metric.change)}
                    </span>
                  </div>
                )}
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                {metric.icon === 'dollar' && <DollarSign className="h-4 w-4 text-primary" />}
                {metric.icon === 'users' && <Users className="h-4 w-4 text-primary" />}
                {metric.icon === 'shopping' && <ShoppingCart className="h-4 w-4 text-primary" />}
                {metric.icon === 'activity' && <Activity className="h-4 w-4 text-primary" />}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const TrendAnalysis = () => {
    if (!reportData?.chartData) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    typeof value === 'number' && name.includes('Revenue') 
                      ? formatCurrency(value) 
                      : value,
                    name
                  ]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="primary" 
                  fill={COLORS[0]} 
                  stroke={COLORS[0]} 
                  fillOpacity={0.3}
                  name="Primary Metric"
                />
                {filters.comparisonPeriod && comparativeData && (
                  <Line 
                    type="monotone" 
                    dataKey="comparison" 
                    stroke={COLORS[1]} 
                    strokeDasharray="5 5"
                    name="Previous Period"
                  />
                )}
                <Bar 
                  dataKey="secondary" 
                  fill={COLORS[2]} 
                  name="Secondary Metric"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DetailedBreakdown = () => {
    if (!reportData?.breakdown) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportData.breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.breakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => 
                    typeof value === 'number' && filters.reportType === 'revenue' 
                      ? formatCurrency(value) 
                      : value
                  } />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendsData?.metrics?.map((metric: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{metric.name}</p>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{metric.value}</p>
                    <div className="flex items-center">
                      {getChangeIcon(metric.change)}
                      <span className={`text-sm ${getChangeColor(metric.change)}`}>
                        {formatPercentage(metric.change)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const DataTable = () => {
    if (!reportData?.tableData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(reportData.tableData[0] || {}).map((key) => (
                    <TableHead key={key} className="font-medium">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.tableData.map((row: any, index: number) => (
                  <TableRow key={index} data-testid={`row-data-${index}`}>
                    {Object.entries(row).map(([key, value], cellIndex) => (
                      <TableCell key={cellIndex}>
                        {key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') 
                          ? formatCurrency(Number(value))
                          : key.toLowerCase().includes('date')
                          ? new Date(String(value)).toLocaleDateString('id-ID')
                          : String(value)
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loadingReports) {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="title-advanced-reports">
            Advanced Data Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analytics and insights for data-driven decisions
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleTimeString('id-ID')}
        </Badge>
      </div>

      <AdvancedFilters />

      {reportData && (
        <>
          <MetricsOverview />
          <TrendAnalysis />
          <DetailedBreakdown />
          <DataTable />
        </>
      )}

      {!reportData && !loadingReports && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-4">
                Adjust your filters and click "Apply Filters" to generate reports.
              </p>
              <Button onClick={() => refetchReports()} data-testid="button-refresh-data">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}