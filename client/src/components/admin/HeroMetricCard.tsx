import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  gradient?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function HeroMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-nxe-primary",
  gradient = "from-nxe-primary/20 to-purple-500/20",
  trend
}: HeroMetricCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-nxe-surface bg-gradient-to-br",
        gradient,
        "hover:shadow-lg transition-all duration-300"
      )}
      data-testid="hero-metric-card"
    >
      <CardContent className="pt-3 pb-3 sm:pt-6 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-1 space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn("p-2 sm:p-3 bg-nxe-card/50 rounded-lg sm:rounded-xl backdrop-blur-sm", iconColor)}>
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400 font-medium" data-testid="hero-metric-title">
                  {title}
                </p>
                {subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5" data-testid="hero-metric-subtitle">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-end gap-2 sm:gap-3 mt-2 sm:mt-4">
              <h2 
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-none" 
                data-testid="hero-metric-value"
              >
                {value}
              </h2>
              {trend && (
                <span
                  className={cn(
                    "px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-1 sm:mb-2 flex items-center gap-1",
                    trend.isPositive
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  )}
                  data-testid="hero-metric-trend"
                >
                  {trend.isPositive ? "↑" : "↓"} {trend.value}
                </span>
              )}
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className={cn("p-6 bg-nxe-card/30 rounded-2xl backdrop-blur-sm", iconColor)}>
              <Icon className="h-16 w-16 opacity-40" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
