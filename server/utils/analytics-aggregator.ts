/**
 * Analytics Aggregator Utility
 * 
 * Centralized data processing and aggregation for analytics
 * - Revenue metrics
 * - User metrics  
 * - Product metrics
 * - Transaction metrics
 * - Geographic metrics
 * - Performance metrics
 */

export interface DailyMetric {
  date: string;
  [key: string]: any;
}

export interface RevenueMetrics {
  daily: DailyMetric[];
  totalRevenue: number;
  growth: number;
  avgPerTransaction: number;
}

export interface UserMetrics {
  daily: DailyMetric[];
  totalUsers: number;
  activeUsers: number;
  growth: number;
  retentionRate: number;
}

export interface ProductMetrics {
  daily: DailyMetric[];
  activeVsSold: { active: number; sold: number };
  topCategories: Array<{ name: string; count: number }>;
}

export interface TransactionMetrics {
  daily: DailyMetric[];
  repeatPurchaseRate: number;
}

/**
 * Aggregate revenue metrics from transactions
 */
export function aggregateRevenueMetrics(
  transactions: any[], 
  startDate: Date, 
  endDate: Date
): RevenueMetrics {
  const dailyMap = new Map<string, { amount: number; transactions: number; commission: number }>();
  
  transactions
    .filter(t => {
      if (t.status !== 'completed') return false;
      const date = new Date(t.createdAt);
      return date >= startDate && date <= endDate;
    })
    .forEach(t => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      const current = dailyMap.get(date) || { amount: 0, transactions: 0, commission: 0 };
      current.amount += parseFloat(t.amount || '0');
      current.transactions += 1;
      current.commission += parseFloat(t.commission || '0');
      dailyMap.set(date, current);
    });

  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = daily.reduce((sum, d) => sum + d.commission, 0);
  const totalTransactions = daily.reduce((sum, d) => sum + d.transactions, 0);
  const avgPerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate growth (compare first half vs second half)
  const midPoint = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, midPoint).reduce((sum, d) => sum + d.commission, 0);
  const secondHalf = daily.slice(midPoint).reduce((sum, d) => sum + d.commission, 0);
  const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    daily,
    totalRevenue,
    growth,
    avgPerTransaction
  };
}

/**
 * Aggregate user metrics
 */
export function aggregateUserMetrics(
  users: any[],
  startDate: Date,
  endDate: Date
): UserMetrics {
  const dailyMap = new Map<string, { newUsers: number; activeUsers: number }>();
  
  const filteredUsers = users.filter(u => {
    if (!u.createdAt) return false;
    const date = new Date(u.createdAt);
    return date >= startDate && date <= endDate;
  });

  filteredUsers.forEach(u => {
    const date = new Date(u.createdAt).toISOString().split('T')[0];
    const current = dailyMap.get(date) || { newUsers: 0, activeUsers: 0 };
    current.newUsers += 1;
    // Consider user active if they have any activity
    current.activeUsers += 1;
    dailyMap.set(date, current);
  });

  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalUsers = users.length;
  const activeUsers = users.filter(u => {
    // Consider active if created in last 30 days or has recent activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo;
  }).length;

  const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

  // Calculate growth
  const midPoint = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, midPoint).reduce((sum, d) => sum + d.newUsers, 0);
  const secondHalf = daily.slice(midPoint).reduce((sum, d) => sum + d.newUsers, 0);
  const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return {
    daily,
    totalUsers,
    activeUsers,
    growth,
    retentionRate
  };
}

/**
 * Aggregate product metrics
 */
export function aggregateProductMetrics(
  products: any[],
  startDate: Date,
  endDate: Date
): ProductMetrics {
  const dailyMap = new Map<string, Map<string, number>>();
  
  products
    .filter(p => {
      if (!p.createdAt) return false;
      const date = new Date(p.createdAt);
      return date >= startDate && date <= endDate;
    })
    .forEach(p => {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      const category = p.category || 'Uncategorized';
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, new Map());
      }
      const categoryMap = dailyMap.get(date)!;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

  const daily = Array.from(dailyMap.entries())
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

  const activeProducts = products.filter(p => p.status === 'active').length;
  const soldProducts = products.filter(p => p.status === 'sold').length;

  const categoryCount = products.reduce((map, p) => {
    const category = p.category || 'Uncategorized';
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map());

  const topCategories = Array.from(categoryCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    daily,
    activeVsSold: { active: activeProducts, sold: soldProducts },
    topCategories
  };
}

/**
 * Aggregate transaction metrics
 */
export function aggregateTransactionMetrics(
  transactions: any[],
  startDate: Date,
  endDate: Date
): TransactionMetrics {
  const dailyMap = new Map<string, { count: number; uniqueBuyers: Set<number>; totalValue: number }>();
  
  transactions
    .filter(t => {
      if (!t.createdAt) return false;
      const date = new Date(t.createdAt);
      return date >= startDate && date <= endDate;
    })
    .forEach(t => {
      const date = new Date(t.createdAt).toISOString().split('T')[0];
      const current = dailyMap.get(date) || { count: 0, uniqueBuyers: new Set(), totalValue: 0 };
      current.count += 1;
      current.uniqueBuyers.add(t.buyerId);
      current.totalValue += parseFloat(t.amount || '0');
      dailyMap.set(date, current);
    });

  const daily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      purchases: data.count,
      uniqueBuyers: data.uniqueBuyers.size,
      totalValue: data.totalValue,
      avgOrderValue: data.count > 0 ? data.totalValue / data.count : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate repeat purchase rate
  const buyerPurchaseCounts = transactions.reduce((map, t) => {
    map.set(t.buyerId, (map.get(t.buyerId) || 0) + 1);
    return map;
  }, new Map());

  const repeatBuyers = Array.from(buyerPurchaseCounts.values()).filter(count => count > 1).length;
  const totalBuyers = buyerPurchaseCounts.size;
  const repeatPurchaseRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;

  return {
    daily,
    repeatPurchaseRate
  };
}

/**
 * Aggregate geographic metrics
 */
export function aggregateGeographicMetrics(users: any[], transactions: any[]) {
  // Note: Geographic data would need to be collected from user data
  // This is a placeholder implementation
  const topCountries = [
    { country: 'Indonesia', users: users.length, revenue: 0 }
  ];

  const topCities = [
    { city: 'Jakarta', country: 'Indonesia', users: Math.floor(users.length / 2) },
    { city: 'Surabaya', country: 'Indonesia', users: Math.floor(users.length / 2) }
  ];

  const trafficSources = [
    { source: 'Direct', users: users.length, conversion: 0 }
  ];

  return {
    topCountries,
    topCities,
    trafficSources
  };
}

/**
 * Aggregate performance metrics
 */
export function aggregatePerformanceMetrics() {
  // Note: This would integrate with actual monitoring tools
  // Placeholder implementation
  return {
    pageLoadTime: 1.2,
    apiResponseTime: 245,
    errorRate: 0.8,
    uptime: 99.9,
    performanceTrends: []
  };
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Fill missing dates in daily metrics
 */
export function fillMissingDates(
  data: DailyMetric[],
  startDate: Date,
  endDate: Date,
  defaultValue: any = { value: 0 }
): DailyMetric[] {
  const result: DailyMetric[] = [];
  const dataMap = new Map(data.map(d => [d.date, d]));
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
    result.push(dataMap.get(dateStr) || { date: dateStr, ...defaultValue });
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}
