# Redis Configuration Guide - NubiluXchange Chat Scaling & Caching

## Overview

Redis adalah in-memory data store yang digunakan untuk scaling real-time chat dan caching dalam aplikasi NubiluXchange. Redis memberikan performa tinggi untuk chat scaling di production dengan dukungan pub/sub messaging, session caching, dan rate limiting.

## Current Implementation Status

✅ **Production-Ready Features:**
- Real-time message broadcasting dengan Redis pub/sub
- User session caching dengan TTL expiration
- Chat participants caching untuk quick lookup
- Message rate limiting untuk spam protection
- Typing indicators dengan auto-expiration
- Recent messages caching untuk performance
- Graceful fallback tanpa Redis (optional mode)

## Redis Configuration Options

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://username:password@hostname:port/database
# atau untuk development
REDIS_URL=redis://localhost:6379

# Alternative: Enable Redis without URL (development only)
ENABLE_REDIS=true
```

### Connection Configuration

```typescript
// Production Redis Configuration
const redisConfig = {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 5000,
  commandTimeout: 3000,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
}
```

## Production Setup Guide

### 1. Redis Instance Setup

#### Option A: Cloud Redis (Recommended untuk Production)

**AWS ElastiCache Redis:**
```bash
# AWS ElastiCache Redis cluster
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

**Google Cloud Memorystore:**
```bash
# Google Cloud Memorystore Redis
REDIS_URL=redis://10.0.0.1:6379
```

**Azure Cache for Redis:**
```bash
# Azure Redis Cache
REDIS_URL=redis://your-cache.redis.cache.windows.net:6380
```

**Railway Redis (Recommended):**
```bash
# Railway Redis Plugin
REDIS_URL=redis://default:password@monorail.proxy.rlwy.net:port
```

#### Option B: Self-Hosted Redis

**Docker Redis Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass your_secure_password
    
volumes:
  redis_data:
```

### 2. Environment Configuration

#### Development (.env.local)
```bash
# Development - Optional Redis
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

#### Production (.env.production)
```bash
# Production - Redis URL dari cloud provider
REDIS_URL=redis://username:password@hostname:port/database
NODE_ENV=production

# Security
SESSION_SECRET=your-32-character-secret-key
```

### 3. Redis Security Configuration

#### Authentication & SSL
```bash
# Redis dengan authentication
REDIS_URL=redis://username:password@hostname:6379

# Redis dengan SSL (production)
REDIS_URL=rediss://username:password@hostname:6380
```

#### Network Security
- Gunakan private network/VPC untuk Redis instance
- Enable Redis AUTH dengan strong password
- Configure firewall rules (hanya allow application servers)
- Enable SSL/TLS untuk data in transit

### 4. Performance Tuning

#### Memory Configuration
```bash
# Redis memory policy
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence configuration
save 900 1    # Save after 900 sec if at least 1 key changed
save 300 10   # Save after 300 sec if at least 10 keys changed
save 60 10000 # Save after 60 sec if at least 10000 keys changed
```

#### Connection Pool Settings
```typescript
// Production connection settings
const redisConfig = {
  family: 4,           // 4 (IPv4) or 6 (IPv6)
  keepAlive: true,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 5000
}
```

## Feature Implementation Details

### 1. Real-time Chat Scaling

Redis pub/sub digunakan untuk broadcast messages antar multiple server instances:

```typescript
// Publisher (when message sent)
await RedisService.publishMessage(chatId, message);

// Subscriber (receives from other servers)
await RedisService.subscribeToChatMessages(chatId, callback);
```

**Production Benefits:**
- Horizontal scaling - multiple server instances
- Real-time message delivery
- Cross-server communication
- Load balancing support

### 2. Session & User Caching

User sessions disimpan di Redis untuk quick access:

```typescript
// Cache user session (1 hour TTL)
await RedisService.setActiveUser(userId, userInfo);

// Quick session lookup
const user = await RedisService.getActiveUser(userId);
```

**Production Benefits:**
- Faster authentication
- Cross-server session sharing
- Automatic session expiration
- Memory efficient storage

### 3. Message Rate Limiting

Rate limiting untuk prevent spam:

