import { SecurityAlertService } from "./SecurityAlertService";
import { SMSAlertService } from "./SMSAlertService";
import { logError, logInfo } from "../utils/logger";
import type { Request } from "express";

export interface ConnectionMetrics {
  totalConnections: number;
  secureConnections: number;
  insecureConnections: number;
  suspiciousConnections: number;
  averageConnectionTime: number;
  uniqueIPs: number;
  vpnConnections: number;
  anomalousConnections: number;
}

export interface ConnectionAlert {
  id: string;
  userId?: number;
  ipAddress: string;
  userAgent: string;
  alertType: 'insecure_connection' | 'vpn_detected' | 'suspicious_location' | 'multiple_sessions' | 'anomalous_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export interface UserConnection {
  userId: number;
  ipAddress: string;
  userAgent: string;
  isSecure: boolean;
  country?: string;
  city?: string;
  isVPN: boolean;
  sessionId: string;
  connectedAt: Date;
  lastActivity: Date;
  riskScore: number;
}

export class ConnectionSecurityService {
  private static connections = new Map<string, UserConnection>();
  private static connectionHistory: UserConnection[] = [];
  private static alerts: ConnectionAlert[] = [];
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  private static readonly RISK_THRESHOLDS = {
    INSECURE_CONNECTION: 30,
    VPN_DETECTED: 20,
    SUSPICIOUS_LOCATION: 40,
    MULTIPLE_SESSIONS: 50,
    HIGH_RISK_THRESHOLD: 70
  };

