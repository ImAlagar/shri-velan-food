import dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../utils/helpers.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const { timeRange = 'month' } = req.query;
  
  const stats = await dashboardService.getDashboardStats(timeRange);
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

export const getRecentActivities = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const activities = await dashboardService.getRecentActivities(parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: activities
  });
});

export const getChartData = asyncHandler(async (req, res) => {
  const { timeRange = 'month', chartType } = req.query;
  
  const chartData = await dashboardService.getChartData(timeRange, chartType);
  
  res.status(200).json({
    success: true,
    data: chartData
  });
});