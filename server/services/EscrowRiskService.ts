import { logInfo, logError, logWarning } from '../utils/logger';
import { RedisService } from './RedisService';
import type { Request } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { MediaRepository } from '../repositories/MediaRepository';
import { ChatRepository } from '../repositories/ChatRepository';

const userRepo = new UserRepository();
const productRepo = new ProductRepository();
const transactionRepo = new TransactionRepository();
const mediaRepo = new MediaRepository();
const chatRepo = new ChatRepository();

export interface RiskAssessment {
  score: number; // 0-100, higher is riskier
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  requiresManualReview: boolean;
  // Enhanced fields for ML and advanced analysis
  confidence: number; // 0-100, how confident the model is
  fraudProbability: number; // 0-100, ML-based fraud probability
  riskProfile: {
    deviceRisk: number;
    behavioralRisk: number;
    locationRisk: number;
    velocityRisk: number;
  };
  alerts: Array<{
    type: 'warning' | 'critical';
    message: string;
    code: string;
  }>;
}

export interface TransactionRisk {
  userId: number;
  productId: number;
  transactionAmount: string;
  assessment: RiskAssessment;
  timestamp: Date;
}

export class EscrowRiskService {
  private static readonly RISK_WEIGHTS = {
    NEW_USER: 15,
    HIGH_VALUE_TRANSACTION: 20,
    MULTIPLE_FAILED_TRANSACTIONS: 25,
    SUSPICIOUS_CHAT_ACTIVITY: 10,
    ACCOUNT_AGE: 10,
    SELLER_REPUTATION: 15,
    PRODUCT_CATEGORY_RISK: 10,
    TIME_OF_TRANSACTION: 5,
    LOCATION_MISMATCH: 8,
    PAYMENT_METHOD_RISK: 12,
    // New advanced detection weights
    DEVICE_FINGERPRINTING: 18,
    VELOCITY_ANALYSIS: 22,
    BEHAVIORAL_ANOMALY: 20,
    GEO_LOCATION_RISK: 15,
    PROXY_VPN_USAGE: 25,
    PATTERN_RECOGNITION: 16
  };