```typescript
// Check message rate limit (20 messages/minute)
const rateLimit = await RedisService.checkMessageRateLimit(userId);
if (!rateLimit.allowed) {
  throw new Error('Rate limit exceeded');
}
```

**Production Benefits:**
- Spam protection
- DoS attack prevention
- Resource protection
- Fair usage enforcement

### 4. Chat Performance Optimization

Recent messages caching untuk faster loading:

```typescript
// Cache recent messages (30 minutes TTL)
await RedisService.cacheRecentMessages(chatId, messages);

// Quick message retrieval
const cached = await RedisService.getRecentMessages(chatId);
```

**Production Benefits:**
- Faster chat loading
- Reduced database load
- Better user experience
- Scalable message history

## Monitoring & Health Checks

### Redis Health Status

```typescript
// Check Redis availability
const isAvailable = RedisService.isAvailable();

// Get detailed stats
const stats = await RedisService.getStats();
```

### Health Check Endpoint

Tambahkan health check untuk Redis:

```typescript
// In routes.ts
app.get('/api/health/redis', (req, res) => {
  const isRedisHealthy = RedisService.isAvailable();
  const stats = await RedisService.getStats();
  
  res.json({
    redis: {
      status: isRedisHealthy ? 'healthy' : 'unavailable',
      stats: stats
    }
  });
});
```

## Deployment Checklist

### ✅ Pre-deployment
- [ ] Redis instance configured dan accessible
- [ ] REDIS_URL environment variable set
- [ ] Authentication credentials configured
- [ ] SSL/TLS enabled untuk production
- [ ] Firewall rules configured
- [ ] Memory limits set appropriately

### ✅ Post-deployment
- [ ] Redis connection successful
- [ ] Pub/sub messaging working
- [ ] Session caching functional
- [ ] Rate limiting active
- [ ] Health checks passing
- [ ] Monitoring alerts setup

## Fallback Strategy

Aplikasi dirancang untuk berfungsi tanpa Redis (graceful degradation):

```typescript
// Automatic fallback without Redis
if (!RedisService.isAvailable()) {
  // Falls back to:
  // - Database-only messaging
  // - In-memory session storage
  // - Basic rate limiting
  // - Direct WebSocket communication
}
```

**Fallback Features:**
- Chat masih berfungsi (tanpa scaling)
- Session tetap valid (PostgreSQL storage)
- Rate limiting basic (in-memory)
- WebSocket direct communication

## Cost Optimization

### Development
```bash
# Local Redis (gratis)
REDIS_URL=redis://localhost:6379

# Atau disable Redis untuk development
# REDIS_URL tidak di-set = auto fallback
```

### Production
```bash
# Railway Redis Plugin (~$5/month)
# AWS ElastiCache (~$15/month untuk t3.micro)
# Google Memorystore (~$20/month untuk 1GB)
```

## Troubleshooting

### Common Issues

**1. Connection Timeout**
```bash
# Check Redis accessibility
redis-cli -h hostname -p port ping

# Verify REDIS_URL format
REDIS_URL=redis://username:password@hostname:port
```

**2. Authentication Failed**
```bash
# Check credentials
redis-cli -h hostname -p port -a password ping

# Verify password in REDIS_URL
REDIS_URL=redis://:password@hostname:port
```

**3. Memory Issues**
```bash
# Check Redis memory usage
redis-cli info memory

# Configure memory policy
CONFIG SET maxmemory-policy allkeys-lru
```

### Debug Commands

```bash
# Check Redis status
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check active connections
redis-cli client list

# View memory usage
redis-cli info memory
```

## Conclusion

Redis implementation dalam NubiluXchange sudah production-ready dengan features:

1. **Scalability**: Pub/sub untuk multi-server deployment
2. **Performance**: Caching untuk faster response times
3. **Security**: Rate limiting dan session management
4. **Reliability**: Graceful fallback tanpa Redis
5. **Monitoring**: Health checks dan statistics

Redis sangat direkomendasikan untuk production deployment, terutama untuk:
- High-traffic chat applications
- Multi-server horizontal scaling
- Real-time messaging requirements
- Performance optimization needs

Untuk development atau small-scale deployment, aplikasi dapat berjalan tanpa Redis dengan automatic fallback ke database storage.