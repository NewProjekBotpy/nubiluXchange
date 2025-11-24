import { Router, Request, Response } from "express";
import { SalesReportService, SalesReportFilters } from "../services/SalesReportService";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { handleError, ErrorHandlers } from "../utils/error-handler";

const router = Router();

// Validation schema for sales report filters
const salesReportFiltersSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  category: z.string().optional(),
  status: z.enum(['completed', 'pending', 'failed']).optional(),
  period: z.enum(['daily', 'weekly', 'monthly']).optional()
});

// Get detailed sales report for seller
router.get('/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.userId!;
    
    // Validate and parse query parameters
    const filters = salesReportFiltersSchema.parse(req.query);
    
    const report = await SalesReportService.getSellerSalesReport(sellerId, filters);
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    handleError(res, error, 'generate sales report');
  }
});

// Get seller dashboard stats (for existing stats cards)
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.userId!;
    const timeRange = req.query.timeRange as string || '7d';
    
    // Validate time range
    if (!['1d', '7d', '30d'].includes(timeRange)) {
      return ErrorHandlers.badRequest(res, 'Invalid time range. Must be 1d, 7d, or 30d');
    }
    
    const stats = await SalesReportService.getSellerDashboardStats(sellerId, timeRange);
    
    res.json({
      success: true,
      data: stats,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    handleError(res, error, 'fetch dashboard stats');
  }
});

// Get sales data for charts (simplified endpoint for charts)
router.get('/charts', requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = req.userId!;
    
    const filters = salesReportFiltersSchema.parse(req.query);
    const report = await SalesReportService.getSellerSalesReport(sellerId, filters);
    
    // Return only chart-specific data
    res.json({
      success: true,
      data: {
        chartData: report.chartData,
        categoryBreakdown: report.categoryBreakdown,
        metrics: report.metrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    handleError(res, error, 'fetch chart data');
  }
});

export const salesReportController = router;