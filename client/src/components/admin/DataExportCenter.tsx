import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Download, 
  FileText, 
  Users, 
  Activity, 
  BarChart3, 
  Calendar, 
  Filter,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Trash2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { useDataExport } from '@/hooks/useDataExport';
import { useAuth } from '@/contexts/AuthContext';
import { SearchBar } from '@/components/admin/SearchBar';
import { EmptyState } from '@/components/admin/EmptyState';
import { hasAdminAccess as checkAdminAccess } from '@shared/auth-utils';

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  exportType: 'users' | 'activities' | 'revenue' | 'system' | 'custom';
  defaultFormat: 'csv' | 'pdf';
  requiresDateRange?: boolean;
  adminOnly?: boolean;
}

interface ExportHistoryItem {
  id: string;
  name: string;
  type: string;
  format: 'csv' | 'pdf';
  status: 'completed' | 'failed';
  timestamp: string;
  size?: string;
}

const exportPresets: ExportPreset[] = [
  {
    id: 'user-report',
    name: 'User Report',
    description: 'Complete user data with roles and verification status',
    icon: Users,
    exportType: 'users',
    defaultFormat: 'csv',
    adminOnly: true
  },
  {
    id: 'activity-logs',
    name: 'Activity Logs',
    description: 'Detailed admin and user activity logs',
    icon: Activity,
    exportType: 'activities',
    defaultFormat: 'csv',
    adminOnly: true
  },
  {
    id: 'revenue-analytics',
    name: 'Revenue Analytics',
    description: 'Financial analytics and transaction reports',
    icon: BarChart3,
    exportType: 'revenue',
    defaultFormat: 'csv',
    requiresDateRange: true,
    adminOnly: false
  },
  {
    id: 'system-stats',
    name: 'System Statistics',
    description: 'Current system metrics and performance data',
    icon: Settings,
    exportType: 'system',
    defaultFormat: 'csv',
    adminOnly: true
  }
];

interface DataExportCenterProps {
  className?: string;
  onExportComplete?: (type: string) => void;
  hasAdminAccess?: boolean;
}

const EXPORT_HISTORY_KEY = 'nxe_export_history';
const MAX_HISTORY_ITEMS = 50;

