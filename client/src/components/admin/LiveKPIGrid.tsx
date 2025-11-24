import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveKPIItem {
  id: string;
  title: string;
  value: string | number;
  previousValue?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    percentage?: number;
  };
  isLoading?: boolean;
  isLive?: boolean;
  lastUpdated?: string;
  status?: 'healthy' | 'warning' | 'critical';
  target?: number;
  unit?: string;
}

interface LiveKPIGridProps {
  items: LiveKPIItem[];
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  showLiveIndicators?: boolean;
  animateChanges?: boolean;
  className?: string;
}

// Enhanced grid classes for better responsive design
const getGridClasses = (columns: { mobile: number; tablet: number; desktop: number }) => {
  const mobileClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }[columns.mobile] || 'grid-cols-2';
  
  const tabletClass = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2', 
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6'
  }[columns.tablet] || 'sm:grid-cols-2';
  
  const desktopClass = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6'
  }[columns.desktop] || 'lg:grid-cols-4';
  
  return `grid gap-2 sm:gap-4 ${mobileClass} ${tabletClass} ${desktopClass}`;
};

export default function LiveKPIGrid({ 
  items, 
  columns = { mobile: 2, tablet: 2, desktop: 4 },
  showLiveIndicators = true,
  animateChanges = true,
  className
}: LiveKPIGridProps) {
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const gridClasses = getGridClasses(columns);

  // Track value changes for animations
  useEffect(() => {
    if (!animateChanges) return;

    const newAnimatingItems = new Set<string>();
    items.forEach(item => {
      if (item.previousValue !== undefined && item.value !== item.previousValue) {
        newAnimatingItems.add(item.id);
      }
    });

    if (newAnimatingItems.size > 0) {
      setAnimatingItems(newAnimatingItems);
      
      // Clear animations after 2 seconds
      const timer = setTimeout(() => {
        setAnimatingItems(new Set());
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [items, animateChanges]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'border-nxe-success/50 shadow-nxe-success/10';
      case 'warning':
        return 'border-nxe-warning/50 shadow-nxe-warning/10';
      case 'critical':
        return 'border-nxe-error/50 shadow-nxe-error/10';
      default:
        return 'border-nxe-primary/30';
    }
  };

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-nxe-success';
      case 'warning':
        return 'bg-nxe-warning';
      case 'critical':
        return 'bg-nxe-error';
      default:
        return 'bg-nxe-primary';
    }
  };

  const getTrendIcon = (trend?: { isPositive: boolean }) => {
    if (!trend) return Minus;
    return trend.isPositive ? TrendingUp : TrendingDown;
  };

  const formatValue = (value: string | number, unit?: string) => {
    if (typeof value === 'number') {
      // Format large numbers
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M${unit ? ` ${unit}` : ''}`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K${unit ? ` ${unit}` : ''}`;
      }
      return `${value}${unit ? ` ${unit}` : ''}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const calculateProgress = (value: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min((value / target) * 100, 100);
  };

  return (
    <div className={cn(gridClasses, className)}>
      {items.map((item, index) => {
        const isAnimating = animatingItems.has(item.id);
        const TrendIcon = getTrendIcon(item.trend);
        const progress = typeof item.value === 'number' && item.target 
          ? calculateProgress(item.value, item.target) 
          : undefined;

        return (
          <Card 
            key={item.id}
            className={cn(
              'metric-card hover-lift transition-modern active:scale-95 touch-manipulation relative overflow-hidden',
              getStatusColor(item.status),
              isAnimating && 'animate-pulse ring-2 ring-nxe-accent/50'
            )}
            data-testid={`live-kpi-card-${item.id}`}
          >
            {/* Live indicator */}
            {showLiveIndicators && item.isLive && (
              <div className="absolute top-2 right-2">
                <div className="flex items-center space-x-1">
                  <div className={cn(
                    'w-2 h-2 rounded-full animate-pulse',
                    getStatusIndicator(item.status)
                  )} />
                  <Activity className="h-3 w-3 text-nxe-success animate-pulse" />
                </div>
              </div>
            )}

            {/* Status indicator */}
            {item.status && (
              <div className={cn(
                'absolute top-0 left-0 w-full h-1',
                getStatusIndicator(item.status)
              )} />
            )}

            <CardHeader className="pb-2 pt-3 px-3 sm:pb-3 sm:pt-5 sm:px-5">
              <CardTitle className="text-xs sm:text-sm font-medium text-nxe-text flex items-center justify-between">
                <span className="truncate flex-1 mr-1 sm:mr-2">{item.title}</span>
                <item.icon className={cn(
                  'h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-colors',
                  item.iconColor || 'text-nxe-accent hover-glow'
                )} />
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-0 px-3 pb-3 sm:px-5 sm:pb-5">
              <div className="space-y-2 sm:space-y-3">
                {/* Main Value */}
                <div className={cn(
                  'text-xl sm:text-2xl md:text-3xl font-bold text-white leading-none transition-smooth',
                  isAnimating && 'scale-110'
                )}>
                  {item.isLoading ? (
                    <Skeleton className="h-6 sm:h-9 w-16 sm:w-20 loading-shimmer" />
                  ) : (
                    <span 
                      data-testid={`live-kpi-value-${item.id}`}
                      className="transition-smooth"
                    >
                      {formatValue(item.value, item.unit)}
                    </span>
                  )}
                </div>

                {/* Progress bar for targets */}
                {progress !== undefined && (
                  <div className="w-full bg-nxe-surface rounded-full h-1 sm:h-1.5">
                    <div 
                      className={cn(
                        'h-1 sm:h-1.5 rounded-full transition-all duration-1000',
                        progress >= 100 ? 'bg-nxe-success' :
                        progress >= 75 ? 'bg-nxe-accent' :
                        progress >= 50 ? 'bg-nxe-warning' :
                        'bg-nxe-error'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                
                {/* Subtitle and Trend */}
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  {item.subtitle && (
                    <span 
                      className="text-nxe-secondary truncate flex-1 mr-1 sm:mr-2" 
                      data-testid={`live-kpi-subtitle-${item.id}`}
                    >
                      {item.subtitle}
                    </span>
                  )}
                  
                  {item.trend && (
                    <div className="flex items-center space-x-0.5 sm:space-x-1">
                      <TrendIcon className={cn(
                        'h-2.5 w-2.5 sm:h-3 sm:w-3',
                        item.trend.isPositive ? 'text-nxe-success' : 'text-nxe-error'
                      )} />
                      <span 
                        className={cn(
                          'badge-modern text-[10px] sm:text-xs font-medium',
                          item.trend.isPositive ? 'status-online' : 'status-error'
                        )}
                        data-testid={`live-kpi-trend-${item.id}`}
                      >
                        {item.trend.isPositive ? '+' : ''}{item.trend.value}
                        {item.trend.percentage && ` (${item.trend.percentage}%)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Target information */}
                {item.target && typeof item.value === 'number' && (
                  <div className="text-[10px] sm:text-xs text-nxe-secondary">
                    Target: {formatValue(item.target, item.unit)} 
                    {progress && (
                      <span className={cn(
                        'ml-1 sm:ml-2 font-medium',
                        progress >= 100 ? 'text-nxe-success' :
                        progress >= 75 ? 'text-nxe-accent' :
                        'text-nxe-warning'
                      )}>
                        ({progress.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}

                {/* Last updated */}
                {showLiveIndicators && item.lastUpdated && (
                  <div className="text-[10px] sm:text-xs text-nxe-secondary flex items-center space-x-1">
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-nxe-success rounded-full animate-pulse" />
                    <span>Updated {new Date(item.lastUpdated).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Utility function to create live KPI items from regular KPI items
export function enhanceKPIWithLiveData(
  kpiItem: any, 
  liveData?: any, 
  isLive: boolean = false
): LiveKPIItem {
  return {
    id: kpiItem.id || `kpi-${Math.random()}`,
    title: kpiItem.title,
    value: liveData?.value ?? kpiItem.value,
    previousValue: kpiItem.value,
    subtitle: kpiItem.subtitle,
    icon: kpiItem.icon,
    iconColor: kpiItem.iconColor,
    trend: liveData?.trend ?? kpiItem.trend,
    isLoading: kpiItem.isLoading || false,
    isLive,
    lastUpdated: liveData?.lastUpdated || new Date().toISOString(),
    status: liveData?.status || 'healthy',
    target: kpiItem.target,
    unit: kpiItem.unit
  };
}