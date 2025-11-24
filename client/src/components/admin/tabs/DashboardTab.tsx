import { useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Users, 
  Shield, 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  RefreshCw,
  PieChart,
  BarChart,
  Palette,
  FileText,
  Ban,
  Zap,
  Smartphone,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import { 
  KPIGrid, 
  HeroMetricCard, 
  QuickAccessPills,
  UnimplementedFeaturesHub
} from "@/components/admin";
import type { KPIItem } from "@/components/admin/KPIGrid";
import { DashboardSkeleton } from "@/components/ui/skeleton-loader";
import PullToRefresh from "@/components/admin/PullToRefresh";
import { useAdminPanel } from "@/features/admin/context/AdminPanelContext";
import { useAdminData } from "@/components/admin/hooks/useAdminData";
import type { AdminStats } from "@/features/admin/types";
import { cn } from "@/lib/utils";

interface DashboardTabProps {
  onRefresh: () => Promise<void>;
  hasAdminAccess?: boolean;
  isRealTimeEnabled?: boolean;
}

export default function DashboardTab({ 
  onRefresh, 
  hasAdminAccess = true,
  isRealTimeEnabled = true 
}: DashboardTabProps) {
  const [, setLocation] = useLocation();
  const { lastUpdated, isChartsOpen, setIsChartsOpen, setSelectedTab } = useAdminPanel();
  
  const { 
    stats, 
    statsLoading, 
    statsError, 
    refetchStats,
    users, 
    usersLoading 
  } = useAdminData({ hasAdminAccess, isRealTimeEnabled });

  // Real KPI data from backend (no synthetic elements)
  const kpiItems: KPIItem[] = useMemo(() => [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      subtitle: "Registered users",
      icon: Users,
      iconColor: "text-nxe-primary",
      isLoading: statsLoading
    },
    {
      title: "Active Admins", 
      value: stats?.totalAdmins || 0,
      subtitle: "Approved administrators",
      icon: Shield,
      iconColor: "text-blue-400",
      isLoading: statsLoading,
      trend: stats?.pendingAdminRequests ? {
        value: `${stats.pendingAdminRequests} pending`,
        isPositive: stats.pendingAdminRequests === 0
      } : undefined
    },
    {
      title: "Products Listed",
      value: stats?.activeProducts || 0,
      subtitle: `${stats?.totalProducts || 0} total products`,
      icon: TrendingUp,
      iconColor: "text-green-400",
      isLoading: statsLoading
    },
    {
      title: "Active Escrows",
      value: stats?.activeEscrows || 0,
      subtitle: `${stats?.pendingEscrows || 0} pending`,
      icon: DollarSign,
      iconColor: "text-yellow-400",
      isLoading: statsLoading,
      trend: stats?.disputedEscrows ? {
        value: `${stats.disputedEscrows} disputed`,
        isPositive: stats.disputedEscrows === 0
      } : undefined
    },
    {
      title: "Completed Escrows",
      value: stats?.completedEscrows || 0,
      subtitle: "Successful transactions",
      icon: CheckCircle,
      iconColor: "text-green-500",
      isLoading: statsLoading
    },
    {
      title: "Pending Requests",
      value: stats?.pendingAdminRequests || 0,
      subtitle: "Admin applications",
      icon: AlertTriangle,
      iconColor: "text-orange-400",
      isLoading: statsLoading,
      trend: stats?.pendingAdminRequests ? {
        value: "Needs review",
        isPositive: false
      } : undefined
    }
  ], [stats, statsLoading]);

  // Chart data calculations using real data (no mock data)
  const userGrowthData = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    // Calculate user growth for last 7 days
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    return last7Days.map(date => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const usersOnDate = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= date && userDate < nextDate;
      }).length;
      
      const totalUsersUpToDate = users.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate < nextDate;
      }).length;
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newUsers: usersOnDate,
        totalUsers: totalUsersUpToDate
      };
    });
  }, [users]);

  // Role distribution data from real users
  const roleDistributionData = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const colors = {
      owner: '#9333ea',
      admin: '#3b82f6',
      user: '#6b7280'
    };
    
    return Object.entries(roleCounts).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
      fill: colors[role as keyof typeof colors] || '#6b7280'
    }));
  }, [users]);

  // Escrow activity data from real stats
  const escrowActivityData = useMemo(() => {
    if (!stats) return [];
    
    return [
      { status: 'Pending', count: stats.pendingEscrows || 0, fill: '#eab308' },
      { status: 'Active', count: stats.activeEscrows || 0, fill: '#3b82f6' },
      { status: 'Completed', count: stats.completedEscrows || 0, fill: '#22c55e' },
      { status: 'Disputed', count: stats.disputedEscrows || 0, fill: '#ef4444' }
    ].filter(item => item.count > 0);
  }, [stats]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div className="space-y-3 sm:space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-nxe-primary/20 rounded-lg">
              <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-nxe-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">Dashboard</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetchStats()}
              variant="outline"
              size="sm"
              disabled={statsLoading}
              className="text-gray-300 h-8 sm:h-9"
              data-testid="button-refresh-stats"
            >
              <RefreshCw className={cn("h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2", statsLoading && "animate-spin")} />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error States */}
        {statsError && (
          <Card className="bg-red-900/20 border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-400">Failed to load statistics. Please refresh the page.</p>
            </CardContent>
          </Card>
        )}

        {/* Hero Metric Card - Featured Total Users */}
        {!statsLoading && stats && (
          <HeroMetricCard
            title="Total Platform Users"
            value={stats.totalUsers}
            subtitle="All registered users on the platform"
            icon={Users}
            iconColor="text-nxe-primary"
            gradient="from-nxe-primary/20 to-purple-500/20"
            trend={stats.dailyStats ? {
              value: `+${stats.dailyStats.newUsers} today`,
              isPositive: true
            } : undefined}
          />
        )}

        {/* Quick Access Pills */}
        <QuickAccessPills />

        {/* KPI Grid */}
        {statsLoading ? (
          <DashboardSkeleton />
        ) : (
          <KPIGrid 
            items={kpiItems}
            columns={{ mobile: 2, tablet: 2, desktop: 3 }}
          />
        )}

        {/* Analytics Charts - Collapsible */}
        <Collapsible open={isChartsOpen} onOpenChange={setIsChartsOpen}>
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-0 hover:bg-transparent"
                  data-testid="button-toggle-charts"
                >
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-nxe-primary" />
                    Analytics & Charts
                  </CardTitle>
                  <span className="text-gray-400 text-sm">
                    {isChartsOpen ? "Hide" : "Show"}
                  </span>
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-2 px-2">
                {/* Grid horizontal tetap 2 kolom - ukuran lebih kecil */}
                <div className="grid grid-cols-2 gap-2">
                  {/* User Growth - Simple Line Chart */}
                  <Card className="bg-nxe-surface border-nxe-border">
                    <CardHeader className="p-2">
                      <CardTitle className="text-white flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-nxe-primary" />
                        <span>Users</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      {statsLoading || usersLoading ? (
                        <div className="h-20 flex items-center justify-center">
                          <div className="animate-pulse w-full h-16 bg-nxe-surface rounded"></div>
                        </div>
                      ) : userGrowthData.length > 0 ? (
                        <div className="h-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={userGrowthData}>
                            <XAxis 
                              dataKey="date" 
                              stroke="#6b7280"
                              tick={{ fontSize: 8 }}
                              height={20}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '10px',
                                padding: '4px 8px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="totalUsers" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={false}
                            />
                          </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-gray-400">
                          <p className="text-xs">No data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Escrow - Simple Bar Chart */}
                  <Card className="bg-nxe-surface border-nxe-border">
                    <CardHeader className="p-2">
                      <CardTitle className="text-white flex items-center gap-1 text-xs">
                        <BarChart className="h-3 w-3 text-green-400" />
                        <span>Escrow</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      {statsLoading ? (
                        <div className="h-20 flex items-center justify-center">
                          <div className="animate-pulse w-full h-16 bg-nxe-surface rounded"></div>
                        </div>
                      ) : escrowActivityData.length > 0 ? (
                        <div className="h-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={escrowActivityData}>
                            <XAxis 
                              dataKey="status" 
                              stroke="#6b7280"
                              tick={{ fontSize: 8 }}
                              height={20}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '10px',
                                padding: '4px 8px'
                              }}
                            />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                              {escrowActivityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-gray-400">
                          <p className="text-xs">No data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* User Roles - Simple Pie */}
                  <Card className="bg-nxe-surface border-nxe-border">
                    <CardHeader className="p-2">
                      <CardTitle className="text-white flex items-center gap-1 text-xs">
                        <PieChart className="h-3 w-3 text-blue-400" />
                        <span>Roles</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      {statsLoading || usersLoading ? (
                        <div className="h-20 flex items-center justify-center">
                          <div className="animate-pulse w-12 h-12 bg-nxe-surface rounded-full mx-auto"></div>
                        </div>
                      ) : roleDistributionData.length > 0 ? (
                        <div className="h-20 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                            <Pie
                              data={roleDistributionData}
                              cx="50%"
                              cy="50%"
                              outerRadius={30}
                              dataKey="value"
                            >
                              {roleDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '10px',
                                padding: '4px 8px'
                              }}
                            />
                          </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-gray-400">
                          <p className="text-xs">No data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Simple Stats Summary */}
                  <Card className="bg-nxe-surface border-nxe-border">
                    <CardHeader className="p-2">
                      <CardTitle className="text-white flex items-center gap-1 text-xs">
                        <Shield className="h-3 w-3 text-purple-400" />
                        <span>Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Users</span>
                          <span className="text-white font-semibold">{stats?.totalUsers || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Active Escrow</span>
                          <span className="text-white font-semibold">{stats?.activeEscrows || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Products</span>
                          <span className="text-white font-semibold">{stats?.activeProducts || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Unimplemented Features Hub */}
        <UnimplementedFeaturesHub />

        {/* Pending Admin Requests Alert */}
        {stats?.pendingAdminRequests && stats.pendingAdminRequests > 0 && (
          <Card className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <div>
                    <h4 className="font-semibold text-white">Pending Admin Requests</h4>
                    <p className="text-sm text-gray-400">
                      {stats.pendingAdminRequests} request{stats.pendingAdminRequests > 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation('/admin/users')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="button-view-requests"
                >
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PullToRefresh>
  );
}
