import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

export interface KPIItem {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

interface KPIGridProps {
  items: KPIItem[];
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

// Explicit grid classes for Tailwind CSS purging
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
    4: 'sm:grid-cols-4'
  }[columns.tablet] || 'sm:grid-cols-2';
  
  const desktopClass = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6'
  }[columns.desktop] || 'lg:grid-cols-4';
  
  return `grid gap-2 sm:gap-3 ${mobileClass} ${tabletClass} ${desktopClass}`;
};

export default function KPIGrid({ 
  items, 
  columns = { mobile: 2, tablet: 2, desktop: 4 } 
}: KPIGridProps) {
  const gridClasses = getGridClasses(columns);

  return (
    <div className={`${gridClasses} p-0`}>
      {items.map((item, index) => (
        <Card 
          key={index} 
          className="metric-card hover-lift transition-modern active:scale-95 touch-manipulation min-h-[70px] sm:min-h-[80px]"
          data-testid={`kpi-card-${index}`}
        >
          <CardHeader className="pb-0.5 pt-1.5 px-1.5 sm:pb-1 sm:pt-2 sm:px-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-nxe-text flex items-center justify-between">
              <span className="truncate flex-1 mr-0.5 sm:mr-1 leading-tight">{item.title}</span>
              <item.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 transition-colors ${item.iconColor || 'text-nxe-accent hover-glow'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-1.5 pb-1.5 sm:px-2 sm:pb-2">
            <div className="space-y-0.5 sm:space-y-1 flex flex-col justify-between h-full">
              {/* Main Value - Compact mobile */}
              <div className="text-base sm:text-lg md:text-xl font-bold text-white leading-none min-h-[18px] sm:min-h-[20px] flex items-center">
                {item.isLoading ? (
                  <Skeleton className="h-4 sm:h-5 w-10 sm:w-12 loading-shimmer" />
                ) : (
                  <span data-testid={`kpi-value-${index}`} className="transition-smooth">{item.value}</span>
                )}
              </div>
              
              {/* Subtitle and Trend - Compact layout */}
              <div className="flex items-center justify-between gap-0.5 sm:gap-1 text-xs sm:text-sm">
                {item.subtitle && (
                  <span className="text-nxe-secondary truncate flex-1 leading-tight" data-testid={`kpi-subtitle-${index}`}>
                    {item.subtitle}
                  </span>
                )}
                {item.trend && (
                  <span 
                    className={`badge-modern text-xs px-1 sm:px-1.5 py-0.5 rounded-full ${
                      item.trend.isPositive 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                    data-testid={`kpi-trend-${index}`}
                  >
                    {item.trend.isPositive ? '+' : ''}{item.trend.value}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}