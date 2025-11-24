import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

interface PerformanceDashboardProps {
  enabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function PerformanceDashboard({ 
  enabled = true, 
  showDetails = false,
  className = ''
}: PerformanceDashboardProps) {
  const { metrics, getScore, getOverallScore, logMetrics } = usePerformanceMonitoring(enabled);

  if (!enabled) return null;

  const overallScore = getOverallScore();
  const scoreColors = {
    good: 'text-green-400',
    needs_improvement: 'text-yellow-400',
    poor: 'text-red-400'
  };

  return (
    <div className={`bg-nxe-card border-nxe-surface rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Performance</h3>
        <div className={`text-sm font-medium ${scoreColors[overallScore]}`}>
          {overallScore.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">FCP:</span>
            <span className={`ml-2 ${metrics.fcp ? scoreColors[getScore('fcp', metrics.fcp) || 'good'] : 'text-gray-500'}`}>
              {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">LCP:</span>
            <span className={`ml-2 ${metrics.lcp ? scoreColors[getScore('lcp', metrics.lcp) || 'good'] : 'text-gray-500'}`}>
              {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">FID:</span>
            <span className={`ml-2 ${metrics.fid ? scoreColors[getScore('fid', metrics.fid) || 'good'] : 'text-gray-500'}`}>
              {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">CLS:</span>
            <span className={`ml-2 ${metrics.cls ? scoreColors[getScore('cls', metrics.cls) || 'good'] : 'text-gray-500'}`}>
              {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={logMetrics}
        className="mt-3 text-xs text-gray-400 hover:text-white transition-colors"
      >
        Log detailed metrics to console
      </button>
    </div>
  );
}