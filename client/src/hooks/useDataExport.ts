import { useState, useCallback } from 'react';
import { logError } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ExportOptions {
  format: 'csv' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  columns?: string[];
  title?: string;
  description?: string;
}

interface ExportJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export function useDataExport() {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Generate CSV content from data
  const generateCSV = useCallback((data: any[], headers?: string[]) => {
    if (!data || data.length === 0) {
      return 'No data available';
    }

    // Use provided headers or extract from first object
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...data.map(row => 
        csvHeaders.map(header => {
          let value = row[header];
          
          // Handle different data types
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else if (typeof value === 'string' && value.includes(',')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }, []);

  // Download file helper
  const downloadFile = useCallback((content: string, filename: string, type: string = 'text/csv') => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  // Format filename with timestamp
  const generateFilename = useCallback((baseName: string, format: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${baseName}_${timestamp}.${format}`;
  }, []);

  // Export user data
  const exportUsers = useCallback(async (options: ExportOptions = { format: 'csv' }) => {
    setIsExporting(true);
    try {
      const users = await apiRequest('/api/admin/users');
      
      const exportData = users.map((user: any) => ({
        ID: user.id,
        Username: user.username,
        Email: user.email,
        Role: user.role,
        'Verification Status': user.verificationStatus || 'Unverified',
        'Wallet Balance': user.walletBalance || '0',
        'Created At': new Date(user.createdAt).toLocaleDateString(),
        'Last Activity': user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never',
        'Is Verified': user.isVerified ? 'Yes' : 'No',
        'Admin Request': user.adminRequestPending ? 'Pending' : 'None'
      }));

      if (options.format === 'csv') {
        const csvContent = generateCSV(exportData);
        const filename = generateFilename('users_report', 'csv');
        downloadFile(csvContent, filename);
        
        toast({
          title: "Export Successful",
          description: `User data exported as ${filename}`
        });
      } else {
        // For PDF, we'll use the backend
        const response = await apiRequest('/api/admin/export/users/pdf', {
          method: 'POST',
          body: JSON.stringify({ 
            data: exportData,
            title: 'User Management Report',
            ...options 
          })
        });
        
        if (response.downloadUrl) {
          window.open(response.downloadUrl, '_blank');
          toast({
            title: "PDF Export Ready",
            description: "Your PDF report is being generated"
          });
        }
      }
    } catch (error) {
      logError('Export users error', error as Error);
      toast({
        title: "Export Failed",
        description: "Failed to export user data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, generateFilename, downloadFile, toast]);

  // Export activity logs
  const exportActivityLogs = useCallback(async (options: ExportOptions = { format: 'csv' }) => {
    setIsExporting(true);
    try {
      const logs = await apiRequest('/api/admin/activity-logs');
      
      const exportData = logs.map((log: any) => ({
        ID: log.id,
        Timestamp: new Date(log.createdAt || log.timestamp).toLocaleString(),
        Admin: log.adminUsername || log.admin?.username || log.adminId || 'System',
        User: log.username || log.user?.username || log.userId || 'N/A',
        Action: log.action,
        Category: log.category,
        Details: typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || ''),
        Status: log.status || 'success',
        'IP Address': log.ipAddress || 'Unknown',
        'User Agent': log.userAgent || 'Unknown'
      }));

      if (options.format === 'csv') {
        const csvContent = generateCSV(exportData);
        const filename = generateFilename('activity_logs', 'csv');
        downloadFile(csvContent, filename);
        
        toast({
          title: "Export Successful",
          description: `Activity logs exported as ${filename}`
        });
      } else if (options.format === 'pdf') {
        // Generate simple PDF content using browser print
        const htmlContent = generateHTMLTable(exportData, 'Activity Logs Report');
        downloadHTMLAsPDF(htmlContent, 'activity_logs');
        
        toast({
          title: "PDF Export Ready",
          description: "Activity logs exported as PDF"
        });
      }
    } catch (error) {
      logError('Export activity logs error', error as Error);
      toast({
        title: "Export Failed",
        description: "Failed to export activity logs",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, generateFilename, downloadFile, toast]);

  // Export revenue analytics (Owner)
  const exportRevenueAnalytics = useCallback(async (options: ExportOptions = { format: 'csv' }) => {
    setIsExporting(true);
    try {
      const { dateRange } = options;
      const params = new URLSearchParams();
      if (dateRange?.start) params.set('startDate', dateRange.start);
      if (dateRange?.end) params.set('endDate', dateRange.end);
      
      const analytics = await apiRequest(`/api/owner/analytics/revenue?${params}`);
      
      const exportData = analytics.dailyReports?.map((report: any) => {
        const totalRevenue = parseFloat(report.totalRevenue) || 0;
        const totalTransactions = report.totalTransactions || 0;
        const averageTransaction = totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00';
        
        return {
          Date: new Date(report.reportDate).toLocaleDateString(),
          'Total Revenue': report.totalRevenue,
          'Total Commission': report.totalCommission,
          'Transaction Count': totalTransactions,
          'Average Transaction': averageTransaction
        };
      }) || [];

      if (options.format === 'csv') {
        const csvContent = generateCSV(exportData);
        const filename = generateFilename('revenue_analytics', 'csv');
        downloadFile(csvContent, filename);
        
        toast({
          title: "Export Successful",
          description: `Revenue analytics exported as ${filename}`
        });
      } else if (options.format === 'pdf') {
        const htmlContent = generateHTMLTable(exportData, 'Revenue Analytics Report');
        downloadHTMLAsPDF(htmlContent, 'revenue_analytics');
        
        toast({
          title: "PDF Export Ready",
          description: "Revenue analytics exported as PDF"
        });
      }
    } catch (error) {
      logError('Export revenue analytics error', error as Error);
      toast({
        title: "Export Failed",
        description: "Failed to export revenue analytics",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, generateFilename, downloadFile, toast]);

  // Export system stats
  const exportSystemStats = useCallback(async (options: ExportOptions = { format: 'csv' }) => {
    setIsExporting(true);
    try {
      const stats = await apiRequest('/api/admin/stats');
      
      const exportData = [{
        'Total Users': stats.totalUsers,
        'Total Admins': stats.totalAdmins,
        'Total Owners': stats.totalOwners,
        'Pending Admin Requests': stats.pendingAdminRequests,
        'Recent Admin Approvals': stats.recentAdminApprovals,
        'Total Products': stats.totalProducts,
        'Active Products': stats.activeProducts,
        'Pending Escrows': stats.pendingEscrows,
        'Active Escrows': stats.activeEscrows,
        'Completed Escrows': stats.completedEscrows,
        'Disputed Escrows': stats.disputedEscrows,
        'Export Date': new Date().toLocaleString()
      }];

      if (options.format === 'csv') {
        const csvContent = generateCSV(exportData);
        const filename = generateFilename('system_stats', 'csv');
        downloadFile(csvContent, filename);
        
        toast({
          title: "Export Successful",
          description: `System statistics exported as ${filename}`
        });
      } else if (options.format === 'pdf') {
        const htmlContent = generateHTMLTable(exportData, 'System Statistics Report');
        downloadHTMLAsPDF(htmlContent, 'system_stats');
        
        toast({
          title: "PDF Export Ready",
          description: "System statistics exported as PDF"
        });
      }
    } catch (error) {
      logError('Export system stats error', error as Error);
      toast({
        title: "Export Failed",
        description: "Failed to export system statistics",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateCSV, generateFilename, downloadFile, toast]);

  // Export custom data
  const exportCustomData = useCallback(async (
    data: any[], 
    reportName: string, 
    options: ExportOptions = { format: 'csv' }
  ) => {
    setIsExporting(true);
    try {
      if (options.format === 'csv') {
        const csvContent = generateCSV(data, options.columns);
        const filename = generateFilename(reportName, 'csv');
        downloadFile(csvContent, filename);
        
        toast({
          title: "Export Successful",
          description: `${reportName} exported as ${filename}`
        });
      }
    } catch (error) {
      logError('Export custom data error', error as Error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${reportName}`,
        variant: "destructive"
      });
    } finally{
      setIsExporting(false);
    }
  }, [generateCSV, generateFilename, downloadFile, toast]);

  // Generate HTML table for PDF export
  const generateHTMLTable = useCallback((data: any[], title: string) => {
    if (!data || data.length === 0) {
      return `<html><head><title>${title}</title></head><body><h1>${title}</h1><p>No data available</p></body></html>`;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`
    ).join('');

    return `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;
  }, []);

  // Download HTML as PDF (using browser print)
  const downloadHTMLAsPDF = useCallback((htmlContent: string, filename: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      newWindow.onload = () => {
        // Add a slight delay to ensure content is loaded
        setTimeout(() => {
          newWindow.print();
        }, 500);
      };
    }
    
    // Clean up after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  // Local export history management (client-side only)
  const getExportHistory = useCallback(() => {
    // For now, return empty array since we're doing client-side exports
    // In future, could use localStorage to track export history
    return [];
  }, []);

  // Cancel export job (placeholder for client-side exports)
  const cancelExportJob = useCallback(async (jobId: string) => {
    // Since we're doing client-side exports, there's nothing to cancel
    toast({
      title: "Export Complete",
      description: "Export operations are immediate",
      variant: "default"
    });
  }, [toast]);

  return {
    // Export functions
    exportUsers,
    exportActivityLogs,
    exportRevenueAnalytics,
    exportSystemStats,
    exportCustomData,
    
    // Utility functions
    generateCSV,
    downloadFile,
    generateFilename,
    generateHTMLTable,
    downloadHTMLAsPDF,
    
    // Export job management
    exportJobs,
    getExportHistory,
    cancelExportJob,
    
    // State
    isExporting
  };
}