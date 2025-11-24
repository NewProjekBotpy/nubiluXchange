# Analytics System Guide

## Overview

The NxCommerce Admin Analytics System provides comprehensive, production-ready analytics with advanced data visualization, multi-format export capabilities, and real-time monitoring.

## Key Features

### 📊 Advanced Data Visualization
- **Recharts Integration**: Beautiful, responsive charts with customizable themes
- **Real-time Updates**: Auto-refresh every 5 minutes with TanStack Query
- **Interactive Dashboards**: Multiple views for revenue, users, products, and geography
- **Mobile-First Design**: Fully responsive charts and layouts

### 📤 Export Capabilities
- **PDF Reports**: Comprehensive analytics reports with custom formatting
- **CSV Exports**: Raw data export for spreadsheet analysis
- **JSON Data**: Complete data dumps for programmatic access
- **Customizable Sections**: Choose which metrics to include in exports

### ⚡ Performance Monitoring
- **Render Time Tracking**: Automatic performance monitoring
- **Error Boundaries**: Graceful error handling with recovery options
- **Loading States**: Skeleton screens for better UX
- **Empty States**: Clear messaging when no data is available

### ♿ Accessibility
- **ARIA Labels**: Full screen reader support
- **Keyboard Navigation**: Complete keyboard accessibility
- **High Contrast**: Clear visual hierarchy
- **Semantic HTML**: Proper document structure

## Analytics Modules

### 1. Live Insights Dashboard
**Location**: `client/src/components/admin/LiveInsightsDashboard.tsx`

Real-time metrics with automatic updates:
- Active users
- Revenue tracking
- Order volume
- System alerts

**Features**:
- 30-second auto-refresh
- Health status indicators
- Critical alerts monitoring

### 2. Comprehensive Analytics
**Location**: `client/src/components/admin/ComprehensiveAnalytics.tsx`

Advanced analytics with 8 key metrics:
1. **Revenue Analytics**: Daily trends with growth indicators
2. **Product Performance**: Active vs sold ratio
3. **Purchase Activity**: Repeat purchase rates
4. **Seller Metrics**: Active dropshippers and resellers
5. **User Reports**: Resolution rates and times
6. **Platform Growth**: New users and sellers
7. **Transaction Distribution**: Value range analysis
8. **Top Performers**: Best sellers and products

**Date Ranges**:
- Last 7 days
- Last 30 days
- Last 90 days

### 3. Analytics Export
**Location**: `client/src/components/admin/AnalyticsExport.tsx`

Multi-format export system:

#### PDF Export
- Professional report layout
- Multiple pages support
- Custom headers and footers
- Automatic page breaks
- Date range information

#### CSV Export
- Structured tabular data
- Compatible with Excel/Sheets
- Includes all selected sections
- Timestamp in filename

#### JSON Export
- Complete data structure
- Metadata included
- API-friendly format
- Easy to parse programmatically

## Backend Architecture

### Controllers
**Location**: `server/controllers/AdminAnalyticsController.ts`

Production-ready controller with:
- Input validation
- Error handling
- Performance optimization
- Type safety

**Endpoints**:

```typescript
// Comprehensive analytics
GET /api/admin/analytics/comprehensive?period=30&startDate=&endDate=

// Revenue analytics
GET /api/admin/analytics/revenue?startDate=&endDate=

// User metrics
GET /api/admin/analytics/users?startDate=&endDate=

// Live metrics
GET /api/admin/analytics/live

// System health
GET /api/admin/analytics/health
```

### Data Aggregation
**Location**: `server/utils/analytics-aggregator.ts`

Centralized data processing utilities:

#### Available Functions

```typescript
// Revenue metrics
aggregateRevenueMetrics(transactions, startDate, endDate)
// Returns: { daily, totalRevenue, growth, avgPerTransaction }

// User metrics
aggregateUserMetrics(users, startDate, endDate)
// Returns: { daily, totalUsers, activeUsers, growth, retentionRate }

// Product metrics
aggregateProductMetrics(products, startDate, endDate)
// Returns: { daily, activeVsSold, topCategories }

// Transaction metrics
aggregateTransactionMetrics(transactions, startDate, endDate)
// Returns: { daily, repeatPurchaseRate }

// Geographic metrics
aggregateGeographicMetrics(users, transactions)
// Returns: { topCountries, topCities, trafficSources }

// Performance metrics
aggregatePerformanceMetrics()
// Returns: { pageLoadTime, apiResponseTime, errorRate, uptime }
```

#### Utility Functions

```typescript
// Format dates consistently
formatDate(date: Date): string

// Calculate percentage changes
calculatePercentageChange(current: number, previous: number): number

// Fill missing dates in time series
fillMissingDates(data, startDate, endDate, defaultValue)
```

## Usage Examples

### Basic Usage

