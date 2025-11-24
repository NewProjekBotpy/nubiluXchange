import LiveInsightsDashboard from "@/components/admin/LiveInsightsDashboard";

interface LiveInsightsTabProps {
  hasAdminAccess?: boolean;
}

export default function LiveInsightsTab({ hasAdminAccess = false }: LiveInsightsTabProps) {
  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-400">You don't have permission to access live insights.</p>
        </div>
      </div>
    );
  }

  return <LiveInsightsDashboard />;
}
