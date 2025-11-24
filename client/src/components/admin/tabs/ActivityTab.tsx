import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Activity } from "lucide-react";
import { LiveActivityFeed, SearchBar, EmptyState, FilterChips, CardSkeleton, PullToRefresh } from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminPanel } from "@/features/admin";
import type { FilterChip } from "@/components/admin/FilterChips";

interface ActivityLog {
  id: number;
  userId?: number;
  adminId?: number;
  action: string;
  category: 'user_action' | 'system_action' | 'ai_action';
  details: Record<string, any>;
  status: 'success' | 'error' | 'warning';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ActivityTabProps {
  hasAdminAccess?: boolean;
}

export default function ActivityTab({ hasAdminAccess = false }: ActivityTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isRealTimeEnabled } = useAdminPanel();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: activityLogs = [], isLoading: logsLoading, error: logsError } = useQuery<ActivityLog[]>({
    queryKey: ['/api/admin/activity-logs'],
    enabled: hasAdminAccess,
  });

  const filterChips: FilterChip[] = [
    { id: "all", label: "All", value: "all", active: activeFilter === "all" },
    { id: "success", label: "Success", value: "success", active: activeFilter === "success" },
    { id: "warning", label: "Warning", value: "warning", active: activeFilter === "warning" },
    { id: "error", label: "Error", value: "error", active: activeFilter === "error" },
  ];

  const filteredActivities = useMemo(() => {
    let filtered = activityLogs;

    if (activeFilter !== "all") {
      filtered = filtered.filter(log => log.status === activeFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const user = log.userId ? `User ${log.userId}` : (log.adminId ? `Admin ${log.adminId}` : 'System');
        return (
          log.action.toLowerCase().includes(term) ||
          user.toLowerCase().includes(term) ||
          log.category.toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }, [activityLogs, activeFilter, searchTerm]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] });
    toast({
      title: "Activity logs refreshed",
      description: "Latest activity data loaded"
    });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setActiveFilter("all");
  };

  if (logsLoading) {
    return <CardSkeleton variant="list" count={3} />;
  }

  if (logsError) {
    return (
      <Card className="bg-red-900/20 border-red-500">
        <CardContent className="pt-6">
          <p className="text-red-400">Failed to load activity logs. Please refresh.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by action or user..."
          onClear={() => setSearchTerm("")}
        />

        <FilterChips
          filters={filterChips}
          onChange={(filterId) => setActiveFilter(filterId)}
          mode="single"
        />

        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={searchTerm ? Search : Activity}
            title={searchTerm ? "No matching activities" : "No activities found"}
            description={
              searchTerm || activeFilter !== "all"
                ? "Try clearing your filters or adjusting your search criteria"
                : "Check back later for activity updates"
            }
            action={
              searchTerm || activeFilter !== "all"
                ? {
                    label: "Clear Filters",
                    onClick: handleClearFilters
                  }
                : undefined
            }
          />
        ) : (
          <LiveActivityFeed
            activities={filteredActivities.map(log => ({
              id: String(log.id),
              type: log.category,
              user: log.userId ? `User ${log.userId}` : (log.adminId ? `Admin ${log.adminId}` : 'System'),
              action: log.action,
              timestamp: log.createdAt,
              status: log.status
            }))}
            onClearActivities={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] });
              toast({
                title: "Activity logs refreshed",
                description: "Latest activity data loaded"
              });
            }}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] });
            }}
            isLive={isRealTimeEnabled}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