export function DataExportCenter({ className, onExportComplete, hasAdminAccess = false }: DataExportCenterProps) {
  const { user } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed'>('all');

  const {
    exportUsers,
    exportActivityLogs,
    exportRevenueAnalytics,
    exportSystemStats,
    exportJobs,
    getExportHistory,
    isExporting
  } = useDataExport();

  // Load export history from localStorage
  const loadExportHistory = () => {
    try {
      const stored = localStorage.getItem(EXPORT_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        setExportHistory(history);
      }
    } catch (error) {
      // Silent failure - export history is non-critical
    }
  };

  // Save export history to localStorage
  const saveExportHistory = (history: ExportHistoryItem[]) => {
    try {
      const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(limitedHistory));
      setExportHistory(limitedHistory);
    } catch (error) {
      // Silent failure - export history is non-critical
    }
  };

  // Add export to history
  const addToHistory = (preset: ExportPreset, format: 'csv' | 'pdf', status: 'completed' | 'failed') => {
    const newItem: ExportHistoryItem = {
      id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: preset.name,
      type: preset.exportType,
      format,
      status,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newItem, ...exportHistory];
    saveExportHistory(updatedHistory);
  };

  // Clear all export history
  const clearHistory = () => {
    localStorage.removeItem(EXPORT_HISTORY_KEY);
    setExportHistory([]);
  };

  // Delete single history item
  const deleteHistoryItem = (id: string) => {
    const updatedHistory = exportHistory.filter(item => item.id !== id);
    saveExportHistory(updatedHistory);
  };

  // Load export history on mount
  useEffect(() => {
    loadExportHistory();
    getExportHistory();
  }, [getExportHistory]);

  const handleExport = async () => {
    if (!selectedPreset) return;

    const options = {
      format: exportFormat,
      ...(selectedPreset.requiresDateRange && { dateRange })
    };

    let exportStatus: 'completed' | 'failed' = 'completed';

    try {
      switch (selectedPreset.exportType) {
        case 'users':
          await exportUsers(options);
          break;
        case 'activities':
          await exportActivityLogs(options);
          break;
        case 'revenue':
          await exportRevenueAnalytics(options);
          break;
        case 'system':
          await exportSystemStats(options);
          break;
      }

      exportStatus = 'completed';
      addToHistory(selectedPreset, exportFormat, exportStatus);
      
      setIsDialogOpen(false);
      setSelectedPreset(null);
      onExportComplete?.(selectedPreset.exportType);
      await getExportHistory();
    } catch (error) {
      // Error tracked in export history
      exportStatus = 'failed';
      addToHistory(selectedPreset, exportFormat, exportStatus);
    }
  };

  // Filter export history based on search and status
  const filteredHistory = useMemo(() => {
    let filtered = exportHistory;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.format.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [exportHistory, searchQuery, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'failed':
        return XCircle;
      case 'processing':
        return RefreshCw;
      case 'pending':
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-nxe-success';
      case 'failed':
        return 'text-nxe-error';
      case 'processing':
        return 'text-nxe-warning';
      case 'pending':
      default:
        return 'text-nxe-secondary';
    }
  };

  const filteredPresets = exportPresets.filter(preset => 
    !preset.adminOnly || checkAdminAccess(user)
  );

  return (
    <Card className={cn('admin-glass', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-nxe-primary" />
          <span>Data Export Center</span>
        </CardTitle>
        <p className="text-sm text-nxe-secondary">
          Export reports and analytics data in CSV or PDF format
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Export Presets */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Available Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPresets.map((preset) => {
              const Icon = preset.icon;
              return (
                <Card
                  key={preset.id}
                  className={cn(
                    'cursor-pointer transition-modern hover-lift border-nxe-surface hover:border-nxe-primary/50',
                    selectedPreset?.id === preset.id && 'border-nxe-primary'
                  )}
                  onClick={() => {
                    setSelectedPreset(preset);
                    setExportFormat(preset.defaultFormat);
                    setIsDialogOpen(true);
                  }}
                  data-testid={`export-preset-${preset.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-nxe-primary/20 rounded-lg">
                        <Icon className="h-5 w-5 text-nxe-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white">{preset.name}</h4>
                        <p className="text-sm text-nxe-secondary mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {preset.defaultFormat.toUpperCase()}
                          </Badge>
                          {preset.requiresDateRange && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Date Range
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Export History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Export History</h3>
            {exportHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs text-nxe-secondary hover:text-nxe-error"
                data-testid="button-clear-history"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Search and Filter */}
          {exportHistory.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by name or type..."
                  onClear={() => setSearchQuery('')}
                  data-testid="search-export-history"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export History List */}
          {isExporting && (
            <div className="p-4 bg-nxe-surface/30 rounded-lg border border-nxe-border">
              <div className="flex items-center space-x-3">
                <RefreshCw className="h-5 w-5 animate-spin text-nxe-accent" />
                <div>
                  <p className="text-sm font-medium text-white">Processing Export...</p>
                  <p className="text-xs text-nxe-secondary">Your export will download automatically</p>
                </div>
              </div>
            </div>
          )}

          {filteredHistory.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {filteredHistory.map((item) => {
                  const StatusIcon = getStatusIcon(item.status);
                  const statusColor = getStatusColor(item.status);

                  return (
                    <Card
                      key={item.id}
                      className="border-nxe-surface hover:border-nxe-primary/30 transition-colors"
                      data-testid={`export-history-${item.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between space-x-3">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className={cn("p-2 rounded-lg", item.status === 'completed' ? 'bg-nxe-success/20' : 'bg-nxe-error/20')}>
                              <StatusIcon className={cn("h-4 w-4", statusColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-sm font-medium text-white truncate">
                                  {item.name}
                                </h4>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {item.format.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-nxe-secondary">
                                <span className="capitalize">{item.type}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                                {item.status === 'failed' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-nxe-error">Export failed</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHistoryItem(item.id)}
                            className="shrink-0 h-8 w-8 p-0"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-nxe-secondary hover:text-nxe-error" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : exportHistory.length > 0 ? (
            <EmptyState
              icon={Download}
              title="No matching exports"
              description={`No export history found matching "${searchQuery}"`}
              className="py-8"
            />
          ) : (
            <EmptyState
              icon={Download}
              title="No export history yet"
              description="Your export history will appear here after you export data"
              className="py-8"
            />
          )}
        </div>
      </CardContent>

      {/* Export Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="modern-glass">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedPreset && <selectedPreset.icon className="h-5 w-5 text-nxe-primary" />}
              <span>Export {selectedPreset?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Configure export settings for {selectedPreset?.description?.toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'pdf') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="pdf">PDF (Document)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range (if required) */}
            {selectedPreset?.requiresDateRange && (
              <div className="space-y-4">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-sm">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-sm">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                data-testid="export-confirm-button"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {exportFormat.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}