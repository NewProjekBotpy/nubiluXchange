-- Analytics Database Views for NxCommerce
-- These views provide optimized, pre-aggregated data for the analytics dashboard

-- 1. Daily Revenue Analytics View
-- Aggregates revenue, commission, and transaction count by day
CREATE OR REPLACE VIEW analytics_daily_revenue AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transaction_count,
  SUM(CAST(amount AS NUMERIC)) as total_amount,
  SUM(CAST(commission AS NUMERIC)) as total_commission,
  AVG(CAST(amount AS NUMERIC)) as avg_transaction_amount
FROM transactions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2. Product Performance Analytics View
-- Shows product metrics including sales, views, and active status
CREATE OR REPLACE VIEW analytics_product_performance AS
SELECT 
  DATE(p.created_at) as date,
  p.category,
  COUNT(DISTINCT p.id) as products_posted,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_products,
  COUNT(DISTINCT CASE WHEN p.status = 'sold' THEN p.id END) as sold_products,
  SUM(CAST(p.price AS NUMERIC)) as total_value,
  AVG(CAST(p.price AS NUMERIC)) as avg_price
FROM products p
GROUP BY DATE(p.created_at), p.category
ORDER BY date DESC, category;

-- 3. User Activity Analytics View
-- Tracks new user registrations and activity by day
CREATE OR REPLACE VIEW analytics_user_activity AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(DISTINCT CASE WHEN role = 'buyer' THEN id END) as new_buyers,
  COUNT(DISTINCT CASE WHEN role = 'dropshipper' THEN id END) as new_dropshippers,
  COUNT(DISTINCT CASE WHEN role = 'reseller' THEN id END) as new_resellers,
  COUNT(DISTINCT CASE WHEN role = 'admin' THEN id END) as new_admins
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 4. Purchase Activity Analytics View
-- Aggregates purchase metrics including unique buyers and repeat purchases
CREATE OR REPLACE VIEW analytics_purchase_activity AS
SELECT 
  DATE(t.created_at) as date,
  COUNT(*) as total_purchases,
  COUNT(DISTINCT t.buyer_id) as unique_buyers,
  SUM(CAST(t.amount AS NUMERIC)) as total_value,
  AVG(CAST(t.amount AS NUMERIC)) as avg_order_value,
  COUNT(*) FILTER (WHERE t.buyer_id IN (
    SELECT buyer_id 
    FROM transactions 
    WHERE status = 'completed' 
    GROUP BY buyer_id 
    HAVING COUNT(*) > 1
  )) as repeat_purchases
FROM transactions t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at)
ORDER BY date DESC;

-- 5. Seller Performance Analytics View
-- Tracks dropshipper and reseller metrics
CREATE OR REPLACE VIEW analytics_seller_performance AS
SELECT 
  DATE(u.created_at) as date,
  COUNT(DISTINCT CASE WHEN u.role = 'dropshipper' THEN u.id END) as active_dropshippers,
  COUNT(DISTINCT CASE WHEN u.role = 'reseller' THEN u.id END) as active_resellers,
  COUNT(DISTINCT p.seller_id) as sellers_with_products,
  COUNT(DISTINCT t.seller_id) as sellers_with_sales
FROM users u
LEFT JOIN products p ON u.id = p.seller_id
LEFT JOIN transactions t ON u.id = t.seller_id AND t.status = 'completed'
WHERE u.role IN ('dropshipper', 'reseller')
GROUP BY DATE(u.created_at)
ORDER BY date DESC;

-- 6. User Reports Analytics View
-- Aggregates report metrics and resolution rates
CREATE OR REPLACE VIEW analytics_user_reports AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(DISTINCT reporter_id) as unique_reporters,
  COUNT(DISTINCT reported_user_id) as unique_reported_users,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_reports,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
  AVG(
    CASE 
      WHEN status = 'resolved' AND updated_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 
      ELSE NULL 
    END
  ) as avg_resolution_hours
FROM user_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7. Transaction Distribution Analytics View
-- Groups transactions by value ranges
CREATE OR REPLACE VIEW analytics_transaction_distribution AS
SELECT 
  CASE 
    WHEN CAST(amount AS NUMERIC) < 100000 THEN '0-100k'
    WHEN CAST(amount AS NUMERIC) < 500000 THEN '100k-500k'
    WHEN CAST(amount AS NUMERIC) < 1000000 THEN '500k-1M'
    WHEN CAST(amount AS NUMERIC) < 5000000 THEN '1M-5M'
    ELSE '5M+'
  END as value_range,
  COUNT(*) as transaction_count,
  SUM(CAST(amount AS NUMERIC)) as total_value,
  AVG(CAST(amount AS NUMERIC)) as avg_value
FROM transactions
WHERE status = 'completed'
GROUP BY 
  CASE 
    WHEN CAST(amount AS NUMERIC) < 100000 THEN '0-100k'
    WHEN CAST(amount AS NUMERIC) < 500000 THEN '100k-500k'
    WHEN CAST(amount AS NUMERIC) < 1000000 THEN '500k-1M'
    WHEN CAST(amount AS NUMERIC) < 5000000 THEN '1M-5M'
    ELSE '5M+'
  END
ORDER BY 
  CASE value_range
    WHEN '0-100k' THEN 1
    WHEN '100k-500k' THEN 2
    WHEN '500k-1M' THEN 3
    WHEN '1M-5M' THEN 4
    ELSE 5
  END;

-- 8. Top Performers Analytics View
-- Shows best performing products and sellers
CREATE OR REPLACE VIEW analytics_top_performers AS
SELECT 
  'product' as type,
  p.id as entity_id,
  p.title as name,
  p.category,
  COUNT(t.id) as transaction_count,
  SUM(CAST(t.amount AS NUMERIC)) as total_revenue,
  NULL::integer as seller_id
FROM products p
JOIN transactions t ON p.id = t.product_id
WHERE t.status = 'completed'
GROUP BY p.id, p.title, p.category

UNION ALL

SELECT 
  'seller' as type,
  u.id as entity_id,
  COALESCE(u.display_name, u.username) as name,
  u.role as category,
  COUNT(t.id) as transaction_count,
  SUM(CAST(t.amount AS NUMERIC)) as total_revenue,
  u.id as seller_id
FROM users u
JOIN transactions t ON u.id = t.seller_id
WHERE t.status = 'completed' AND u.role IN ('dropshipper', 'reseller')
GROUP BY u.id, u.display_name, u.username, u.role
ORDER BY total_revenue DESC;

-- 9. Platform Growth Analytics View
-- Tracks overall platform growth metrics
CREATE OR REPLACE VIEW analytics_platform_growth AS
SELECT 
  DATE(date) as date,
  SUM(new_users) OVER (ORDER BY DATE(date)) as cumulative_users,
  SUM(new_buyers) OVER (ORDER BY DATE(date)) as cumulative_buyers,
  SUM(new_dropshippers) OVER (ORDER BY DATE(date)) as cumulative_dropshippers,
  SUM(new_resellers) OVER (ORDER BY DATE(date)) as cumulative_resellers,
  new_users,
  new_buyers,
  new_dropshippers,
  new_resellers
FROM analytics_user_activity
ORDER BY date DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);

-- Grant necessary permissions (adjust role name as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
