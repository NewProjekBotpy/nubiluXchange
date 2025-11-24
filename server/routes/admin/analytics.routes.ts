import { Router } from 'express';
import { AdminAnalyticsController } from '../../controllers/AdminAnalyticsController';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';

const router = Router();

// Analytics routes using AdminAnalyticsController
router.get('/comprehensive', requireAuth, requireAdmin, AdminAnalyticsController.getComprehensiveAnalytics);
router.get('/revenue', requireAuth, requireAdmin, AdminAnalyticsController.getRevenueAnalytics);
router.get('/users', requireAuth, requireAdmin, AdminAnalyticsController.getUserMetrics);
router.get('/live', requireAuth, requireAdmin, AdminAnalyticsController.getLiveMetrics);
router.get('/health', requireAuth, requireAdmin, AdminAnalyticsController.getSystemHealth);

// Legacy comprehensive analytics endpoint (kept for backward compatibility)
router.get('/comprehensive-legacy', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { db } = await import('../../db');
    const { storage } = await import('../../storage');
    const { transactions } = await import('@shared/schema');
    const { logError } = await import('../../utils/logger');

    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    
    const [allUsers, allProducts, allTransactions, userReports] = await Promise.all([
      storage.getAllUsers(),
      storage.getProducts(),
      db.select().from(transactions),
      storage.getUserReports()
    ]);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Revenue Analytics (from commission)
    const dailyRevenueMap = new Map<string, { amount: number; transactions: number; commission: number }>();
    allTransactions
      .filter((t: any) => t.status === 'completed' && new Date(t.createdAt) >= startDate)
      .forEach((t: any) => {
        const date = new Date(t.createdAt).toISOString().split('T')[0];
        const current = dailyRevenueMap.get(date) || { amount: 0, transactions: 0, commission: 0 };
        current.amount += parseFloat(t.amount || '0');
        current.transactions += 1;
        current.commission += parseFloat(t.commission || '0');
        dailyRevenueMap.set(date, current);
      });

    const dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.commission, 0);
    const totalTransactions = dailyRevenue.reduce((sum, d) => sum + d.transactions, 0);
    const avgRevenuePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate growth
    const midPoint = Math.floor(dailyRevenue.length / 2);
    const firstHalf = dailyRevenue.slice(0, midPoint).reduce((sum, d) => sum + d.commission, 0);
    const secondHalf = dailyRevenue.slice(midPoint).reduce((sum, d) => sum + d.commission, 0);
    const revenueGrowth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    // 2. Product Posting Trends
    const dailyProductsMap = new Map<string, Map<string, number>>();
    allProducts
      .filter((p: any) => p.createdAt && new Date(p.createdAt) >= startDate)
      .forEach((p: any) => {
        const date = new Date(p.createdAt).toISOString().split('T')[0];
        const category = p.category || 'Uncategorized';
        
        if (!dailyProductsMap.has(date)) {
          dailyProductsMap.set(date, new Map());
        }
        const categoryMap = dailyProductsMap.get(date)!;
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

    const productPosting = Array.from(dailyProductsMap.entries())
      .map(([date, categoryMap]) => {
        const byCategory: any = {};
        categoryMap.forEach((count, category) => {
          byCategory[category] = count;
        });
        return {
          date,
          total: Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0),
          ...byCategory
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const activeProducts = allProducts.filter((p: any) => p.status === 'active').length;
    const soldProducts = allProducts.filter((p: any) => p.status === 'sold').length;
    const categoryMap = allProducts.reduce((map: Map<string, number>, p: any) => {
      const category = p.category || 'Uncategorized';
      map.set(category, (map.get(category) || 0) + 1);
      return map;
    }, new Map<string, number>());
    
    const topCategories = (Array.from(categoryMap.entries()) as Array<[string, number]>)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Purchase Activity
    const dailyPurchasesMap = new Map<string, { count: number; uniqueBuyers: Set<number>; totalValue: number }>();
    allTransactions
      .filter((t: any) => t.createdAt && new Date(t.createdAt) >= startDate)
      .forEach((t: any) => {
        const date = new Date(t.createdAt).toISOString().split('T')[0];
        const current = dailyPurchasesMap.get(date) || { count: 0, uniqueBuyers: new Set(), totalValue: 0 };
        current.count += 1;
        current.uniqueBuyers.add(t.buyerId);
        current.totalValue += parseFloat(t.amount || '0');
        dailyPurchasesMap.set(date, current);
      });

    const purchaseActivity = Array.from(dailyPurchasesMap.entries())
      .map(([date, data]) => ({
        date,
        purchases: data.count,
        uniqueBuyers: data.uniqueBuyers.size,
        totalValue: data.totalValue,
        avgOrderValue: data.count > 0 ? data.totalValue / data.count : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const allBuyers = new Set(allTransactions.map((t: any) => t.buyerId));
    const repeatBuyers = new Set(
      Array.from(
        allTransactions
          .reduce((map: Map<number, number>, t: any) => {
            map.set(t.buyerId, (map.get(t.buyerId) || 0) + 1);
            return map;
          }, new Map())
          .entries()
      )
        .filter(([_, count]) => count > 1)
        .map(([buyerId, _]) => buyerId)
    );
    const repeatPurchaseRate = allBuyers.size > 0 ? (repeatBuyers.size / allBuyers.size) * 100 : 0;

    // 4. Dropship/Reseller Activity (simulated with seller data)
    const sellerStats = allTransactions
      .filter((t: any) => t.status === 'completed')
      .reduce((map: Map<number, { products: Set<number>; revenue: number; sales: number }>, t: any) => {
        const current = map.get(t.sellerId) || { products: new Set(), revenue: 0, sales: 0 };
        if (t.productId) current.products.add(t.productId);
        current.revenue += parseFloat(t.amount || '0');
        current.sales += 1;
        map.set(t.sellerId, current);
        return map;
      }, new Map());

    const activeSellers = sellerStats.size;
    const totalDropshippedProducts = Array.from(sellerStats.values()).reduce((sum, s) => sum + s.products.size, 0);
    const dropshipRevenue = Array.from(sellerStats.values()).reduce((sum, s) => sum + s.revenue, 0);
    const completedTransactions = allTransactions.filter((t: any) => t.status === 'completed').length;
    const conversionRate = allProducts.length > 0 ? (completedTransactions / allProducts.length) * 100 : 0;

    // 5. User Reports
    const dailyReportsMap = new Map<string, Map<string, number>>();
    userReports
      .filter((r: any) => r.createdAt && new Date(r.createdAt) >= startDate)
      .forEach((r: any) => {
        const date = new Date(r.createdAt).toISOString().split('T')[0];
        const type = r.reportType || 'General';
        
        if (!dailyReportsMap.has(date)) {
          dailyReportsMap.set(date, new Map());
        }
        const typeMap = dailyReportsMap.get(date)!;
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

    const reportsTimeSeries = Array.from(dailyReportsMap.entries())
      .map(([date, typeMap]) => {
        const byType: any = {};
        typeMap.forEach((count, type) => {
          byType[type] = count;
        });
        return {
          date,
          total: Array.from(typeMap.values()).reduce((sum, count) => sum + count, 0),
          ...byType
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const resolvedReports = userReports.filter((r: any) => r.status === 'resolved').length;
    const resolutionRate = userReports.length > 0 ? (resolvedReports / userReports.length) * 100 : 0;
    
    const resolvedReportsWithTime = userReports.filter((r: any) => 
      r.status === 'resolved' && r.createdAt && r.reviewedAt
    );
    const avgResolutionTime = resolvedReportsWithTime.length > 0
      ? resolvedReportsWithTime.reduce((sum: number, r: any) => {
          const created = new Date(r.createdAt).getTime();
          const resolved = new Date(r.reviewedAt).getTime();
          return sum + (resolved - created);
        }, 0) / resolvedReportsWithTime.length / (1000 * 60 * 60)
      : 0;

    // 6. Platform Growth
    const dailyGrowthMap = new Map<string, { newUsers: number; newSellers: number; newAdmins: number }>();
    allUsers
      .filter((u: any) => u.createdAt && new Date(u.createdAt) >= startDate)
      .forEach((u: any) => {
        const date = new Date(u.createdAt).toISOString().split('T')[0];
        const current = dailyGrowthMap.get(date) || { newUsers: 0, newSellers: 0, newAdmins: 0 };
        current.newUsers += 1;
        
        const userProducts = allProducts.filter((p: any) => p.sellerId === u.id);
        if (userProducts.length > 0) current.newSellers += 1;
        if (u.role === 'admin' || u.role === 'owner') current.newAdmins += 1;
        
        dailyGrowthMap.set(date, current);
      });

    const platformGrowth = Array.from(dailyGrowthMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 7. Transaction Value Distribution
    const transactionValues = allTransactions
      .filter((t: any) => t.status === 'completed')
      .map((t: any) => parseFloat(t.amount || '0'));

    const valueRanges = [
      { range: '0-100K', min: 0, max: 100000, count: 0 },
      { range: '100K-500K', min: 100000, max: 500000, count: 0 },
      { range: '500K-1M', min: 500000, max: 1000000, count: 0 },
      { range: '1M-5M', min: 1000000, max: 5000000, count: 0 },
      { range: '5M+', min: 5000000, max: Infinity, count: 0 }
    ];

    transactionValues.forEach(value => {
      for (const range of valueRanges) {
        if (value >= range.min && value < range.max) {
          range.count += 1;
          break;
        }
      }
    });

    const avgTransactionValue = transactionValues.length > 0
      ? transactionValues.reduce((sum, val) => sum + val, 0) / transactionValues.length
      : 0;
    const medianTransactionValue = transactionValues.length > 0
      ? transactionValues.sort((a, b) => a - b)[Math.floor(transactionValues.length / 2)]
      : 0;

    // 8. Top Performers
    const topSellers = await Promise.all(
      Array.from(sellerStats.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(async ([sellerId, data]) => {
          const seller = await storage.getUser(sellerId);
          return {
            id: sellerId,
            username: seller?.username || 'Unknown',
            productsListed: data.products.size,
            totalSales: data.sales,
            totalRevenue: data.revenue
          };
        })
    );

    // Product sales aggregation
    const productSales = allTransactions
      .filter((t: any) => t.status === 'completed')
      .reduce((map: Map<number, { sales: number; revenue: number }>, t: any) => {
        if (t.productId) {
          const current = map.get(t.productId) || { sales: 0, revenue: 0 };
          current.sales += 1;
          current.revenue += parseFloat(t.amount || '0');
          map.set(t.productId, current);
        }
        return map;
      }, new Map());

    const topProducts = await Promise.all(
      Array.from(productSales.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(async ([productId, data]) => {
          const product = await storage.getProduct(productId);
          return {
            id: productId,
            title: product?.title || 'Unknown',
            category: product?.category || 'Unknown',
            sales: data.sales,
            revenue: data.revenue
          };
        })
    );

    res.json({
      revenue: {
        daily: dailyRevenue,
        total: totalRevenue,
        average: avgRevenuePerTransaction,
        growth: revenueGrowth
      },
      productPosting: {
        daily: productPosting,
        activeProducts,
        soldProducts,
        topCategories
      },
      purchases: {
        daily: purchaseActivity,
        repeatPurchaseRate
      },
      dropship: {
        activeSellers,
        productsDropshipped: totalDropshippedProducts,
        revenue: dropshipRevenue,
        conversionRate
      },
      reports: {
        daily: reportsTimeSeries,
        resolutionRate,
        avgResolutionTime
      },
      platformGrowth: {
        daily: platformGrowth
      },
      transactionDistribution: {
        ranges: valueRanges,
        avgValue: avgTransactionValue,
        medianValue: medianTransactionValue
      },
      topPerformers: {
        sellers: topSellers,
        products: topProducts
      }
    });
  } catch (error: any) {
    const { logError } = await import('../../utils/logger');
    logError(error as Error, 'Comprehensive analytics error:');
    res.status(500).json({ error: 'Failed to fetch comprehensive analytics' });
  }
});

export default router;
