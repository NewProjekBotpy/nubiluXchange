# Redis Production Setup Guide - NubiluXchange

## Quick Start untuk Production

Panduan step-by-step untuk deploy Redis dalam production environment untuk chat scaling dan caching di NubiluXchange.

## 🚀 Railway Redis Setup (Recommended)

### Step 1: Create Railway Account
```bash
# 1. Visit railway.app dan signup
# 2. Create new project
# 3. Add Redis database plugin
```

### Step 2: Get Redis URL
```bash
# Railway akan provide REDIS_URL format:
REDIS_URL=redis://default:password@monorail.proxy.rlwy.net:12345
```

### Step 3: Configure Environment Variables
```bash
# Add to .env file
REDIS_URL=redis://default:password@monorail.proxy.rlwy.net:12345
NODE_ENV=production
```

### Step 4: Verify Connection
```bash
# Check logs untuk confirmation
✅ Redis services initialized successfully
```

## 🔧 Alternative Cloud Providers

### AWS ElastiCache Redis

**Setup Steps:**
1. Login ke AWS Console
2. Navigate ke ElastiCache service
3. Create Redis cluster:
   ```bash
   # Configuration
   Engine: Redis
   Version: 7.x
   Node Type: cache.t3.micro (untuk start)
   Network: VPC with private subnet
   Security Group: Allow port 6379 from app servers
   ```

4. Get connection endpoint:
   ```bash
   REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
   ```

**Production Configuration:**
```bash
# ElastiCache Redis cluster
REDIS_URL=redis://master.your-cluster.cache.amazonaws.com:6379

# Multi-AZ untuk high availability
# Automatic failover enabled
# Backup retention: 7 days
```

### Google Cloud Memorystore

**Setup via Console:**
1. Enable Memorystore API
2. Create Redis instance:
   ```bash
   # Instance Configuration
   Region: asia-southeast1 (Jakarta)
   Tier: Basic (1GB)
   Version: Redis 7.x
   Network: default-vpc
   ```

3. Get connection details:
   ```bash
   REDIS_URL=redis://10.xxx.xxx.xxx:6379
   ```

**gcloud CLI Setup:**
```bash
# Create Redis instance
gcloud redis instances create nubiluxchange-redis \
  --size=1 \
  --region=asia-southeast1 \
  --redis-version=redis_7_0

# Get IP address
gcloud redis instances describe nubiluxchange-redis \
  --region=asia-southeast1
```

### Azure Cache for Redis

**Setup via Portal:**
1. Create Redis Cache resource
2. Configuration:
   ```bash
   # Basic settings
   Name: nubiluxchange-redis
   Location: Southeast Asia
   Pricing Tier: Basic C0 (250MB)
   ```

3. Get connection string:
   ```bash
   REDIS_URL=redis://your-cache.redis.cache.windows.net:6380
   ```

## 🛡️ Security Configuration

### SSL/TLS Configuration

```bash
# Production Redis dengan SSL
REDIS_URL=rediss://username:password@hostname:6380

# Certificate validation (production)
REDIS_SSL_CERT_VALIDATION=true
```

### Authentication Setup

```bash
# Strong password requirement
# Minimum 32 characters, mixed case, numbers, symbols
REDIS_AUTH_PASSWORD=Str0ng_R3dis_P@ssw0rd_2025_Secur3!

# Complete URL dengan auth
REDIS_URL=redis://username:Str0ng_R3dis_P@ssw0rd_2025_Secur3!@hostname:6379
```

### Network Security

**Firewall Rules:**
```bash
# AWS Security Group
Port: 6379
Source: Security Group of app servers only

# Google Cloud Firewall
gcloud compute firewall-rules create allow-redis \
  --allow tcp:6379 \
  --source-tags app-servers \
  --target-tags redis-servers
```

**VPC Configuration:**
```bash
# Place Redis in private subnet
# No public IP address
# Access only from app servers in same VPC
```

## ⚙️ Environment Configuration

### Production Environment Variables

```bash
# Core Redis Configuration
REDIS_URL=redis://username:password@hostname:port/database
NODE_ENV=production

# Security
SESSION_SECRET=your-32-character-session-secret-key-here
JWT_SECRET=your-32-character-jwt-secret-key-here

# Application
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# Optional Redis Settings
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RETRIES=3
```

### Development vs Production

**Development (.env.local):**
```bash
# Local Redis atau disable
REDIS_URL=redis://localhost:6379
# or leave unset untuk auto-fallback
NODE_ENV=development
```

**Staging (.env.staging):**
```bash
# Smaller Redis instance
REDIS_URL=redis://staging-redis.provider.com:6379
NODE_ENV=staging
```

**Production (.env.production):**
```bash
# Production Redis cluster
REDIS_URL=redis://prod-redis.provider.com:6379
NODE_ENV=production
```

## 📊 Performance Tuning

### Memory Configuration

```bash
# Redis memory settings
maxmemory 2gb
maxmemory-policy allkeys-lru

# Eviction policy options:
# allkeys-lru: Remove least recently used keys
# allkeys-lfu: Remove least frequently used keys
# volatile-lru: Remove LRU among keys with expire set
```

### Connection Pool Settings

```typescript
// Production connection configuration
const productionRedisConfig = {
  // Connection settings
  family: 4,                    // IPv4
  keepAlive: true,
  lazyConnect: true,
  
  // Timeout settings
  connectTimeout: 10000,        // 10 seconds
  commandTimeout: 5000,         // 5 seconds
  
  // Retry settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  
  // Pool settings
  enableAutoPipelining: true,
  maxRetriesPerRequest: 3
}
```

### Persistence Configuration

