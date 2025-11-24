import { useState, useCallback } from "react";
import { DataExportCenter } from "@/components/admin";
import PullToRefresh from "@/components/admin/PullToRefresh";
import { useToast } from "@/hooks/use-toast";

interface ExportTabProps {
  hasAdminAccess?: boolean;
}

export default function ExportTab({ hasAdminAccess = false }: ExportTabProps) {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Refreshed",
      description: "Export data has been refreshed"
    });
  }, [toast]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <DataExportCenter 
        key={refreshKey}
        hasAdminAccess={hasAdminAccess}
        onExportComplete={(type) => {
          toast({
            title: "Export completed",
            description: `${type} data exported successfully`
          });
        }}
      />
    </PullToRefresh>
  );
}
