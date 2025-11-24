import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus,
  Package,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  MessageCircle,
  Star,
  Clock,
  Users,
  Activity,
  BarChart3,
  CalendarIcon,
  Filter,
  Download
} from "lucide-react";
import { useLocation } from "wouter";
import { Loading, LoadingSkeleton } from "@/components/ui/loading";
import { formatIDR } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  totalEarnings: string;
  totalViews: number;
  averageRating: number;
  pendingOrders: number;
  completedOrders: number;
}

interface Product {
  id: number;
  title: string;
  price: string;
  status: 'active' | 'sold' | 'suspended';
  category: string;
  views: number;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  createdAt: string;
  isPremium: boolean;
}

interface SalesData {
  period: string;
  sales: number;
  earnings: string;
}

interface SalesReportData {
  metrics: {
    totalRevenue: string;
    totalSales: number;
    averageOrderValue: string;
    topCategory: string;
    conversionRate: number;
    totalProducts: number;
    activeProducts: number;
    soldProducts: number;
  };
  chartData: {
    date: string;
    revenue: number;
    sales: number;
    period: string;
  }[];
  categoryBreakdown: {
    category: string;
    revenue: number;
    sales: number;
    products: number;
  }[];
  productPerformance: {
    id: number;
    title: string;
    category: string;
    price: string;
    sales: number;
    revenue: number;
    views: number;
    rating: string;
    status: string;
  }[];
  totalTransactions: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-600';
    case 'sold':
      return 'bg-blue-600';
    case 'suspended':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'sold':
      return 'Terjual';
    case 'suspended':
      return 'Ditangguhkan';
    default:
      return status || 'Tidak diketahui';
  }
};