```bash
# RDB persistence
save 900 1      # Save after 15 min if 1+ keys changed
save 300 10     # Save after 5 min if 10+ keys changed
save 60 10000   # Save after 1 min if 10000+ keys changed

# AOF persistence (recommended untuk production)
appendonly yes
appendfsync everysec
```

## 🔍 Monitoring & Health Checks

### Application Health Endpoint

Tambahkan monitoring endpoint:

```typescript
// Add to routes.ts
app.get('/api/health', async (req, res) => {
  try {
    const redisStats = await RedisService.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStats.status,
        websocket: 'active'
      },
      redis: redisStats
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Redis Monitoring Commands

```bash
# Check Redis status
redis-cli ping

# Monitor live commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# View active connections
redis-cli client list

# Check slow queries
redis-cli slowlog get 10
```

### CloudWatch/Monitoring Setup

**AWS CloudWatch Metrics:**
```bash
# Key metrics to monitor
- CPUUtilization
- DatabaseMemoryUsagePercentage
- CurrConnections
- NetworkBytesIn/Out
- CacheHitRate
```

**Alert Thresholds:**
```bash
# Critical alerts
CPU > 80%
Memory > 90%
Connection > 1000
Hit Rate < 80%
```

## 🚀 Deployment Steps

### Step 1: Pre-deployment Checklist

```bash
✅ Redis instance provisioned dan accessible
✅ REDIS_URL environment variable configured
✅ SSL/TLS enabled untuk production
✅ Authentication credentials set
✅ Firewall rules configured
✅ Monitoring setup completed
✅ Backup strategy implemented
```

### Step 2: Deploy Application

```bash
# Deploy dengan Redis configuration
npm run build
npm start

# Check logs untuk Redis initialization
✅ Redis services initialized successfully
✅ Global Redis message subscription initialized
```

### Step 3: Verification

```bash
# Test Redis connectivity
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "redis": "connected"
  }
}
```

### Step 4: Load Testing

```bash
# Test chat performance dengan Redis
# Multiple concurrent users
# Message broadcasting
# Rate limiting verification
```

## 🔄 Backup & Recovery

### Automated Backups

```bash
# RDB backups (automatic)
save 900 1

# AOF backups (continuous)
appendonly yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Manual Backup

```bash
# Create manual backup
redis-cli BGSAVE

# Export data
redis-cli --rdb dump.rdb

# Restore data
redis-cli < dump.rdb
```

## 📈 Scaling Strategy

### Horizontal Scaling

```bash
# Redis Cluster setup
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  --cluster-replicas 1

# Sharding configuration
REDIS_URL_CLUSTER=redis://node1:6379,redis://node2:6379
```

### Read Replicas

```bash
# Master-Replica setup
# Master: Write operations
# Replica: Read operations (chat history)

REDIS_MASTER_URL=redis://master:6379
REDIS_REPLICA_URL=redis://replica:6379
```

## 💰 Cost Optimization

### Instance Sizing Guidelines

```bash
# Development/Staging
Memory: 256MB - 1GB
Connections: 100-500
Cost: $5-15/month

# Production (Small)
Memory: 1-2GB
Connections: 1000-2000
Cost: $15-50/month

# Production (Medium)
Memory: 4-8GB  
Connections: 5000-10000
Cost: $50-150/month

# Production (Large)
Memory: 16GB+
Connections: 20000+
Cost: $200+/month
```

### Cost Optimization Tips

```bash
# Use reserved instances (AWS)
# Choose appropriate instance size
# Enable compression
# Set appropriate TTL values
# Use memory-efficient data structures
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

**1. Connection Timeout**
```bash
# Problem: Cannot connect to Redis
# Solution: Check network connectivity
redis-cli -h hostname -p port ping

# Verify REDIS_URL format
echo $REDIS_URL
```

**2. Authentication Failed**
```bash
# Problem: AUTH failed
# Solution: Check password
redis-cli -h hostname -a password ping

# Verify credentials in URL
REDIS_URL=redis://user:pass@host:port
```

**3. Memory Issues**
```bash
# Problem: Out of memory
# Solution: Check memory usage
redis-cli info memory

# Set memory policy
CONFIG SET maxmemory-policy allkeys-lru
```

**4. High Latency**
```bash
# Problem: Slow Redis responses
# Solution: Check slow log
redis-cli slowlog get 10

# Optimize commands
redis-cli info commandstats
```

### Debug Commands

```bash
# Connection debugging
redis-cli ping
redis-cli client list

# Performance debugging  
redis-cli info stats
redis-cli latency latest

# Memory debugging
redis-cli info memory
redis-cli memory usage key

# Network debugging
redis-cli info replication
redis-cli info server
```

## ✅ Production Checklist

### Pre-Go-Live
- [ ] Redis instance provisioned
- [ ] Environment variables configured
- [ ] SSL/TLS enabled
- [ ] Authentication setup
- [ ] Firewall configured
- [ ] Monitoring enabled
- [ ] Backup strategy implemented
- [ ] Load testing completed

### Post-Go-Live
- [ ] Health checks passing
- [ ] Metrics being collected
- [ ] Alerts configured
- [ ] Performance baseline established
- [ ] Backup verification
- [ ] Scaling plan documented

## 📞 Support Contacts

```bash
# Cloud Provider Support
AWS: https://aws.amazon.com/support/
Google: https://cloud.google.com/support/
Azure: https://azure.microsoft.com/support/
Railway: https://railway.app/help

# Redis Community
Documentation: https://redis.io/documentation
Community: https://redis.io/community
Stack Overflow: redis tag
```

---

**Note:** Redis implementation dalam NubiluXchange sudah production-ready. Guide ini memberikan langkah-langkah detail untuk deploy Redis dalam berbagai cloud environments dengan best practices untuk security, performance, dan scalability.