```typescript
import { useQuery } from '@tanstack/react-query';

// Fetch comprehensive analytics
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/admin/analytics/comprehensive?period=30'],
  refetchInterval: 300000, // 5 minutes
  staleTime: 60000 // 1 minute
});
```

### Export Analytics

```typescript
import AnalyticsExport from '@/components/admin/AnalyticsExport';

// In your component
<AnalyticsExport 
  analyticsData={data}
  dateRange={{ start: '2025-01-01', end: '2025-01-31' }}
/>
```

### Custom Date Range

```typescript
const [dateRange, setDateRange] = useState({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
});

const { data } = useQuery({
  queryKey: [`/api/admin/analytics/comprehensive?startDate=${dateRange.start}&endDate=${dateRange.end}`]
});
```

## Best Practices

### Performance

1. **Use Pagination**: For large datasets, implement pagination
2. **Cache Wisely**: Configure appropriate staleTime and cacheTime
3. **Debounce Filters**: Prevent excessive API calls
4. **Lazy Load Charts**: Load charts only when visible

### Data Quality

1. **Validate Inputs**: Always validate date ranges and periods
2. **Handle Edge Cases**: Empty states, zero divisions, null values
3. **Type Safety**: Use TypeScript interfaces consistently
4. **Error Handling**: Comprehensive try-catch blocks

### Security

1. **Authentication**: Require admin role for all analytics endpoints
2. **Rate Limiting**: Prevent abuse with rate limits
3. **Input Sanitization**: Validate and sanitize all inputs
4. **Audit Logging**: Log analytics access for security

### User Experience

1. **Loading States**: Show skeletons during data fetch
2. **Error Recovery**: Provide retry mechanisms
3. **Empty States**: Clear messaging when no data
4. **Mobile Responsive**: Ensure charts work on all devices

## Troubleshooting

### Charts Not Rendering

**Issue**: Charts appear blank or don't render

**Solutions**:
1. Check if data exists: `console.log(analyticsData)`
2. Verify data structure matches expected format
3. Check ResponsiveContainer has valid dimensions
4. Ensure parent container has defined height

### Export Fails

**Issue**: PDF/CSV export doesn't work

**Solutions**:
1. Verify analytics data is loaded: `analyticsData !== undefined`
2. Check browser console for errors
3. Ensure at least one section is selected
4. Verify jsPDF and papaparse are installed

### Performance Issues

**Issue**: Dashboard loads slowly

**Solutions**:
1. Check network tab for slow queries
2. Reduce refetch interval
3. Implement pagination
4. Use data aggregation on backend
5. Enable caching with longer staleTime

### Missing Data

**Issue**: Some metrics show zero or empty

**Solutions**:
1. Verify date range is correct
2. Check if data exists in database
3. Confirm user has proper permissions
4. Check backend logs for errors

## API Response Examples

### Comprehensive Analytics Response

```json
{
  "revenue": {
    "daily": [
      { "date": "2025-01-01", "amount": 1000000, "transactions": 10, "commission": 50000 }
    ],
    "totalRevenue": 50000,
    "growth": 12.5,
    "avgPerTransaction": 5000
  },
  "productPosting": {
    "daily": [
      { "date": "2025-01-01", "total": 5, "Gaming": 2, "Electronics": 3 }
    ],
    "activeVsSold": { "active": 100, "sold": 25 },
    "topCategories": [
      { "name": "Gaming", "count": 50 }
    ]
  },
  "purchases": {
    "daily": [
      { "date": "2025-01-01", "purchases": 10, "uniqueBuyers": 8, "totalValue": 1000000, "avgOrderValue": 100000 }
    ],
    "repeatPurchaseRate": 25.5
  }
}
```

## Testing

### Unit Tests

```typescript
// Test analytics aggregation
describe('aggregateRevenueMetrics', () => {
  it('should calculate total revenue correctly', () => {
    const transactions = [
      { status: 'completed', amount: '100000', commission: '5000' }
    ];
    const result = aggregateRevenueMetrics(transactions, startDate, endDate);
    expect(result.totalRevenue).toBe(5000);
  });
});
```

### Integration Tests

```typescript
// Test API endpoint
describe('GET /api/admin/analytics/comprehensive', () => {
  it('should return analytics data', async () => {
    const response = await request(app)
      .get('/api/admin/analytics/comprehensive?period=30')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('revenue');
  });
});
```

## Maintenance

### Regular Tasks

1. **Monitor Performance**: Check render times and query speeds
2. **Update Dependencies**: Keep Recharts and other libs updated
3. **Optimize Queries**: Review and optimize slow queries
4. **Clean Old Data**: Archive old analytics data periodically

### Database Views

The analytics system includes 9 pre-created database views for optimized query performance. These views are automatically created during database initialization and provide pre-aggregated data for the analytics dashboard.

#### Available Views

**1. analytics_daily_revenue**
- Aggregates daily revenue, commission, and transaction metrics
- Columns: `date`, `transaction_count`, `total_amount`, `total_commission`, `avg_transaction_amount`
- Use Case: Revenue trend analysis and financial reporting

