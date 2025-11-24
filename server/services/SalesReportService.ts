import { ProductRepository } from "../repositories/ProductRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval } from "date-fns";

const productRepo = new ProductRepository();
const transactionRepo = new TransactionRepository();

export interface SalesReportFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  status?: 'completed' | 'pending' | 'failed';
  period?: 'daily' | 'weekly' | 'monthly';
}

export interface SalesMetrics {
  totalRevenue: string;
  totalSales: number;
  averageOrderValue: string;
  topCategory: string;
  conversionRate: number;
  totalProducts: number;
  activeProducts: number;
  soldProducts: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  sales: number;
  period: string;
}

export interface CategoryData {
  category: string;
  revenue: number;
  sales: number;
  products: number;
}

export interface ProductPerformance {
  id: number;
  title: string;
  category: string;
  price: string;
  sales: number;
  revenue: number;
  views: number;
  rating: string;
  status: string;
}

export class SalesReportService {
  static async getSellerSalesReport(sellerId: number, filters: SalesReportFilters = {}) {
    const {
      startDate = subDays(new Date(), 30),
      endDate = new Date(),
      category,
      status = 'completed',
      period = 'daily'
    } = filters;

    // Get seller's products
    const products = await productRepo.getProducts({ sellerId });
    
    // Get seller's transactions within date range
    const allTransactions = await transactionRepo.getTransactionsByUser(sellerId);
    const transactions = allTransactions.filter(t => {
      if (!t.createdAt) return false;
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= startDate && 
             transactionDate <= endDate && 
             t.status === status &&
             t.sellerId === sellerId;
    });

    // Filter by category if specified
    const filteredTransactions = category 
      ? transactions.filter(t => {
          const product = products.find(p => p.id === t.productId);
          return product?.category === category;
        })
      : transactions;

    // Calculate metrics
    const metrics = this.calculateMetrics(products, filteredTransactions);
    
    // Generate chart data
    const chartData = this.generateChartData(filteredTransactions, startDate, endDate, period);
    
    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(products, filteredTransactions);
    
    // Get top performing products (using filtered transactions for consistency)
    const productPerformance = this.calculateProductPerformance(products, filteredTransactions);

    return {
      metrics,
      chartData,
      categoryBreakdown,
      productPerformance,
      totalTransactions: filteredTransactions.length,
      dateRange: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      }
    };
  }

  private static calculateMetrics(products: any[], transactions: any[]): SalesMetrics {
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalSales = transactions.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Calculate category with most sales
    const categoryStats = products.reduce((acc, product) => {
      const productTransactions = transactions.filter(t => t.productId === product.id);
      const categoryRevenue = productTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      if (!acc[product.category]) {
        acc[product.category] = { revenue: 0, sales: 0 };
      }
      acc[product.category].revenue += categoryRevenue;
      acc[product.category].sales += productTransactions.length;
      
      return acc;
    }, {} as Record<string, { revenue: number; sales: number }>);

    const topCategory = Object.entries(categoryStats)
      .sort(([,a], [,b]) => (b as {revenue: number}).revenue - (a as {revenue: number}).revenue)[0]?.[0] || 'N/A';

    const activeProducts = products.filter(p => p.status === 'active').length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    
    // Simple conversion rate calculation (sales / total products)
    const conversionRate = products.length > 0 ? (soldProducts / products.length) * 100 : 0;

    return {
      totalRevenue: totalRevenue.toString(),
      totalSales,
      averageOrderValue: averageOrderValue.toString(),
      topCategory,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalProducts: products.length,
      activeProducts,
      soldProducts
    };
  }

  private static generateChartData(
    transactions: any[], 
    startDate: Date, 
    endDate: Date, 
    period: 'daily' | 'weekly' | 'monthly'
  ): SalesChartData[] {
    let intervals: Date[];
    let formatString: string;

    switch (period) {
      case 'weekly':
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM-dd';
        break;
      case 'monthly':
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM';
        break;
      default:
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM-dd';
    }

    return intervals.map(date => {
      let dateStart: Date;
      let dateEnd: Date;
      let periodLabel: string;

      switch (period) {
        case 'weekly':
          dateStart = startOfWeek(date);
          dateEnd = endOfWeek(date);
          periodLabel = format(date, 'MMM dd');
          break;
        case 'monthly':
          dateStart = startOfMonth(date);
          dateEnd = endOfMonth(date);
          periodLabel = format(date, 'MMM yyyy');
          break;
        default:
          dateStart = startOfDay(date);
          dateEnd = endOfDay(date);
          periodLabel = format(date, 'MMM dd');
      }
      
      const periodTransactions = transactions.filter(t => {
        if (!t.createdAt) return false;
        const transactionDate = new Date(t.createdAt);
        return transactionDate >= dateStart && transactionDate <= dateEnd;
      });

      const revenue = periodTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const sales = periodTransactions.length;

      return {
        date: format(date, formatString),
        revenue,
        sales,
        period: periodLabel
      };
    });
  }

  private static calculateCategoryBreakdown(products: any[], transactions: any[]): CategoryData[] {
    const categoryMap = new Map<string, { revenue: number; sales: number; products: number }>();

    // Initialize categories from products
    products.forEach(product => {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, { revenue: 0, sales: 0, products: 0 });
      }
      categoryMap.get(product.category)!.products++;
    });

    // Add transaction data
    transactions.forEach(transaction => {
      const product = products.find(p => p.id === transaction.productId);
      if (product) {
        const categoryData = categoryMap.get(product.category);
        if (categoryData) {
          categoryData.revenue += parseFloat(transaction.amount);
          categoryData.sales++;
        }
      }
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        sales: data.sales,
        products: data.products
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private static calculateProductPerformance(products: any[], transactions: any[]): ProductPerformance[] {
    return products.map(product => {
      const productTransactions = transactions.filter(t => t.productId === product.id);
      const sales = productTransactions.length;
      const revenue = productTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        id: product.id,
        title: product.title,
        category: product.category,
        price: product.price,
        sales,
        revenue,
        views: 0, // Views not tracked in current schema
        rating: product.rating || '0',
        status: product.status
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  static async getSellerDashboardStats(sellerId: number, timeRange: string = '7d') {
    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
    const startDate = subDays(new Date(), days);
    
    const products = await productRepo.getProducts({ sellerId });
    const transactions = await transactionRepo.getTransactionsByUser(sellerId);
    
    const recentTransactions = transactions.filter(t => {
      if (!t.createdAt) return false;
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= startDate && t.status === 'completed';
    });

    const activeProducts = products.filter(p => p.status === 'active').length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    const totalRevenue = recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalViews = 0; // Views not tracked in current schema
    const avgRating = products.length > 0 
      ? products.reduce((sum, p) => sum + parseFloat(p.rating || '0'), 0) / products.length 
      : 0;

    return {
      totalProducts: products.length,
      activeProducts,
      soldProducts,
      totalSales: recentTransactions.length,
      totalEarnings: totalRevenue.toString(),
      totalViews,
      averageRating: Math.round(avgRating * 100) / 100,
      pendingOrders: transactions.filter(t => t.status === 'pending').length,
      completedOrders: transactions.filter(t => t.status === 'completed').length
    };
  }
}