  /**
   * Monitor user connection for security issues
   */
  static async monitorConnection(
    userId: number,
    sessionId: string,
    req: Request
  ): Promise<{ riskScore: number; alerts: ConnectionAlert[] }> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    try {
      // Check for existing connection
      const existingConnection = this.connections.get(`${userId}:${sessionId}`);
      
      // Analyze connection security
      const geoData = await this.analyzeGeoLocation(ipAddress);
      const vpnCheck = await this.checkVPNUsage(ipAddress, userAgent);
      const riskScore = this.calculateRiskScore(isSecure, geoData, vpnCheck, userId, ipAddress);
      
      const connection: UserConnection = {
        userId,
        ipAddress,
        userAgent,
        isSecure,
        country: geoData?.country,
        city: geoData?.city,
        isVPN: vpnCheck.isVPN,
        sessionId,
        connectedAt: existingConnection?.connectedAt || new Date(),
        lastActivity: new Date(),
        riskScore
      };

      // Update connection tracking
      this.connections.set(`${userId}:${sessionId}`, connection);
      this.connectionHistory.push(connection);
      
      // Keep history manageable
      if (this.connectionHistory.length > 10000) {
        this.connectionHistory = this.connectionHistory.slice(-5000);
      }

      // Generate alerts based on risk analysis
      const alerts = await this.generateSecurityAlerts(connection, req);
      
      // Log high risk connections
      if (riskScore >= this.RISK_THRESHOLDS.HIGH_RISK_THRESHOLD) {
        const securityContext = {
          userId,
          ipAddress,
          riskScore,
          isSecure,
          isVPN: vpnCheck.isVPN,
          country: geoData?.country,
          userAgent: req.headers['user-agent']
        };
        logError(
          new Error(`High risk connection detected: ${JSON.stringify(securityContext)}`), 
          'High risk connection detected', 
          userId
        );
      }
      
      return { riskScore, alerts };
    } catch (error: any) {
      logError(error, 'Failed to monitor connection security');
      return { riskScore: 0, alerts: [] };
    }
  }

  /**
   * Check SSL/HTTPS security
   */
  static checkSSLSecurity(req: Request): {
    isSecure: boolean;
    protocol: string;
    warnings: string[];
  } {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const protocol = req.protocol;
    const warnings: string[] = [];
    
    if (!isSecure) {
      warnings.push('Connection is not using HTTPS/SSL encryption');
    }
    
    // Check for insecure headers
    const xForwardedProto = req.headers['x-forwarded-proto'];
    if (xForwardedProto && xForwardedProto !== 'https') {
      warnings.push('Connection forwarded over insecure protocol');
    }
    
    // Check for security headers
    if (!req.headers['strict-transport-security'] && process.env.NODE_ENV === 'production') {
      warnings.push('HSTS header not present');
    }
    
    return {
      isSecure,
      protocol,
      warnings
    };
  }

  /**
   * Validate connection security and generate recommendations
   */
  static async validateConnectionSecurity(req: Request): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
    isSecure: boolean;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const sslCheck = this.checkSSLSecurity(req);
    
    if (!sslCheck.isSecure) {
      issues.push('Connection is not encrypted (no HTTPS/SSL)');
      recommendations.push('Always use HTTPS when accessing the application');
      score -= 40;
    }

    // Check IP address security
    const ipAddress = req.ip || 'unknown';
    const isPrivateIP = this.isPrivateIP(ipAddress);
    
    if (!isPrivateIP && process.env.NODE_ENV === 'development') {
      issues.push('Development mode accessible from public IP');
      recommendations.push('Restrict development access to local networks only');
      score -= 20;
    }

    // Check User-Agent for suspicious patterns
    const userAgent = req.headers['user-agent'] || '';
    if (this.isSuspiciousUserAgent(userAgent)) {
      issues.push('Suspicious user agent detected');
      recommendations.push('Ensure you are using a legitimate web browser');
      score -= 15;
    }

    // Check for common attack headers
    if (req.headers['x-forwarded-for']?.includes('127.0.0.1') && req.headers['x-real-ip']) {
      issues.push('Potential header injection detected');
      recommendations.push('Connection may be compromised by proxy manipulation');
      score -= 25;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      isSecure: sslCheck.isSecure && issues.length === 0
    };
  }

  /**
   * Get active connections
   */
  static getActiveConnections(): UserConnection[] {
    // Clean up old connections first
    this.cleanupOldConnections();
    
    return Array.from(this.connections.values());
  }

  /**
   * Get connection security metrics
   */
  static getConnectionMetrics(): ConnectionMetrics {
    const allConnections = Array.from(this.connections.values());
    const recentConnections = this.connectionHistory.filter(
      conn => Date.now() - conn.lastActivity.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const secureCount = allConnections.filter(c => c.isSecure).length;
    const vpnCount = allConnections.filter(c => c.isVPN).length;
    const suspiciousCount = allConnections.filter(c => c.riskScore > 50).length;
    
    const uniqueIPs = new Set(allConnections.map(c => c.ipAddress)).size;
    
    const avgConnectionTime = recentConnections.length > 0 
      ? recentConnections.reduce((sum, conn) => {
          return sum + (conn.lastActivity.getTime() - conn.connectedAt.getTime());
        }, 0) / recentConnections.length / 1000 // Convert to seconds
      : 0;

    return {
      totalConnections: allConnections.length,
      secureConnections: secureCount,
      insecureConnections: allConnections.length - secureCount,
      suspiciousConnections: suspiciousCount,
      averageConnectionTime: Math.round(avgConnectionTime),
      uniqueIPs,
      vpnConnections: vpnCount,
      anomalousConnections: allConnections.filter(c => c.riskScore > this.RISK_THRESHOLDS.HIGH_RISK_THRESHOLD).length
    };
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): ConnectionAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve connection alert
   */
  static resolveAlert(alertId: string, resolvedBy: number): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logInfo(`Connection security alert ${alertId} resolved by admin ${resolvedBy}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old connections
   */
  static cleanupOldConnections(): void {
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
    
    for (const [key, connection] of Array.from(this.connections.entries())) {
      if (connection.lastActivity.getTime() < cutoffTime) {
        this.connections.delete(key);
      }
    }
  }

  // Private helper methods
  
  private static async analyzeGeoLocation(ipAddress: string): Promise<{ country: string; city: string } | null> {
    try {
      // Skip localhost and private IPs
      if (this.isPrivateIP(ipAddress) || ipAddress === 'unknown') {
        return null;
      }
      
      // Use ip-api.com for free GeoIP lookup (no API key required)
      // For production with high traffic, consider paid services like MaxMind or IPStack
      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,city`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (!response.ok) {
        logError(new Error(`GeoIP lookup failed: ${response.status}`), `Failed to fetch GeoIP for ${ipAddress}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.countryCode || data.country,
          city: data.city || 'Unknown'
        };
      }
      
      return null;
    } catch (error) {
      logError(error, `GeoIP analysis error for ${ipAddress}`);
      return null;
    }
  }

  private static async checkVPNUsage(ipAddress: string, userAgent: string): Promise<{ isVPN: boolean; confidence: number }> {
    try {
      // Skip localhost and private IPs
      if (this.isPrivateIP(ipAddress) || ipAddress === 'unknown') {
        return { isVPN: false, confidence: 0 };
      }
      
      // Basic heuristics for VPN detection from user agent
      const vpnKeywords = ['vpn', 'proxy', 'tor', 'tunnel', 'anonymizer'];
      const hasVPNKeywords = vpnKeywords.some(keyword => 
        userAgent.toLowerCase().includes(keyword)
      );
      
      if (hasVPNKeywords) {
        return { isVPN: true, confidence: 80 };
      }
      
      // Use vpnapi.io for VPN detection (free tier: 1000 requests/day, no API key required)
      // For production with high traffic, consider paid services like IPHub, ProxyCheck, or IP2Location
      try {
        const response = await fetch(`https://vpnapi.io/api/${ipAddress}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.security) {
            const isVPN = data.security.vpn === true || 
                         data.security.proxy === true || 
                         data.security.tor === true;
            
            // Calculate confidence based on multiple security indicators
            let confidence = 0;
            if (data.security.vpn) confidence += 40;
            if (data.security.proxy) confidence += 30;
            if (data.security.tor) confidence += 30;
            
            return {
              isVPN,
              confidence: Math.min(100, confidence)
            };
          }
        }
      } catch (apiError) {
        // API error - fall through to heuristic-only detection
        logError(apiError, `VPN API check failed for ${ipAddress}, using heuristics only`);
      }
      
      // Fallback: No VPN detected
      return { isVPN: false, confidence: 10 };
    } catch (error) {
      logError(error, `VPN detection error for ${ipAddress}`);
      return { isVPN: false, confidence: 0 };
    }
  }

  private static calculateRiskScore(
    isSecure: boolean,
    geoData: { country: string; city: string } | null,
    vpnCheck: { isVPN: boolean; confidence: number },
    userId: number,
    ipAddress: string
  ): number {
    let riskScore = 0;
    
    // SSL/HTTPS check
    if (!isSecure) {
      riskScore += this.RISK_THRESHOLDS.INSECURE_CONNECTION;
    }
    
    // VPN usage
    if (vpnCheck.isVPN) {
      riskScore += this.RISK_THRESHOLDS.VPN_DETECTED * (vpnCheck.confidence / 100);
    }
    
    // Geographic anomalies (mock implementation)
    if (geoData && geoData.country !== 'ID') {
      riskScore += this.RISK_THRESHOLDS.SUSPICIOUS_LOCATION;
    }
    
    // Multiple session check
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);
    
    if (userConnections.length > 3) {
      riskScore += this.RISK_THRESHOLDS.MULTIPLE_SESSIONS;
    }
    
    return Math.min(100, riskScore);
  }

  private static async generateSecurityAlerts(
    connection: UserConnection,
    req: Request
  ): Promise<ConnectionAlert[]> {
    const newAlerts: ConnectionAlert[] = [];
    
    // Insecure connection alert
    if (!connection.isSecure) {
      const alert: ConnectionAlert = {
        id: `insecure_${Date.now()}_${connection.userId}`,
        userId: connection.userId,
        ipAddress: connection.ipAddress,
        userAgent: connection.userAgent,
        alertType: 'insecure_connection',
        severity: 'medium',
        description: 'User connected without HTTPS/SSL encryption',
        timestamp: new Date(),
        resolved: false
      };
      
      newAlerts.push(alert);
      this.alerts.push(alert);
      
      // Create security alert
      await SecurityAlertService.createAlert(
        'data_breach_attempt',
        'medium',
        `Insecure connection detected from ${connection.ipAddress}`,
        {
          userId: connection.userId,
          ipAddress: connection.ipAddress,
          userAgent: connection.userAgent,
          protocol: req.protocol
        },
        connection.userId,
        req
      );
    }
    
    // VPN detection alert
    if (connection.isVPN) {
      const alert: ConnectionAlert = {
        id: `vpn_${Date.now()}_${connection.userId}`,
        userId: connection.userId,
        ipAddress: connection.ipAddress,
        userAgent: connection.userAgent,
        alertType: 'vpn_detected',
        severity: 'low',
        description: 'User connected through VPN or proxy',
        timestamp: new Date(),
        resolved: false
      };
      
      newAlerts.push(alert);
      this.alerts.push(alert);
    }
    
    // High risk connection alert
    if (connection.riskScore >= this.RISK_THRESHOLDS.HIGH_RISK_THRESHOLD) {
      const alert: ConnectionAlert = {
        id: `highrisk_${Date.now()}_${connection.userId}`,
        userId: connection.userId,
        ipAddress: connection.ipAddress,
        userAgent: connection.userAgent,
        alertType: 'anomalous_behavior',
        severity: 'high',
        description: `High risk connection detected (score: ${connection.riskScore})`,
        timestamp: new Date(),
        resolved: false
      };
      
      newAlerts.push(alert);
      this.alerts.push(alert);
      
      // Send SMS alert for critical connections
      if (connection.riskScore >= 90) {
        setTimeout(async () => {
          await SMSAlertService.notifyAdminsViaPhone({
            id: alert.id,
            type: 'data_breach_attempt',
            severity: 'critical',
            description: alert.description,
            detectedAt: alert.timestamp
          } as any);
        }, 100);
      }
    }
    
    return newAlerts;
  }

  private static isPrivateIP(ipAddress: string): boolean {
    const privateRanges = [
      /^127\./, // Loopback
      /^10\./, // Class A private
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Class B private
      /^192\.168\./, // Class C private
      /^::1$/, // IPv6 loopback
      /^fc[0-9a-f][0-9a-f]:/i, // IPv6 unique local
      /^fe[8-9a-b][0-9a-f]:/i // IPv6 link local
    ];
    
    return privateRanges.some(range => range.test(ipAddress)) || ipAddress === 'localhost';
  }

  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /perl/i,
      /^$/
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Initialize connection monitoring
   */
  static initialize(): void {
    // Don't initialize if already running
    if (this.cleanupInterval) return;
    
    // Clean up old connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldConnections();
    }, 5 * 60 * 1000);
    
    logInfo('✅ Connection Security Service initialized');
  }

  /**
   * Stop connection monitoring (for graceful shutdown)
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all data
    this.connections.clear();
    this.connectionHistory = [];
    this.alerts = [];
    
    logInfo('Connection Security Service shut down');
  }
}