**2. analytics_product_performance**
- Product metrics grouped by date and category
- Columns: `date`, `category`, `products_posted`, `active_products`, `sold_products`, `total_value`, `avg_price`
- Use Case: Product inventory and sales performance tracking

**3. analytics_user_activity**
- New user registrations by role
- Columns: `date`, `new_users`, `new_buyers`, `new_dropshippers`, `new_resellers`, `new_admins`
- Use Case: User growth and role distribution analysis

**4. analytics_purchase_activity**
- Purchase metrics and buyer behavior
- Columns: `date`, `total_purchases`, `unique_buyers`, `total_value`, `avg_order_value`, `repeat_purchases`
- Use Case: Sales trends and customer retention analysis

**5. analytics_seller_performance**
- Dropshipper and reseller activity metrics
- Columns: `date`, `active_dropshippers`, `active_resellers`, `sellers_with_products`, `sellers_with_sales`
- Use Case: Seller ecosystem health monitoring

**6. analytics_user_reports**
- User report metrics and resolution tracking
- Columns: `date`, `total_reports`, `unique_reporters`, `unique_reported_users`, `resolved_reports`, `pending_reports`, `avg_resolution_hours`
- Use Case: Customer support and moderation analytics

**7. analytics_transaction_distribution**
- Transaction value distribution by ranges
- Columns: `value_range`, `transaction_count`, `total_value`, `avg_value`
- Use Case: Understanding transaction patterns and pricing tiers

**8. analytics_top_performers**
- Best performing products and sellers
- Columns: `type`, `entity_id`, `name`, `category`, `transaction_count`, `total_revenue`, `seller_id`
- Use Case: Identifying top revenue drivers

**9. analytics_platform_growth**
- Cumulative growth metrics over time
- Columns: `date`, `cumulative_users`, `cumulative_buyers`, `cumulative_dropshippers`, `cumulative_resellers`, daily counts
- Use Case: Long-term platform growth visualization

#### Using Views in Queries

```typescript
// Example: Query daily revenue from view
const dailyRevenue = await db.execute(sql`
  SELECT * FROM analytics_daily_revenue 
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY date DESC
`);

// Example: Get top performers
const topPerformers = await db.execute(sql`
  SELECT * FROM analytics_top_performers 
  LIMIT 10
`);
```

#### Performance Benefits

1. **Pre-aggregated Data**: Complex aggregations are computed once and cached
2. **Optimized Indexes**: All related tables have indexes on frequently queried columns
3. **Reduced Query Time**: Views eliminate redundant calculations in application code
4. **Consistent Logic**: Business logic for aggregations is centralized in the database

#### Maintenance

- Views are automatically updated when underlying data changes
- No manual refresh required for standard views
- Consider materialized views for very large datasets (requires manual refresh)
- Monitor view performance with `EXPLAIN ANALYZE` for optimization opportunities

#### Performance Recommendations

Based on architectural review, consider these optimizations for production:

1. **Explicit Ordering**: PostgreSQL does not guarantee ORDER BY in view definitions. Always add `ORDER BY` clauses in your queries when fetching from views:
   ```typescript
   // Good practice
   const revenue = await db.execute(sql`
     SELECT * FROM analytics_daily_revenue 
     WHERE date >= $1 
     ORDER BY date DESC
   `, [startDate]);
   ```

2. **Repeat Purchase Optimization**: The `analytics_purchase_activity` view includes a subquery to calculate repeat purchases. Monitor this query's performance on production volumes. If it becomes slow, consider:
   - Using a CTE (Common Table Expression) for better query planning
   - Creating a materialized view that refreshes periodically
   - Pre-computing repeat buyer metrics in a separate table

3. **Production Monitoring**: Track query execution times and add indexes if specific views show degraded performance under load

#### View Files

- View definitions: `db/analytics-views.sql`
- All views use `CREATE OR REPLACE` for safe updates
- Views can be recreated anytime by running the SQL file

## Support

For issues or questions:
1. Check this guide first
2. Review code comments in source files
3. Check browser console and network tab
4. Review backend logs for errors
5. Contact development team if needed

## Changelog

### v1.1.0 (Current)
- **NEW**: 9 optimized database views for analytics aggregation
- **NEW**: Comprehensive database performance indexes
- Enhanced documentation with database views usage examples
- Improved query performance with pre-aggregated data
- All views support real-time data updates

### v1.0.0
- Initial release with comprehensive analytics
- Multi-format export support (PDF, CSV, JSON)
- Real-time monitoring with WebSocket integration
- Mobile-responsive design with 8+ chart types
- Full accessibility support (ARIA labels, keyboard navigation)
- Production-ready error handling and loading states

---

**Last Updated**: October 11, 2025  
**Maintained By**: NxCommerce Development Team
