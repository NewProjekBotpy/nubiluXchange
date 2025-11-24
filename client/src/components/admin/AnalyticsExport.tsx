import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import Papa from 'papaparse';
import { format } from 'date-fns';

interface AnalyticsExportProps {
  analyticsData?: any;
  dateRange?: { start: string; end: string };
}

type ExportFormat = 'csv' | 'pdf' | 'json';
type ExportSection = 'revenue' | 'users' | 'products' | 'transactions' | 'performance';

export default function AnalyticsExport({ analyticsData, dateRange }: AnalyticsExportProps) {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSections, setSelectedSections] = useState<ExportSection[]>([
    'revenue',
    'users',
    'products',
    'transactions'
  ]);

  const sections: { value: ExportSection; label: string }[] = [
    { value: 'revenue', label: 'Revenue Metrics' },
    { value: 'users', label: 'User Analytics' },
    { value: 'products', label: 'Product Performance' },
    { value: 'transactions', label: 'Transaction Data' },
    { value: 'performance', label: 'System Performance' }
  ];

  const toggleSection = (section: ExportSection) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const exportToCSV = () => {
    if (!analyticsData) {
      toast({ 
        title: 'No data available', 
        description: 'Please wait for analytics data to load',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const exportData: any[] = [];

      // Detect data structure
      const isNewStructure = analyticsData?.revenue !== undefined;
      const isOldStructure = analyticsData?.transactionMetrics !== undefined;

      // Revenue section - handle both structures
      if (selectedSections.includes('revenue')) {
        if (isNewStructure && analyticsData.revenue?.daily) {
          // New structure
          analyticsData.revenue.daily.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Revenue',
              Amount: item.amount || 0,
              Transactions: item.transactions || 0,
              Commission: item.commission || 0,
              Type: 'Daily Revenue'
            });
          });
        } else if (isOldStructure && analyticsData.transactionMetrics?.transactionTrends) {
          // Old structure
          analyticsData.transactionMetrics.transactionTrends.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Revenue',
              Amount: item.revenue || 0,
              Transactions: item.transactions || 0,
              Commission: 0,
              Type: 'Daily Revenue'
            });
          });
        }
      }

      // Users section - handle both structures
      if (selectedSections.includes('users')) {
        if (isNewStructure && analyticsData.platformGrowth?.daily) {
          // New structure
          analyticsData.platformGrowth.daily.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Users',
              'New Users': item.newUsers || 0,
              'New Sellers': item.newSellers || 0,
              'New Admins': item.newAdmins || 0,
              Type: 'User Growth'
            });
          });
        } else if (isOldStructure && analyticsData.userMetrics?.userGrowth) {
          // Old structure
          analyticsData.userMetrics.userGrowth.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Users',
              'Total Users': item.users || 0,
              'Active Users': item.active || 0,
              Type: 'User Growth'
            });
          });
        }
      }

      // Products section - handle both structures
      if (selectedSections.includes('products')) {
        if (isNewStructure && analyticsData.productPosting?.topCategories) {
          // New structure
          analyticsData.productPosting.topCategories.forEach((item: any) => {
            exportData.push({
              Category: item.name,
              Section: 'Products',
              Count: item.count || 0,
              Type: 'Category Performance'
            });
          });
        } else if (isOldStructure && analyticsData.productMetrics?.topCategories) {
          // Old structure
          analyticsData.productMetrics.topCategories.forEach((item: any) => {
            exportData.push({
              Category: item.category,
              Section: 'Products',
              Count: item.count || 0,
              Revenue: item.revenue || 0,
              Type: 'Category Performance'
            });
          });
        }
      }

      // Transactions section - handle both structures
      if (selectedSections.includes('transactions')) {
        if (isNewStructure && analyticsData.purchases?.daily) {
          // New structure
          analyticsData.purchases.daily.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Transactions',
              Purchases: item.purchases || 0,
              'Unique Buyers': item.uniqueBuyers || 0,
              'Total Value': item.totalValue || 0,
              'Avg Order Value': item.avgOrderValue || 0,
              Type: 'Purchase Activity'
            });
          });
        } else if (isOldStructure && analyticsData.transactionMetrics?.transactionTrends) {
          // Old structure
          analyticsData.transactionMetrics.transactionTrends.forEach((item: any) => {
            exportData.push({
              Date: item.date,
              Section: 'Transactions',
              Transactions: item.transactions || 0,
              Revenue: item.revenue || 0,
              Type: 'Transaction Trends'
            });
          });
        }
      }

      // Performance section - handle both structures
      if (selectedSections.includes('performance')) {
        if (isNewStructure) {
          // New structure - Dropship/Seller data
          if (analyticsData.dropship) {
            exportData.push({
              Section: 'Performance',
              Metric: 'Active Sellers',
              Value: analyticsData.dropship.activeSellers || 0,
              Type: 'Dropship Metrics'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'Products Dropshipped',
              Value: analyticsData.dropship.productsDropshipped || 0,
              Type: 'Dropship Metrics'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'Dropship Revenue',
              Value: analyticsData.dropship.revenue || 0,
              Type: 'Dropship Metrics'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'Conversion Rate',
              Value: (analyticsData.dropship.conversionRate || 0).toFixed(2) + '%',
              Type: 'Dropship Metrics'
            });
          }

          // Reports data
          if (analyticsData.reports?.daily) {
            analyticsData.reports.daily.forEach((item: any) => {
              exportData.push({
                Date: item.date,
                Section: 'Performance',
                'Total Reports': item.total || 0,
                Type: 'Reports Activity'
              });
            });
          }

          // Top performers
          if (analyticsData.topPerformers?.sellers) {
            analyticsData.topPerformers.sellers.slice(0, 10).forEach((seller: any, idx: number) => {
              exportData.push({
                Rank: idx + 1,
                Section: 'Performance',
                Name: seller.name,
                Revenue: seller.revenue || 0,
                Sales: seller.sales || 0,
                Products: seller.products || 0,
                Type: 'Top Sellers'
              });
            });
          }

          // Transaction distribution
          if (analyticsData.transactionDistribution?.ranges) {
            analyticsData.transactionDistribution.ranges.forEach((range: any) => {
              exportData.push({
                Range: range.range,
                Section: 'Performance',
                Count: range.count || 0,
                Type: 'Transaction Distribution'
              });
            });
          }
        } else if (isOldStructure) {
          // Old structure - System performance
          if (analyticsData.performance) {
            exportData.push({
              Section: 'Performance',
              Metric: 'Page Load Time',
              Value: (analyticsData.performance.pageLoadTime || 0).toFixed(2) + 'ms',
              Type: 'System Performance'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'API Response Time',
              Value: (analyticsData.performance.apiResponseTime || 0).toFixed(2) + 'ms',
              Type: 'System Performance'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'Error Rate',
              Value: (analyticsData.performance.errorRate || 0).toFixed(2) + '%',
              Type: 'System Performance'
            });
            exportData.push({
              Section: 'Performance',
              Metric: 'Uptime',
              Value: (analyticsData.performance.uptime || 0).toFixed(2) + '%',
              Type: 'System Performance'
            });
          }

          // Performance trends
          if (analyticsData.performance?.performanceTrends) {
            analyticsData.performance.performanceTrends.forEach((item: any) => {
              exportData.push({
                Date: item.date,
                Section: 'Performance',
                'Load Time': item.loadTime || 0,
                Errors: item.errors || 0,
                Type: 'Performance Trends'
              });
            });
          }

          // Top products from old structure
          if (analyticsData.productMetrics?.productPerformance) {
            analyticsData.productMetrics.productPerformance.slice(0, 10).forEach((product: any, idx: number) => {
              exportData.push({
                Rank: idx + 1,
                Section: 'Performance',
                Name: product.name,
                Views: product.views || 0,
                Sales: product.sales || 0,
                Revenue: product.revenue || 0,
                Type: 'Top Products'
              });
            });
          }
        }
      }

      if (exportData.length === 0) {
        toast({ 
          title: 'No data to export', 
          description: 'Selected sections have no data available',
          variant: 'destructive' 
        });
        return;
      }

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ 
        title: 'Export successful', 
        description: `CSV file with ${exportData.length} records downloaded` 
      });
    } catch (error) {
      // Error displayed via toast notification
      toast({ 
        title: 'Export failed', 
        description: 'Failed to generate CSV file',
        variant: 'destructive' 
      });
    }
  };

  const exportToPDF = () => {
    if (!analyticsData) {
      toast({ 
        title: 'No data available', 
        description: 'Please wait for analytics data to load',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      // Detect data structure
      const isNewStructure = analyticsData?.revenue !== undefined;
      const isOldStructure = analyticsData?.transactionMetrics !== undefined;

      // Title
      doc.setFontSize(20);
      doc.text('Analytics Report', margin, yPosition);
      yPosition += 10;

      // Date range
      doc.setFontSize(10);
      doc.text(
        `Period: ${dateRange?.start || 'N/A'} to ${dateRange?.end || 'N/A'}`,
        margin,
        yPosition
      );
      yPosition += 15;

      // Revenue Section - handle both structures
      if (selectedSections.includes('revenue')) {
        if (isNewStructure && analyticsData.revenue) {
          // New structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Revenue Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Total Revenue: ${formatCurrency(analyticsData.revenue.totalRevenue || 0)}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Growth Rate: ${(analyticsData.revenue.growth || 0).toFixed(2)}%`, margin, yPosition);
          yPosition += 5;
          doc.text(`Avg Per Transaction: ${formatCurrency(analyticsData.revenue.avgPerTransaction || 0)}`, margin, yPosition);
          yPosition += 10;
        } else if (isOldStructure && analyticsData.transactionMetrics) {
          // Old structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Revenue Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Total Revenue: ${formatCurrency(analyticsData.transactionMetrics.totalRevenue || 0)}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Total Transactions: ${analyticsData.transactionMetrics.totalTransactions || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Avg Order Value: ${formatCurrency(analyticsData.transactionMetrics.averageOrderValue || 0)}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Conversion Rate: ${(analyticsData.transactionMetrics.conversionRate || 0).toFixed(2)}%`, margin, yPosition);
          yPosition += 10;
        }
      }

      // User Section - handle both structures
      if (selectedSections.includes('users')) {
        if (isNewStructure && analyticsData.platformGrowth) {
          // New structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('User & Growth Metrics', margin, yPosition);
          yPosition += 7;

          const totalNewUsers = analyticsData.platformGrowth.daily?.reduce((sum: number, d: any) => sum + (d.newUsers || 0), 0) || 0;
          const totalNewSellers = analyticsData.platformGrowth.daily?.reduce((sum: number, d: any) => sum + (d.newSellers || 0), 0) || 0;

          doc.setFontSize(10);
          doc.text(`New Users (Period): ${totalNewUsers}`, margin, yPosition);
          yPosition += 5;
          doc.text(`New Sellers (Period): ${totalNewSellers}`, margin, yPosition);
          yPosition += 5;
          if (analyticsData.dropship) {
            doc.text(`Active Sellers: ${analyticsData.dropship.activeSellers || 0}`, margin, yPosition);
            yPosition += 5;
          }
          yPosition += 5;
        } else if (isOldStructure && analyticsData.userMetrics) {
          // Old structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('User Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Total Users: ${analyticsData.userMetrics.totalUsers || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`New Users: ${analyticsData.userMetrics.newUsers || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Active Users: ${analyticsData.userMetrics.activeUsers || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Retention Rate: ${(analyticsData.userMetrics.retentionRate || 0).toFixed(2)}%`, margin, yPosition);
          yPosition += 10;
        }
      }

      // Product Section - handle both structures
      if (selectedSections.includes('products')) {
        if (isNewStructure && analyticsData.productPosting) {
          // New structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Product Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Active Products: ${analyticsData.productPosting.activeVsSold?.active || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Sold Products: ${analyticsData.productPosting.activeVsSold?.sold || 0}`, margin, yPosition);
          yPosition += 10;

          if (analyticsData.productPosting.topCategories?.length > 0) {
            doc.text('Top Categories:', margin, yPosition);
            yPosition += 5;
            analyticsData.productPosting.topCategories.slice(0, 5).forEach((cat: any) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${cat.name}: ${cat.count} products`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }
        } else if (isOldStructure && analyticsData.productMetrics) {
          // Old structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Product Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Total Products: ${analyticsData.productMetrics.totalProducts || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Active Products: ${analyticsData.productMetrics.activeProducts || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Product Views: ${analyticsData.productMetrics.productViews || 0}`, margin, yPosition);
          yPosition += 10;

          if (analyticsData.productMetrics.topCategories?.length > 0) {
            doc.text('Top Categories:', margin, yPosition);
            yPosition += 5;
            analyticsData.productMetrics.topCategories.slice(0, 5).forEach((cat: any) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${cat.category}: ${cat.count} products (${formatCurrency(cat.revenue || 0)})`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }
        }
      }

      // Transactions Section - handle both structures
      if (selectedSections.includes('transactions')) {
        if (isNewStructure && analyticsData.purchases) {
          // New structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Transaction Metrics', margin, yPosition);
          yPosition += 7;

          const totalPurchases = analyticsData.purchases.daily?.reduce((sum: number, d: any) => sum + (d.purchases || 0), 0) || 0;

          doc.setFontSize(10);
          doc.text(`Total Purchases (Period): ${totalPurchases}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Repeat Purchase Rate: ${(analyticsData.purchases.repeatPurchaseRate || 0).toFixed(2)}%`, margin, yPosition);
          yPosition += 10;
        } else if (isOldStructure && analyticsData.transactionMetrics) {
          // Old structure
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(14);
          doc.text('Transaction Metrics', margin, yPosition);
          yPosition += 7;

          doc.setFontSize(10);
          doc.text(`Total Transactions: ${analyticsData.transactionMetrics.totalTransactions || 0}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Total Revenue: ${formatCurrency(analyticsData.transactionMetrics.totalRevenue || 0)}`, margin, yPosition);
          yPosition += 5;
          doc.text(`Avg Order Value: ${formatCurrency(analyticsData.transactionMetrics.averageOrderValue || 0)}`, margin, yPosition);
          yPosition += 10;

          if (analyticsData.transactionMetrics.escrowMetrics) {
            doc.text('Escrow Metrics:', margin, yPosition);
            yPosition += 5;
            doc.text(`  Success Rate: ${(analyticsData.transactionMetrics.escrowMetrics.success_rate || 0).toFixed(2)}%`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`  Avg Completion Time: ${(analyticsData.transactionMetrics.escrowMetrics.average_completion_time || 0).toFixed(1)}h`, margin + 5, yPosition);
            yPosition += 5;
            doc.text(`  Dispute Rate: ${(analyticsData.transactionMetrics.escrowMetrics.dispute_rate || 0).toFixed(2)}%`, margin + 5, yPosition);
            yPosition += 10;
          }
        }
      }

      // Performance Section - handle both structures
      if (selectedSections.includes('performance')) {
        if (isNewStructure) {
          // New structure - Dropship/Seller Metrics
          if (analyticsData.dropship) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('Dropship & Seller Metrics', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.text(`Active Sellers: ${analyticsData.dropship.activeSellers || 0}`, margin, yPosition);
            yPosition += 5;
            doc.text(`Products Dropshipped: ${analyticsData.dropship.productsDropshipped || 0}`, margin, yPosition);
            yPosition += 5;
            doc.text(`Dropship Revenue: ${formatCurrency(analyticsData.dropship.revenue || 0)}`, margin, yPosition);
            yPosition += 5;
            doc.text(`Conversion Rate: ${(analyticsData.dropship.conversionRate || 0).toFixed(2)}%`, margin, yPosition);
            yPosition += 10;
          }

          // Reports
          if (analyticsData.reports) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('Reports & Performance', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.text(`Resolution Rate: ${(analyticsData.reports.resolutionRate || 0).toFixed(2)}%`, margin, yPosition);
            yPosition += 5;
            doc.text(`Avg Resolution Time: ${(analyticsData.reports.avgResolutionTime || 0).toFixed(1)} hours`, margin, yPosition);
            yPosition += 10;
          }

          // Top Performers
          if (analyticsData.topPerformers?.sellers?.length > 0) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('Top Sellers', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            analyticsData.topPerformers.sellers.slice(0, 5).forEach((seller: any, idx: number) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${idx + 1}. ${seller.name}: ${formatCurrency(seller.revenue)} (${seller.sales} sales)`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }

          // Transaction Distribution
          if (analyticsData.transactionDistribution?.ranges?.length > 0) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('Transaction Value Distribution', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.text(`Avg Transaction: ${formatCurrency(analyticsData.transactionDistribution.avgValue || 0)}`, margin, yPosition);
            yPosition += 5;
            doc.text(`Median Transaction: ${formatCurrency(analyticsData.transactionDistribution.medianValue || 0)}`, margin, yPosition);
            yPosition += 7;

            analyticsData.transactionDistribution.ranges.forEach((range: any) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${range.range}: ${range.count} transactions`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }
        } else if (isOldStructure) {
          // Old structure - System performance
          if (analyticsData.performance) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('System Performance', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.text(`Page Load Time: ${(analyticsData.performance.pageLoadTime || 0).toFixed(2)}ms`, margin, yPosition);
            yPosition += 5;
            doc.text(`API Response Time: ${(analyticsData.performance.apiResponseTime || 0).toFixed(2)}ms`, margin, yPosition);
            yPosition += 5;
            doc.text(`Error Rate: ${(analyticsData.performance.errorRate || 0).toFixed(2)}%`, margin, yPosition);
            yPosition += 5;
            doc.text(`Uptime: ${(analyticsData.performance.uptime || 0).toFixed(2)}%`, margin, yPosition);
            yPosition += 10;
          }

          // Top products
          if (analyticsData.productMetrics?.productPerformance?.length > 0) {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(14);
            doc.text('Top Products', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            analyticsData.productMetrics.productPerformance.slice(0, 5).forEach((product: any, idx: number) => {
              if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
              }
              doc.text(`  ${idx + 1}. ${product.name}: ${formatCurrency(product.revenue)} (${product.sales} sales)`, margin + 5, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }
        }
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages} | Generated on ${format(new Date(), 'PPpp')}`,
          margin,
          pageHeight - 10
        );
      }

      doc.save(`analytics_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`);

      toast({ 
        title: 'Export successful', 
        description: 'PDF report downloaded successfully' 
      });
    } catch (error) {
      // Error displayed via toast notification
      toast({ 
        title: 'Export failed', 
        description: 'Failed to generate PDF report',
        variant: 'destructive' 
      });
    }
  };

  const exportToJSON = () => {
    if (!analyticsData) {
      toast({ 
        title: 'No data available', 
        description: 'Please wait for analytics data to load',
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Detect data structure
      const isNewStructure = analyticsData?.revenue !== undefined;
      const isOldStructure = analyticsData?.transactionMetrics !== undefined;

      const exportData: any = {
        metadata: {
          exportDate: new Date().toISOString(),
          dateRange: dateRange,
          sections: selectedSections,
          dataStructure: isNewStructure ? 'comprehensive' : 'legacy'
        }
      };

      // Revenue section - handle both structures
      if (selectedSections.includes('revenue')) {
        if (isNewStructure) {
          exportData.revenue = analyticsData.revenue;
        } else if (isOldStructure) {
          exportData.revenue = {
            totalRevenue: analyticsData.transactionMetrics?.totalRevenue || 0,
            totalTransactions: analyticsData.transactionMetrics?.totalTransactions || 0,
            averageOrderValue: analyticsData.transactionMetrics?.averageOrderValue || 0,
            conversionRate: analyticsData.transactionMetrics?.conversionRate || 0,
            trends: analyticsData.transactionMetrics?.transactionTrends || []
          };
        }
      }

      // Users section - handle both structures
      if (selectedSections.includes('users')) {
        if (isNewStructure) {
          exportData.users = {
            platformGrowth: analyticsData.platformGrowth,
            dropship: analyticsData.dropship
          };
        } else if (isOldStructure) {
          exportData.users = {
            totalUsers: analyticsData.userMetrics?.totalUsers || 0,
            newUsers: analyticsData.userMetrics?.newUsers || 0,
            activeUsers: analyticsData.userMetrics?.activeUsers || 0,
            retentionRate: analyticsData.userMetrics?.retentionRate || 0,
            userGrowth: analyticsData.userMetrics?.userGrowth || [],
            userDistribution: analyticsData.userMetrics?.userDistribution || []
          };
        }
      }

      // Products section - handle both structures
      if (selectedSections.includes('products')) {
        if (isNewStructure) {
          exportData.products = analyticsData.productPosting;
        } else if (isOldStructure) {
          exportData.products = {
            totalProducts: analyticsData.productMetrics?.totalProducts || 0,
            activeProducts: analyticsData.productMetrics?.activeProducts || 0,
            productViews: analyticsData.productMetrics?.productViews || 0,
            topCategories: analyticsData.productMetrics?.topCategories || [],
            productPerformance: analyticsData.productMetrics?.productPerformance || []
          };
        }
      }

      // Transactions section - handle both structures
      if (selectedSections.includes('transactions')) {
        if (isNewStructure) {
          exportData.transactions = {
            purchases: analyticsData.purchases,
            distribution: analyticsData.transactionDistribution
          };
        } else if (isOldStructure) {
          exportData.transactions = {
            totalTransactions: analyticsData.transactionMetrics?.totalTransactions || 0,
            totalRevenue: analyticsData.transactionMetrics?.totalRevenue || 0,
            averageOrderValue: analyticsData.transactionMetrics?.averageOrderValue || 0,
            conversionRate: analyticsData.transactionMetrics?.conversionRate || 0,
            transactionTrends: analyticsData.transactionMetrics?.transactionTrends || [],
            paymentMethods: analyticsData.transactionMetrics?.paymentMethods || [],
            escrowMetrics: analyticsData.transactionMetrics?.escrowMetrics || {}
          };
        }
      }

      // Performance section - handle both structures
      if (selectedSections.includes('performance')) {
        if (isNewStructure) {
          exportData.performance = {
            reports: analyticsData.reports,
            topPerformers: analyticsData.topPerformers,
            dropship: analyticsData.dropship,
            transactionDistribution: analyticsData.transactionDistribution
          };
        } else if (isOldStructure) {
          exportData.performance = {
            systemMetrics: analyticsData.performance || {},
            productPerformance: analyticsData.productMetrics?.productPerformance || [],
            geographics: analyticsData.geographics || {}
          };
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ 
        title: 'Export successful', 
        description: 'JSON data downloaded successfully' 
      });
    } catch (error) {
      // Error displayed via toast notification
      toast({ 
        title: 'Export failed', 
        description: 'Failed to generate JSON file',
        variant: 'destructive' 
      });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      switch (exportFormat) {
        case 'csv':
          exportToCSV();
          break;
        case 'pdf':
          exportToPDF();
          break;
        case 'json':
          exportToJSON();
          break;
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="bg-nxe-card border-nxe-border" data-testid="card-analytics-export">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Download className="h-5 w-5 text-nxe-primary" />
          Export Analytics
        </CardTitle>
        <CardDescription className="text-gray-400">
          Export comprehensive analytics data in multiple formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Format Selection */}
        <div className="space-y-2">
          <Label className="text-white">Export Format</Label>
          <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
            <SelectTrigger 
              className="bg-nxe-surface border-nxe-border text-white"
              data-testid="select-export-format"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nxe-card border-nxe-border">
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>CSV Spreadsheet</span>
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>PDF Report</span>
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>JSON Data</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Display */}
        {dateRange && (
          <div className="p-3 bg-nxe-surface border border-nxe-border rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                Export Period: {format(new Date(dateRange.start), 'PPP')} - {format(new Date(dateRange.end), 'PPP')}
              </span>
            </div>
          </div>
        )}

        {/* Section Selection */}
        <div className="space-y-3">
          <Label className="text-white">Select Sections to Export</Label>
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.value} className="flex items-center space-x-2">
                <Checkbox
                  id={section.value}
                  checked={selectedSections.includes(section.value)}
                  onCheckedChange={() => toggleSection(section.value)}
                  className="border-nxe-border"
                  data-testid={`checkbox-section-${section.value}`}
                />
                <Label
                  htmlFor={section.value}
                  className="text-sm text-gray-300 cursor-pointer"
                >
                  {section.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || selectedSections.length === 0 || !analyticsData}
          className="w-full bg-nxe-primary hover:bg-nxe-primary/80 text-white"
          data-testid="button-export-analytics"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {exportFormat.toUpperCase()}
            </>
          )}
        </Button>

        {selectedSections.length === 0 && (
          <p className="text-sm text-yellow-400 text-center" role="alert">
            Please select at least one section to export
          </p>
        )}
      </CardContent>
    </Card>
  );
}
