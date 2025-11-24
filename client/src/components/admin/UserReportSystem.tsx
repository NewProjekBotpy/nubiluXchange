import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  Search,
  Filter,
  Eye,
  BarChart3,
  TrendingUp,
  Shield,
  Flag
} from 'lucide-react';

interface UserReport {
  id: number;
  reporterId: number;
  reporterName: string;
  category: 'fraud' | 'abuse' | 'spam' | 'bug' | 'suggestion' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  targetType?: 'user' | 'product' | 'transaction';
  targetId?: number;
  createdAt: string;
  updatedAt: string;
  assignedTo?: number;
  resolution?: string;
}

interface ReportStats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  byCategory: { [key: string]: number };
  byPriority: { [key: string]: number };
}

export default function UserReportSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery<UserReport[]>({
    queryKey: ['/api/admin/reports'],
    refetchInterval: 30000
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<ReportStats>({
    queryKey: ['/api/admin/reports/stats'],
    refetchInterval: 60000
  });

  // Update report status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status, resolution }: { reportId: number; status: string; resolution?: string }) => {
      return apiRequest(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        body: { status, resolution }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports/stats'] });
      setIsDetailDialogOpen(false);
      setSelectedReport(null);
      setResolution('');
      toast({
        title: "Status updated",
        description: "Report status has been updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update report status",
        variant: "destructive"
      });
    }
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fraud': return <Shield className="h-4 w-4" />;
      case 'abuse': return <AlertTriangle className="h-4 w-4" />;
      case 'spam': return <XCircle className="h-4 w-4" />;
      case 'bug': return <AlertTriangle className="h-4 w-4" />;
      case 'suggestion': return <MessageSquare className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fraud': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'abuse': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'spam': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'bug': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'suggestion': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-red-500/20 text-red-400">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500/20 text-orange-400">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400">Medium</Badge>;
      default: return <Badge className="bg-blue-500/20 text-blue-400">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'investigating': return <Badge className="bg-blue-500/20 text-blue-400"><Eye className="h-3 w-3 mr-1" />Investigating</Badge>;
      case 'resolved': return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'dismissed': return <Badge className="bg-gray-500/20 text-gray-400"><XCircle className="h-3 w-3 mr-1" />Dismissed</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || report.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleUpdateStatus = (status: string) => {
    if (!selectedReport) return;
    updateStatusMutation.mutate({
      reportId: selectedReport.id,
      status,
      resolution: resolution.trim() || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <MessageSquare className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">User Report System</h2>
            <p className="text-sm text-gray-400">Manage and track user reports</p>
          </div>
        </div>
        <Button
          onClick={() => refetchReports()}
          variant="outline"
          size="sm"
          disabled={reportsLoading}
          data-testid="button-refresh-reports"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Reports</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.total || 0}
                </p>
              </div>
              <MessageSquare className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.pending || 0}
                </p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Investigating</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.investigating || 0}
                </p>
              </div>
              <Eye className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Resolved</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.resolved || 0}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Dismissed</p>
                <p className="text-xl font-bold text-white">
                  {statsLoading ? '—' : stats?.dismissed || 0}
                </p>
              </div>
              <XCircle className="h-6 w-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-nxe-surface">
          <TabsTrigger value="reports" className="data-[state=active]:bg-nxe-primary">
            Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-nxe-primary">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* Filters */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-search" className="text-gray-300">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="report-search"
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-nxe-dark border-nxe-border text-white"
                      data-testid="input-search-reports"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Category</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-category-filter">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border">
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="fraud">Fraud</SelectItem>
                      <SelectItem value="abuse">Abuse</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card className="bg-nxe-surface border-nxe-border">
            <CardHeader>
              <CardTitle className="text-white">User Reports</CardTitle>
              <CardDescription className="text-gray-400">
                {filteredReports.length} report(s) found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-nxe-border">
                      <TableHead className="text-gray-300">ID</TableHead>
                      <TableHead className="text-gray-300">Reporter</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Title</TableHead>
                      <TableHead className="text-gray-300">Priority</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          Loading reports...
                        </TableCell>
                      </TableRow>
                    ) : filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                          No reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((report) => (
                        <TableRow key={report.id} className="border-nxe-border">
                          <TableCell className="text-white">#{report.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-white text-sm">{report.reporterName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(report.category)}>
                              {getCategoryIcon(report.category)}
                              <span className="ml-1 capitalize">{report.category}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white max-w-xs truncate" title={report.title}>
                            {report.title}
                          </TableCell>
                          <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReport(report);
                                setIsDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-report-${report.id}`}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Reports by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.byCategory || {}).map(([category, count]) => {
                    const total = Object.values(stats?.byCategory || {}).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((count as number) / total) * 100 : 0;

                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 capitalize flex items-center gap-2">
                            {getCategoryIcon(category)}
                            {category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{count as number}</span>
                            <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Reports by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.byPriority || {}).map(([priority, count]) => {
                    const total = Object.values(stats?.byPriority || {}).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((count as number) / total) * 100 : 0;

                    return (
                      <div key={priority} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 capitalize">{priority}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{count as number}</span>
                            <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              priority === 'critical' ? 'bg-red-500' :
                              priority === 'high' ? 'bg-orange-500' :
                              priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-nxe-surface border-nxe-border text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details #{selectedReport?.id}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review and manage user report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Reporter</Label>
                  <p className="text-white">{selectedReport.reporterName}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Date</Label>
                  <p className="text-white">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Category</Label>
                  <div className="mt-1">
                    <Badge className={getCategoryColor(selectedReport.category)}>
                      {getCategoryIcon(selectedReport.category)}
                      <span className="ml-1 capitalize">{selectedReport.category}</span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Priority</Label>
                  <div className="mt-1">{getPriorityBadge(selectedReport.priority)}</div>
                </div>
              </div>

              <div>
                <Label className="text-gray-400">Title</Label>
                <p className="text-white font-medium mt-1">{selectedReport.title}</p>
              </div>

              <div>
                <Label className="text-gray-400">Description</Label>
                <p className="text-white mt-1">{selectedReport.description}</p>
              </div>

              {selectedReport.resolution && (
                <div>
                  <Label className="text-gray-400">Resolution</Label>
                  <p className="text-white mt-1">{selectedReport.resolution}</p>
                </div>
              )}

              <div>
                <Label className="text-gray-400">Current Status</Label>
                <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
              </div>

              {selectedReport.status !== 'resolved' && selectedReport.status !== 'dismissed' && (
                <div className="space-y-2">
                  <Label htmlFor="resolution" className="text-gray-300">Resolution Note</Label>
                  <Textarea
                    id="resolution"
                    placeholder="Add resolution details..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="bg-nxe-dark border-nxe-border text-white"
                    rows={3}
                    data-testid="textarea-resolution"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedReport?.status !== 'resolved' && selectedReport?.status !== 'dismissed' && (
              <div className="flex gap-2">
                {selectedReport?.status === 'pending' && (
                  <Button
                    onClick={() => handleUpdateStatus('investigating')}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-investigating"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Start Investigating
                  </Button>
                )}
                <Button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-resolve-report"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('dismissed')}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-dismiss-report"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => setIsDetailDialogOpen(false)}
              data-testid="button-close-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
