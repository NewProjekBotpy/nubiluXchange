import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  MessageSquare,
  User,
  RefreshCw,
  FileText,
  Shield
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserReportTabProps {
  hasAdminAccess?: boolean;
}

interface UserReport {
  id: number;
  reporterId: number;
  reporterUsername: string;
  reportedUserId: number;
  reportedUsername: string;
  reason: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  adminNotes?: string;
}

export default function UserReportTab({ hasAdminAccess = false }: UserReportTabProps) {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: reports = [], isLoading, refetch } = useQuery<UserReport[]>({
    queryKey: ['/api/admin/user-reports'],
    enabled: hasAdminAccess,
    refetchInterval: false,
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const reviewReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: number; status: string; notes: string }) => {
      return apiRequest(`/api/admin/user-reports/${reportId}/review`, {
        method: 'POST',
        body: { status, adminNotes: notes }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-reports'] });
      toast({
        title: "Report reviewed",
        description: "The report has been processed successfully"
      });
      setSelectedReport(null);
      setReviewNotes('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to review report",
        variant: "destructive"
      });
    }
  });

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.reporterUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportedUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: JSX.Element; text: string }> = {
      pending: { variant: 'default', icon: <Clock className="h-3 w-3" />, text: 'Pending' },
      investigating: { variant: 'secondary', icon: <AlertTriangle className="h-3 w-3" />, text: 'Investigating' },
      resolved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, text: 'Resolved' },
      dismissed: { variant: 'outline', icon: <XCircle className="h-3 w-3" />, text: 'Dismissed' }
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const handleReview = (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;
    reviewReportMutation.mutate({
      reportId: selectedReport.id,
      status,
      notes: reviewNotes
    });
  };

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-400">You don't have permission to access user reports.</p>
        </div>
      </div>
    );
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const investigatingCount = reports.filter(r => r.status === 'investigating').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">User Reports</h2>
            <p className="text-sm text-gray-400">Manage user reports and violations</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-reports"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-total-reports">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{reports.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-pending-reports">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-investigating-reports">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Investigating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{investigatingCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-nxe-surface border-nxe-border" data-testid="card-resolved-reports">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reports by username or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-nxe-surface border-nxe-border text-white"
            data-testid="input-search-reports"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList className="bg-nxe-surface">
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="filter-pending">Pending</TabsTrigger>
            <TabsTrigger value="investigating" data-testid="filter-investigating">Investigating</TabsTrigger>
            <TabsTrigger value="resolved" data-testid="filter-resolved">Resolved</TabsTrigger>
            <TabsTrigger value="dismissed" data-testid="filter-dismissed">Dismissed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Reports List */}
      <Card className="bg-nxe-surface border-nxe-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-nxe-surface rounded w-3/4"></div>
                  <div className="h-3 bg-nxe-surface rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredReports.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-nxe-surface">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 hover:bg-nxe-surface/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                    data-testid={`report-item-${report.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(report.status)}
                          <Badge variant="outline" className="text-xs">
                            {report.reason}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-white font-medium">{report.reporterUsername}</span>
                          <span className="text-gray-400">reported</span>
                          <span className="text-white font-medium">{report.reportedUsername}</span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">{report.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                        }}
                        data-testid={`button-view-report-${report.id}`}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-nxe-surface border-nxe-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Review Report</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review and take action on this user report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Reporter</p>
                  <p className="text-white font-medium">{selectedReport.reporterUsername}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Reported User</p>
                  <p className="text-white font-medium">{selectedReport.reportedUsername}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Reason</p>
                  <Badge variant="outline">{selectedReport.reason}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Description</p>
                <p className="text-white bg-nxe-dark p-3 rounded-lg">{selectedReport.description}</p>
              </div>

              {selectedReport.adminNotes && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Existing Admin Notes</p>
                  <p className="text-white bg-nxe-dark p-3 rounded-lg">{selectedReport.adminNotes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400 mb-2">Admin Notes</p>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="bg-nxe-dark border-nxe-border text-white"
                  rows={4}
                  data-testid="textarea-admin-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null);
                setReviewNotes('');
              }}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview('dismissed')}
              disabled={reviewReportMutation.isPending}
              className="border-gray-600 text-gray-300"
              data-testid="button-dismiss-report"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button
              onClick={() => handleReview('resolved')}
              disabled={reviewReportMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-resolve-report"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