  private static readonly RISK_THRESHOLDS = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90
  };

  /**
   * Assess transaction risk before processing
   */
  static async assessTransactionRisk(
    userId: number,
    productId: number,
    transactionAmount: string,
    req?: Request
  ): Promise<RiskAssessment> {
    try {
      const factors: string[] = [];
      let riskScore = 0;

      // Get user and product details
      const [user, product] = await Promise.all([
        userRepo.getUser(userId),
        productRepo.getProduct(productId)
      ]);

      if (!user || !product) {
        return {
          score: 100,
          level: 'critical',
          factors: ['User or product not found'],
          recommendations: ['Block transaction'],
          requiresManualReview: true,
          confidence: 100,
          fraudProbability: 95,
          riskProfile: {
            deviceRisk: 0,
            behavioralRisk: 0,
            locationRisk: 0,
            velocityRisk: 0
          },
          alerts: [{
            type: 'critical',
            message: 'User or product not found',
            code: 'USER_PRODUCT_NOT_FOUND'
          }]
        };
      }

      // 1. User Account Age Assessment
      const accountAge = this.calculateAccountAge(user.createdAt);
      if (accountAge < 7) {
        riskScore += this.RISK_WEIGHTS.NEW_USER;
        factors.push(`New user account (${accountAge} days old)`);
      } else if (accountAge < 30) {
        riskScore += this.RISK_WEIGHTS.ACCOUNT_AGE;
        factors.push(`Recent user account (${accountAge} days old)`);
      }

      // 2. Transaction Amount Assessment
      const amount = parseFloat(transactionAmount);
      if (amount > 5000000) { // > 5 million IDR
        riskScore += this.RISK_WEIGHTS.HIGH_VALUE_TRANSACTION;
        factors.push(`High value transaction (Rp ${amount.toLocaleString('id-ID')})`);
      }

      // 3. User Transaction History
      const userTransactions = await transactionRepo.getTransactionsByUser(userId);
      const failedTransactions = userTransactions.filter(t => t.status === 'failed').length;
      if (failedTransactions > 3) {
        riskScore += this.RISK_WEIGHTS.MULTIPLE_FAILED_TRANSACTIONS;
        factors.push(`Multiple failed transactions (${failedTransactions})`);
      }

      // 4. Seller Reputation Assessment
      const sellerStats = await mediaRepo.getSellerReviewStats(product.sellerId);
      if (sellerStats.averageRating < 3.0 || sellerStats.totalReviews < 5) {
        riskScore += this.RISK_WEIGHTS.SELLER_REPUTATION;
        factors.push(`Low seller reputation (${sellerStats.averageRating}/5, ${sellerStats.totalReviews} reviews)`);
      }

      // 5. Product Category Risk
      const riskyCategoryKeywords = ['rank', 'boost', 'account', 'rare', 'limited'];
      const productTitle = product.title.toLowerCase();
      if (riskyCategoryKeywords.some(keyword => productTitle.includes(keyword))) {
        riskScore += this.RISK_WEIGHTS.PRODUCT_CATEGORY_RISK;
        factors.push('Product in high-risk category (gaming accounts/boosting)');
      }

      // 6. Chat Activity Analysis
      const chatRisk = await this.analyzeChatActivity(userId, productId);
      if (chatRisk.isSuspicious) {
        riskScore += this.RISK_WEIGHTS.SUSPICIOUS_CHAT_ACTIVITY;
        factors.push(chatRisk.reason);
      }

      // 7. Time-based Assessment
      const timeRisk = this.assessTransactionTime();
      if (timeRisk.isRisky) {
        riskScore += this.RISK_WEIGHTS.TIME_OF_TRANSACTION;
        factors.push(timeRisk.reason);
      }

      // 8. Payment Method Assessment (if available)
      if (req) {
        const paymentRisk = this.assessPaymentMethod(req);
        if (paymentRisk.isRisky) {
          riskScore += this.RISK_WEIGHTS.PAYMENT_METHOD_RISK;
          factors.push(paymentRisk.reason);
        }
      }

      // 9. Rate Limiting Check
      const isRateLimited = await this.checkTransactionRateLimit(userId);
      if (isRateLimited) {
        riskScore += 20; // Additional penalty for rapid transactions
        factors.push('Multiple transactions in short period');
      }

      // 10. ADVANCED: Device Fingerprinting Analysis
      const deviceRisk = await this.analyzeDeviceFingerprint(req);
      if (deviceRisk.isRisky) {
        riskScore += this.RISK_WEIGHTS.DEVICE_FINGERPRINTING;
        factors.push(deviceRisk.reason);
      }

      // 11. ADVANCED: Velocity Analysis
      const velocityRisk = await this.analyzeTransactionVelocity(userId);
      if (velocityRisk.isRisky) {
        riskScore += this.RISK_WEIGHTS.VELOCITY_ANALYSIS;
        factors.push(velocityRisk.reason);
      }

      // 12. ADVANCED: Behavioral Pattern Recognition
      const behaviorRisk = await this.analyzeBehavioralPatterns(userId, productId, parseFloat(transactionAmount));
      if (behaviorRisk.isRisky) {
        riskScore += this.RISK_WEIGHTS.BEHAVIORAL_ANOMALY;
        factors.push(behaviorRisk.reason);
      }

      // 13. ADVANCED: Geo-location Risk Assessment
      const geoRisk = await this.analyzeGeoLocationRisk(req);
      if (geoRisk.isRisky) {
        riskScore += this.RISK_WEIGHTS.GEO_LOCATION_RISK;
        factors.push(geoRisk.reason);
      }

      // IMPORTANT: Cap risk score to 100 to prevent inflation
      riskScore = Math.min(100, riskScore);

      // Determine risk level and recommendations
      const { level, recommendations, requiresManualReview } = this.calculateRiskLevel(riskScore, factors);

      // Calculate ML-based fraud probability and confidence
      const fraudProbability = this.calculateFraudProbability(riskScore, factors);
      const confidence = this.calculateConfidence(riskScore, factors.length);

      // Create alerts based on risk factors
      const alerts = this.generateRiskAlerts(riskScore, factors, level);

      // Build detailed risk profile
      const riskProfile = {
        deviceRisk: deviceRisk.score,
        behavioralRisk: behaviorRisk.score,
        locationRisk: geoRisk.score,
        velocityRisk: velocityRisk.score
      };

      // Cache risk assessment for quick lookup
      const assessment: RiskAssessment = {
        score: riskScore,
        level,
        factors,
        recommendations,
        requiresManualReview,
        confidence,
        fraudProbability,
        riskProfile,
        alerts
      };

      await this.cacheRiskAssessment(userId, productId, assessment);

      logInfo(`Risk assessment completed for user ${userId}, product ${productId}: ${level} (${riskScore}/100)`);
      
      return assessment;

    } catch (error) {
      logError(error, `Risk assessment failed for user ${userId}, product ${productId}`);
      
      // Return high risk on assessment failure
      return {
        score: 85,
        level: 'high',
        factors: ['Risk assessment system error'],
        recommendations: ['Manual review required', 'Consider delaying transaction'],
        requiresManualReview: true,
        confidence: 50,
        fraudProbability: 75,
        riskProfile: {
          deviceRisk: 0,
          behavioralRisk: 0,
          locationRisk: 0,
          velocityRisk: 0
        },
        alerts: [{
          type: 'warning',
          message: 'Risk assessment system error',
          code: 'SYSTEM_ERROR'
        }]
      };
    }
  }

  /**
   * Calculate account age in days
   */
  private static calculateAccountAge(createdAt: Date | null): number {
    if (!createdAt) return 0;
    const diffTime = Math.abs(Date.now() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze chat activity for suspicious patterns
   */
  private static async analyzeChatActivity(userId: number, productId: number): Promise<{
    isSuspicious: boolean;
    reason: string;
  }> {
    try {
      // Get chat between buyer and seller for this product
      const chats = await chatRepo.getChatsByUser(userId);
      const relevantChat = chats.find(chat => chat.productId === productId);
      
      if (!relevantChat) {
        return { isSuspicious: true, reason: 'No chat communication before transaction' };
      }

      const messages = await chatRepo.getMessagesByChatId(relevantChat.id);
      
      // Check for suspicious patterns
      if (messages.length === 0) {
        return { isSuspicious: true, reason: 'No messages exchanged before transaction' };
      }

      // Check for very rapid progression to purchase
      const chatCreatedAt = relevantChat.createdAt || new Date();
      const now = new Date();
      const chatDuration = now.getTime() - chatCreatedAt.getTime();
      const durationMinutes = chatDuration / (1000 * 60);
      
      if (durationMinutes < 5 && messages.length < 3) {
        return { isSuspicious: true, reason: 'Very rapid progression to transaction (< 5 minutes)' };
      }

      // Check for spam-like behavior
      const userMessages = messages.filter(m => m.senderId === userId);
      if (userMessages.length > 20 && durationMinutes < 10) {
        return { isSuspicious: true, reason: 'Excessive messaging in short time period' };
      }

      return { isSuspicious: false, reason: 'Normal chat activity' };
      
    } catch (error) {
      logError(error, 'Chat activity analysis failed');
      return { isSuspicious: true, reason: 'Unable to analyze chat activity' };
    }
  }

  /**
   * Assess transaction time for unusual patterns
   */
  private static assessTransactionTime(): { isRisky: boolean; reason: string } {
    const now = new Date();
    const hour = now.getHours();
    
    // Consider late night/early morning transactions as slightly risky
    if (hour >= 23 || hour <= 5) {
      return { 
        isRisky: true, 
        reason: 'Transaction during unusual hours (11 PM - 5 AM)' 
      };
    }

    return { isRisky: false, reason: 'Normal transaction time' };
  }

  /**
   * Assess payment method risk factors
   */
  private static assessPaymentMethod(req: Request): { isRisky: boolean; reason: string } {
    // Check for unusual request patterns
    const userAgent = req.headers['user-agent'];
    const origin = req.headers.origin;
    
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('curl')) {
      return { isRisky: true, reason: 'Suspicious user agent' };
    }

    // Additional checks could include IP analysis, but we'll keep it simple
    return { isRisky: false, reason: 'Normal payment method' };
  }

  /**
   * Check if user is making transactions too rapidly
   */
  private static async checkTransactionRateLimit(userId: number): Promise<boolean> {
    try {
      if (!RedisService.isAvailable()) {
        logWarning('Rate limiting unavailable - Redis not connected', {
          userId,
          operation: 'transaction_rate_limit_check'
        });
        return false; // Allow transaction but log the limitation
      }

      const key = `transaction_rate_limit:${userId}`;
      const recentTransactions = await RedisService.instance.get(key);
      
      if (!recentTransactions) {
        await RedisService.instance.setex(key, 3600, '1'); // 1 hour window
        return false;
      }

      const count = parseInt(recentTransactions);
      if (count >= 5) { // More than 5 transactions per hour
        return true;
      }

      await RedisService.instance.incr(key);
      return false;

    } catch (error) {
      logError(error, 'Transaction rate limit check failed');
      return false; // Don't block on Redis failure
    }
  }

  /**
   * Calculate final risk level and recommendations
   */
  private static calculateRiskLevel(score: number, factors: string[]): {
    level: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
    requiresManualReview: boolean;
  } {
    let level: 'low' | 'medium' | 'high' | 'critical';
    let recommendations: string[] = [];
    let requiresManualReview = false;

    if (score <= this.RISK_THRESHOLDS.LOW) {
      level = 'low';
      recommendations = ['Process transaction normally'];
    } else if (score <= this.RISK_THRESHOLDS.MEDIUM) {
      level = 'medium';
      recommendations = [
        'Additional verification recommended',
        'Monitor transaction closely'
      ];
    } else if (score <= this.RISK_THRESHOLDS.HIGH) {
      level = 'high';
      recommendations = [
        'Hold transaction for 24 hours',
        'Require additional identity verification',
        'Contact user to verify transaction intent'
      ];
      requiresManualReview = true;
    } else {
      level = 'critical';
      recommendations = [
        'Block transaction temporarily',
        'Require manual admin approval',
        'Comprehensive identity verification needed',
        'Contact customer support'
      ];
      requiresManualReview = true;
    }

    return { level, recommendations, requiresManualReview };
  }

  /**
   * Cache risk assessment for quick lookup
   */
  private static async cacheRiskAssessment(
    userId: number, 
    productId: number, 
    assessment: RiskAssessment
  ): Promise<void> {
    try {
      if (!RedisService.isAvailable()) return;

      const key = `risk_assessment:${userId}:${productId}`;
      await RedisService.instance.setex(key, 3600, JSON.stringify(assessment)); // 1 hour TTL
    } catch (error) {
      logError(error, 'Failed to cache risk assessment');
    }
  }

  /**
   * Get cached risk assessment
   */
  static async getCachedRiskAssessment(
    userId: number, 
    productId: number
  ): Promise<RiskAssessment | null> {
    try {
      if (!RedisService.isAvailable()) return null;

      const key = `risk_assessment:${userId}:${productId}`;
      const cached = await RedisService.instance.get(key);
      
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logError(error, 'Failed to get cached risk assessment');
      return null;
    }
  }

  /**
   * Update risk assessment after transaction completion
   */
  static async updatePostTransactionRisk(
    userId: number,
    transactionId: number,
    wasSuccessful: boolean
  ): Promise<void> {
    try {
      // Update user risk profile based on transaction outcome
      const key = `user_risk_profile:${userId}`;
      
      if (RedisService.isAvailable()) {
        const profile = await RedisService.instance.get(key);
        let riskProfile = profile ? JSON.parse(profile) : {
          successfulTransactions: 0,
          failedTransactions: 0,
          lastTransactionDate: null,
          riskScore: 50 // Start with medium risk
        };

        if (wasSuccessful) {
          riskProfile.successfulTransactions++;
          riskProfile.riskScore = Math.max(0, riskProfile.riskScore - 2); // Reduce risk slightly
        } else {
          riskProfile.failedTransactions++;
          riskProfile.riskScore = Math.min(100, riskProfile.riskScore + 10); // Increase risk
        }

        riskProfile.lastTransactionDate = new Date().toISOString();
        
        await RedisService.instance.setex(key, 86400 * 30, JSON.stringify(riskProfile)); // 30 days TTL
      }

      logInfo(`Updated risk profile for user ${userId} after transaction ${transactionId}: ${wasSuccessful ? 'success' : 'failure'}`);
      
    } catch (error) {
      logError(error, `Failed to update post-transaction risk for user ${userId}`);
    }
  }

  // ========================
  // ADVANCED DETECTION METHODS
  // ========================

  /**
   * ADVANCED: Analyze device fingerprint for suspicious patterns
   */
  private static async analyzeDeviceFingerprint(req?: Request): Promise<{
    isRisky: boolean;
    reason: string;
    score: number;
  }> {
    try {
      if (!req) {
        return { isRisky: false, reason: 'No request data available', score: 0 };
      }

      let riskScore = 0;
      const factors: string[] = [];

      // Analyze User Agent
      const userAgent = req.headers['user-agent'] || '';
      
      // Check for suspicious user agents
      const suspiciousAgents = ['bot', 'crawler', 'curl', 'wget', 'postman'];
      if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
        riskScore += 30;
        factors.push('Automated/bot user agent detected');
      }

      // Check for missing or generic user agent
      if (!userAgent || userAgent.length < 20) {
        riskScore += 20;
        factors.push('Missing or suspicious user agent');
      }

      // Analyze headers for true proxy/VPN usage (not standard CDN/reverse proxy)
      const suspiciousProxyHeaders = [
        'x-proxy-id',          // True proxy identifier  
        'via',                 // Explicit proxy chain
        'x-forwarded-host'     // Host forwarding (more suspicious than just IP)
      ];

      // Only flag as suspicious if multiple proxy indicators or specific suspicious headers
      const proxyIndicators = suspiciousProxyHeaders.filter(header => req.headers[header]).length;
      const hasXFF = req.headers['x-forwarded-for'];
      const hasXRealIP = req.headers['x-real-ip'];

      // More sophisticated proxy detection
      if (proxyIndicators >= 2) {
        riskScore += 25;
        factors.push('Multiple proxy indicators detected');
      } else if (req.headers['x-proxy-id']) {
        riskScore += 20;
        factors.push('Explicit proxy usage detected');
      } else if (hasXFF && hasXRealIP && req.headers['via']) {
        riskScore += 15;
        factors.push('Complex proxy chain detected');
      }
      // Note: Standard x-forwarded-for from CDN/load balancer is now ignored

      // Check for missing common headers
      const commonHeaders = ['accept', 'accept-language', 'accept-encoding'];
      const missingHeaders = commonHeaders.filter(header => !req.headers[header]);
      if (missingHeaders.length > 1) {
        riskScore += 15;
        factors.push('Missing common browser headers');
      }

      // Cache device fingerprint (SECURITY: only store safe, non-sensitive data)
      if (RedisService.isAvailable()) {
        // Create secure fingerprint hash without sensitive headers
        const safeHeaders = {
          'accept': req.headers['accept'],
          'accept-language': req.headers['accept-language'], 
          'accept-encoding': req.headers['accept-encoding'],
          'user-agent': userAgent
        };
        
        // Generate fingerprint hash for privacy
        const crypto = require('crypto');
        const fingerprintData = JSON.stringify({
          safeHeaders,
          ip: req.ip
        });
        const fingerprintHash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
        
        const fingerprint = {
          hash: fingerprintHash,
          riskScore,
          userAgentLength: userAgent.length,
          hasAcceptHeaders: !!req.headers['accept'],
          timestamp: new Date().toISOString()
        };
        
        const fingerprintKey = `device_fingerprint:${fingerprintHash.substring(0, 16)}`;
        await RedisService.instance.setex(fingerprintKey, 86400, JSON.stringify(fingerprint));
      }

      return {
        isRisky: riskScore > 30,
        reason: factors.join(', ') || 'Normal device fingerprint',
        score: Math.min(100, riskScore)
      };

    } catch (error) {
      logError(error, 'Device fingerprint analysis failed');
      return { isRisky: true, reason: 'Device analysis error', score: 50 };
    }
  }

  /**
   * ADVANCED: Analyze transaction velocity patterns
   */
  private static async analyzeTransactionVelocity(userId: number): Promise<{
    isRisky: boolean;
    reason: string;
    score: number;
  }> {
    try {
      if (!RedisService.isAvailable()) {
        // Fallback: In-memory velocity tracking (temporary, not persistent)
        return await this.analyzeVelocityFallback(userId);
      }

      const now = Date.now();
      const hourKey = `velocity_hour:${userId}`;
      const dayKey = `velocity_day:${userId}`;
      const weekKey = `velocity_week:${userId}`;

      // Get transaction counts for different time windows
      const [hourCount, dayCount, weekCount] = await Promise.all([
        RedisService.instance.get(hourKey).then(val => parseInt(val || '0')),
        RedisService.instance.get(dayKey).then(val => parseInt(val || '0')),
        RedisService.instance.get(weekKey).then(val => parseInt(val || '0'))
      ]);

      let riskScore = 0;
      const factors: string[] = [];

      // Check hourly velocity
      if (hourCount >= 10) {
        riskScore += 40;
        factors.push(`High hourly velocity: ${hourCount} transactions/hour`);
      } else if (hourCount >= 5) {
        riskScore += 20;
        factors.push(`Moderate hourly velocity: ${hourCount} transactions/hour`);
      }

      // Check daily velocity
      if (dayCount >= 50) {
        riskScore += 35;
        factors.push(`High daily velocity: ${dayCount} transactions/day`);
      } else if (dayCount >= 20) {
        riskScore += 15;
        factors.push(`Moderate daily velocity: ${dayCount} transactions/day`);
      }

      // Check weekly patterns
      if (weekCount >= 200) {
        riskScore += 30;
        factors.push(`Extremely high weekly activity: ${weekCount} transactions/week`);
      }

      // Update velocity counters
      await Promise.all([
        RedisService.instance.incr(hourKey).then(() => RedisService.instance.expire(hourKey, 3600)),
        RedisService.instance.incr(dayKey).then(() => RedisService.instance.expire(dayKey, 86400)),
        RedisService.instance.incr(weekKey).then(() => RedisService.instance.expire(weekKey, 604800))
      ]);

      return {
        isRisky: riskScore > 25,
        reason: factors.join(', ') || 'Normal transaction velocity',
        score: Math.min(100, riskScore)
      };

    } catch (error) {
      logError(error, 'Velocity analysis failed');
      return { isRisky: true, reason: 'Velocity analysis error', score: 30 };
    }
  }

  /**
   * ADVANCED: Analyze behavioral patterns for anomalies
   */
  private static async analyzeBehavioralPatterns(userId: number, productId: number, currentAmount: number): Promise<{
    isRisky: boolean;
    reason: string;
    score: number;
  }> {
    try {
      let riskScore = 0;
      const factors: string[] = [];

      // Get user's historical transaction data
      const userTransactions = await transactionRepo.getTransactionsByUser(userId);
      
      if (userTransactions.length < 2) {
        return { isRisky: false, reason: 'Insufficient transaction history', score: 0 };
      }

      // Analyze transaction patterns
      const historicalAmounts = userTransactions.map(t => parseFloat(t.amount));
      const averageAmount = historicalAmounts.reduce((sum, amount) => sum + amount, 0) / historicalAmounts.length;
      
      // Calculate standard deviation for statistical analysis
      const variance = historicalAmounts.reduce((sum, amount) => sum + Math.pow(amount - averageAmount, 2), 0) / historicalAmounts.length;
      const stdDeviation = Math.sqrt(variance);

      // Check for unusual amount patterns using z-score approach
      const zScore = stdDeviation > 0 ? Math.abs((currentAmount - averageAmount) / stdDeviation) : 0;
      
      if (currentAmount > averageAmount * 10) {
        riskScore += 30;
        factors.push(`Transaction amount extremely high (${(currentAmount/averageAmount).toFixed(1)}x avg): Rp ${currentAmount.toLocaleString('id-ID')}`);
      } else if (zScore > 3) { // 3 standard deviations from mean
        riskScore += 20;
        factors.push(`Transaction amount statistically unusual (${zScore.toFixed(1)} std dev from avg)`);
      } else if (currentAmount > averageAmount * 5) {
        riskScore += 15;
        factors.push(`Transaction amount significantly higher than historical average`);
      }

      // Analyze timing patterns
      const timestamps = userTransactions
        .map(t => t.createdAt)
        .filter(t => t !== null)
        .map(t => new Date(t!).getTime())
        .sort((a, b) => a - b);

      if (timestamps.length >= 3) {
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }

        // Check for pattern of very rapid transactions
        const shortIntervals = intervals.filter(interval => interval < 300000); // < 5 minutes
        if (shortIntervals.length > intervals.length * 0.5) {
          riskScore += 20;
          factors.push('Pattern of rapid consecutive transactions detected');
        }
      }

      // Check for repetitive product categories
      const product = await productRepo.getProduct(productId);
      if (product) {
        const sameCategory = userTransactions.filter(t => {
          // This would need to be implemented based on your product schema
          return t.metadata && (t.metadata as any).productCategory === product.category;
        });

        if (sameCategory.length === userTransactions.length && sameCategory.length > 5) {
          riskScore += 15;
          factors.push('All transactions in same product category - possible automation');
        }
      }

      return {
        isRisky: riskScore > 20,
        reason: factors.join(', ') || 'Normal behavioral patterns',
        score: Math.min(100, riskScore)
      };

    } catch (error) {
      logError(error, 'Behavioral pattern analysis failed');
      return { isRisky: true, reason: 'Behavioral analysis error', score: 25 };
    }
  }

  /**
   * ADVANCED: Analyze geo-location risk factors
   */
  private static async analyzeGeoLocationRisk(req?: Request): Promise<{
    isRisky: boolean;
    reason: string;
    score: number;
  }> {
    try {
      if (!req || !req.ip) {
        return { isRisky: false, reason: 'No IP information available', score: 0 };
      }

      let riskScore = 0;
      const factors: string[] = [];
      const clientIP = req.ip;

      // Check for localhost/development IPs
      if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('192.168.')) {
        return { isRisky: false, reason: 'Local/development environment', score: 0 };
      }

      // Check for known high-risk IP ranges (this would need a proper IP geolocation service)
      const suspiciousPatterns = [
        /^10\./,      // Private networks sometimes used by VPNs
        /^172\.16/,   // Private networks
        /^169\.254/   // Link-local addresses
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(clientIP))) {
        riskScore += 15;
        factors.push('Suspicious IP range detected');
      }

      // Cache IP reputation (in real implementation, this would query external services)
      if (RedisService.isAvailable()) {
        const ipKey = `ip_reputation:${clientIP}`;
        const existingReputation = await RedisService.instance.get(ipKey);
        
        if (existingReputation) {
          const reputation = JSON.parse(existingReputation);
          if (reputation.riskScore > 50) {
            riskScore += reputation.riskScore / 2;
            factors.push('IP has poor reputation history');
          }
        } else {
          // Store new IP reputation
          await RedisService.instance.setex(ipKey, 86400 * 7, JSON.stringify({
            firstSeen: new Date().toISOString(),
            riskScore: 0,
            transactionCount: 1
          }));
        }
      }

      return {
        isRisky: riskScore > 20,
        reason: factors.join(', ') || 'Normal geo-location profile',
        score: Math.min(100, riskScore)
      };

    } catch (error) {
      logError(error, 'Geo-location analysis failed');
      return { isRisky: true, reason: 'Geo-location analysis error', score: 20 };
    }
  }

  /**
   * Calculate ML-based fraud probability
   */
  private static calculateFraudProbability(riskScore: number, factors: string[]): number {
    // ML-inspired calculation with proper normalization (no double-boosting)
    // Base probability is already normalized risk score (0-100)
    let fraudProbability = riskScore;

    // Adjust based on factor types (but avoid inflating beyond 100)
    const highRiskFactors = [
      'multiple failed transactions',
      'proxy',
      'automated',
      'bot',
      'extremely high weekly activity',
      'statistically unusual'
    ];

    const factorText = factors.join(' ').toLowerCase();
    const highRiskMatches = highRiskFactors.filter(factor => 
      factorText.includes(factor.toLowerCase())
    ).length;

    // Moderate boost for factor combinations (avoid over-inflation)
    if (highRiskMatches >= 3) {
      fraudProbability = Math.min(100, fraudProbability * 1.1);
    } else if (highRiskMatches >= 2) {
      fraudProbability = Math.min(100, fraudProbability * 1.05);
    }

    return Math.round(Math.min(100, fraudProbability));
  }

  /**
   * Fallback velocity analysis when Redis is unavailable
   * Uses in-memory tracking (not persistent across restarts)
   */
  private static velocityTracker = new Map<number, Array<{ timestamp: number; count: number }>>();

  private static async analyzeVelocityFallback(userId: number): Promise<{
    isRisky: boolean;
    reason: string;
    score: number;
  }> {
    try {
      const now = Date.now();
      const userHistory = this.velocityTracker.get(userId) || [];
      
      // Clean old entries (older than 1 hour)
      const recentHistory = userHistory.filter(entry => now - entry.timestamp < 3600000);
      
      // Count transactions in last hour
      const hourCount = recentHistory.reduce((sum, entry) => sum + entry.count, 0);
      
      let riskScore = 0;
      const factors: string[] = [];

      // Apply velocity rules
      if (hourCount >= 10) {
        riskScore += 40;
        factors.push(`High hourly velocity (in-memory): ${hourCount} transactions/hour`);
      } else if (hourCount >= 5) {
        riskScore += 20;
        factors.push(`Moderate hourly velocity (in-memory): ${hourCount} transactions/hour`);
      }

      // Update tracker
      recentHistory.push({ timestamp: now, count: 1 });
      this.velocityTracker.set(userId, recentHistory);

      return {
        isRisky: riskScore > 25,
        reason: factors.join(', ') || 'Normal transaction velocity (in-memory tracking)',
        score: Math.min(100, riskScore)
      };

    } catch (error) {
      logError(error, 'Velocity analysis fallback failed');
      return { isRisky: false, reason: 'Velocity analysis fallback error', score: 0 };
    }
  }

  /**
   * Calculate confidence level in the assessment
   */
  private static calculateConfidence(riskScore: number, factorCount: number): number {
    // Base confidence on amount of data available
    let confidence = 60; // Base confidence

    // More factors = higher confidence
    confidence += Math.min(30, factorCount * 5);

    // Extreme scores have higher confidence
    if (riskScore > 80 || riskScore < 20) {
      confidence += 10;
    }

    return Math.min(100, Math.round(confidence));
  }

  /**
   * Generate risk alerts based on assessment
   */
  private static generateRiskAlerts(
    riskScore: number, 
    factors: string[], 
    level: string
  ): Array<{ type: 'warning' | 'critical'; message: string; code: string; }> {
    const alerts: Array<{ type: 'warning' | 'critical'; message: string; code: string; }> = [];

    // Critical level alerts
    if (level === 'critical') {
      alerts.push({
        type: 'critical',
        message: 'Transaction blocked due to critical risk level',
        code: 'CRITICAL_RISK_DETECTED'
      });
    }

    // Specific factor-based alerts
    const factorText = factors.join(' ').toLowerCase();

    if (factorText.includes('multiple failed transactions')) {
      alerts.push({
        type: 'warning',
        message: 'User has multiple failed transaction history',
        code: 'FAILED_TRANSACTION_PATTERN'
      });
    }

    if (factorText.includes('proxy') || factorText.includes('vpn')) {
      alerts.push({
        type: 'warning',
        message: 'VPN or proxy usage detected',
        code: 'PROXY_VPN_DETECTED'
      });
    }

    if (factorText.includes('bot') || factorText.includes('automated')) {
      alerts.push({
        type: 'critical',
        message: 'Automated/bot activity detected',
        code: 'BOT_ACTIVITY_DETECTED'
      });
    }

    if (factorText.includes('velocity') || factorText.includes('rapid')) {
      alerts.push({
        type: 'warning',
        message: 'High transaction velocity detected',
        code: 'HIGH_VELOCITY_DETECTED'
      });
    }

    // Risk score based alerts
    if (riskScore > 90) {
      alerts.push({
        type: 'critical',
        message: 'Extremely high risk score - immediate review required',
        code: 'EXTREME_RISK_SCORE'
      });
    }

    return alerts;
  }
}