export default function SellerDashboard() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState('7d');
  
  // Sales report filters
  const [reportFilters, setReportFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    period: 'daily' as 'daily' | 'weekly' | 'monthly'
  });
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  
  // Color schemes for charts
  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];
  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  // Categories for filtering
  const categories = ['mobile_legends', 'pubg_mobile', 'free_fire', 'valorant', 'genshin_impact', 'cod_mobile'];

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/seller/stats', timeRange]
  });

  // Fetch seller products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/seller/products']
  });

  // Fetch sales data (for existing charts)
  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['/api/seller/sales', timeRange]
  });

  // Fetch comprehensive sales report
  const { data: salesReport, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/seller/report', reportFilters],
    enabled: true
  });

  const dashboardStats = stats as DashboardStats;

  // Use centralized money formatting utility
  // (formatPrice function replaced with formatIDR from utils)

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Hari ini';
    if (diffInDays === 1) return 'Kemarin';
    return `${diffInDays} hari lalu`;
  };

  // Handle date filter changes
  const handleDateFromChange = (date: Date | undefined) => {
    if (date) {
      setDateFrom(date);
      setReportFilters(prev => ({
        ...prev,
        startDate: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (date) {
      setDateTo(date);
      setReportFilters(prev => ({
        ...prev,
        endDate: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  const handleCategoryChange = (category: string) => {
    setReportFilters(prev => ({
      ...prev,
      category: category === 'all' ? '' : category
    }));
  };

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setReportFilters(prev => ({
      ...prev,
      period
    }));
  };

  // Format category names for display
  const formatCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'mobile_legends': 'Mobile Legends',
      'pubg_mobile': 'PUBG Mobile',
      'free_fire': 'Free Fire',
      'valorant': 'Valorant',
      'genshin_impact': 'Genshin Impact',
      'cod_mobile': 'Call of Duty Mobile'
    };
    return categoryNames[category] || category;
  };

  const reportData = (salesReport as any)?.data as SalesReportData;

  return (
    <div className="min-h-screen bg-nxe-dark p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard Penjual</h1>
          <p className="text-nxe-text">Kelola produk dan pantau performa penjualan Anda</p>
        </div>
        <Button 
          onClick={() => setLocation("/upload")}
          className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
          data-testid="button-add-product"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="bg-nxe-surface border-nxe-border" data-testid={`stats-skeleton-${i}`}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-nxe-card rounded-lg">
                    <Loading variant="spinner" className="w-full h-full" />
                  </div>
                  <div className="flex-1">
                    <LoadingSkeleton lines={3} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-nxe-surface border-nxe-border">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-600/20 rounded-lg">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-nxe-text text-sm">Total Produk</p>
                    <p className="text-2xl font-bold text-white">
                      {dashboardStats?.totalProducts || 0}
                    </p>
                    <p className="text-xs text-green-500">
                      {dashboardStats?.activeProducts || 0} aktif
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-600/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-nxe-text text-sm">Total Penjualan</p>
                    <p className="text-2xl font-bold text-white">
                      {dashboardStats?.totalSales || 0}
                    </p>
                    <p className="text-xs text-green-500">
                      +{Math.floor(Math.random() * 10)}% dari minggu lalu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-nxe-text text-sm">Total Pendapatan</p>
                    <p className="text-2xl font-bold text-white">
                      {dashboardStats?.totalEarnings ? formatIDR(dashboardStats.totalEarnings) : 'Rp 0'}
                    </p>
                    <p className="text-xs text-green-500">
                      +{Math.floor(Math.random() * 15)}% dari bulan lalu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-orange-600/20 rounded-lg">
                    <Eye className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-nxe-text text-sm">Total Views</p>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(dashboardStats?.totalViews || 0)}
                    </p>
                    <p className="text-xs text-blue-500">
                      Rating: {dashboardStats?.averageRating || 0}/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-nxe-surface border border-nxe-border">
          <TabsTrigger 
            value="products"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Produk Saya
          </TabsTrigger>
          <TabsTrigger 
            value="orders"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Pesanan
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Analitik
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-4">
                    <div className="w-full h-48 bg-nxe-border rounded mb-4 flex items-center justify-center">
                      <Loading variant="dots" />
                    </div>
                    <LoadingSkeleton lines={2} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (products as Product[]).length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Belum ada produk
              </h3>
              <p className="text-nxe-text mb-4">
                Mulai jual akun gaming Anda dan dapatkan penghasilan
              </p>
              <Button 
                onClick={() => setLocation("/upload")}
                className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Produk Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(products as Product[]).map((product: Product) => (
                <Card
                  key={product.id}
                  className="bg-nxe-surface border-nxe-border hover:border-nxe-primary/30 transition-colors rounded-[10px]"
                  data-testid={`product-${product.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={product.thumbnail || `/api/placeholder/300/200?text=${product.category}`}
                        alt={product.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <Badge className={`absolute top-2 right-2 ${getStatusColor(product.status)} text-white`}>
                        {getStatusText(product.status)}
                      </Badge>
                      {product.isPremium && (
                        <Badge className="absolute top-2 left-2 bg-yellow-600 text-white">
                          Premium
                        </Badge>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2">
                        {product.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-nxe-primary">
                          {formatIDR(product.price)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-white">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4 text-sm text-nxe-text">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4" />
                          <span>{formatNumber(product.views)} views</span>
                        </div>
                        <span>{formatTimeAgo(product.createdAt)}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setLocation(`/product/${product.id}`)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-nxe-border text-white hover:bg-nxe-primary hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Lihat
                        </Button>
                        <Button
                          onClick={() => setLocation(`/product/${product.id}/edit`)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-nxe-border text-white hover:bg-blue-600 hover:text-white"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Fitur Pesanan
            </h3>
            <p className="text-nxe-text">
              Kelola pesanan dan komunikasi dengan pembeli akan tersedia di sini
            </p>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          {/* Filters */}
          <Card className="bg-nxe-surface border-nxe-border mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Laporan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date From */}
                <div>
                  <label className="text-sm text-nxe-text mb-2 block">Dari Tanggal</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-nxe-border text-white hover:bg-nxe-card"
                        data-testid="button-date-from"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateFrom, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-nxe-surface border-nxe-border">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={handleDateFromChange}
                        initialFocus
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div>
                  <label className="text-sm text-nxe-text mb-2 block">Sampai Tanggal</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-nxe-border text-white hover:bg-nxe-card"
                        data-testid="button-date-to"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateTo, 'dd/MM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-nxe-surface border-nxe-border">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={handleDateToChange}
                        initialFocus
                        className="text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-sm text-nxe-text mb-2 block">Kategori</label>
                  <Select value={reportFilters.category || 'all'} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="border-nxe-border text-white" data-testid="select-category">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {formatCategoryName(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Filter */}
                <div>
                  <label className="text-sm text-nxe-text mb-2 block">Periode</label>
                  <Select value={reportFilters.period} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="border-nxe-border text-white" data-testid="select-period">
                      <SelectValue placeholder="Pilih periode" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-6">
                    <LoadingSkeleton lines={3} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reportData ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-600/20 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-nxe-text text-sm">Total Pendapatan</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-total-revenue">
                          {formatIDR(reportData.metrics.totalRevenue)}
                        </p>
                        <p className="text-xs text-blue-500">
                          Rata-rata: {formatIDR(reportData.metrics.averageOrderValue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-600/20 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-nxe-text text-sm">Total Penjualan</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-total-sales">
                          {reportData.metrics.totalSales}
                        </p>
                        <p className="text-xs text-green-500">
                          Konversi: {reportData.metrics.conversionRate}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-600/20 rounded-lg">
                        <Package className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-nxe-text text-sm">Produk Terjual</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-sold-products">
                          {reportData.metrics.soldProducts}
                        </p>
                        <p className="text-xs text-nxe-text">
                          dari {reportData.metrics.totalProducts} produk
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-nxe-surface border-nxe-border">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-600/20 rounded-lg">
                        <Star className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-nxe-text text-sm">Kategori Terlaris</p>
                        <p className="text-lg font-bold text-white" data-testid="text-top-category">
                          {formatCategoryName(reportData.metrics.topCategory)}
                        </p>
                        <p className="text-xs text-green-500">
                          Produk aktif: {reportData.metrics.activeProducts}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue Trend Chart */}
                <Card className="bg-nxe-surface border-nxe-border">
                  <CardHeader>
                    <CardTitle className="text-white">Tren Pendapatan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="period" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#F3F4F6' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            name="Pendapatan (Rp)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Breakdown Pie Chart */}
                <Card className="bg-nxe-surface border-nxe-border">
                  <CardHeader>
                    <CardTitle className="text-white">Pendapatan per Kategori</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="revenue"
                            nameKey="category"
                            label={({ category, revenue }) => `${formatCategoryName(category)}: ${formatIDR(revenue.toString())}`}
                          >
                            {reportData.categoryBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Table */}
              <Card className="bg-nxe-surface border-nxe-border">
                <CardHeader>
                  <CardTitle className="text-white">Performa Produk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-nxe-border">
                          <th className="text-left py-3 px-4 text-nxe-text">Produk</th>
                          <th className="text-left py-3 px-4 text-nxe-text">Kategori</th>
                          <th className="text-left py-3 px-4 text-nxe-text">Harga</th>
                          <th className="text-left py-3 px-4 text-nxe-text">Terjual</th>
                          <th className="text-left py-3 px-4 text-nxe-text">Pendapatan</th>
                          <th className="text-left py-3 px-4 text-nxe-text">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.productPerformance.slice(0, 10).map((product) => (
                          <tr key={product.id} className="border-b border-nxe-border/50">
                            <td className="py-3 px-4 text-white">{product.title.substring(0, 50)}...</td>
                            <td className="py-3 px-4 text-nxe-text">{formatCategoryName(product.category)}</td>
                            <td className="py-3 px-4 text-white">{formatIDR(product.price)}</td>
                            <td className="py-3 px-4 text-white">{product.sales}</td>
                            <td className="py-3 px-4 text-green-500">{formatIDR(product.revenue.toString())}</td>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusColor(product.status)} text-white`}>
                                {getStatusText(product.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Tidak ada data
              </h3>
              <p className="text-nxe-text">
                Belum ada transaksi dalam periode yang dipilih
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}