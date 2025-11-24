import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  ShoppingBag,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  gradient: string;
  description?: string;
  badge?: string;
}

interface SwipeableStatsCardsProps {
  stats?: StatCard[];
}

export default function SwipeableStatsCards({ stats = [] }: SwipeableStatsCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const defaultStats: StatCard[] = [
    {
      id: "users",
      title: "Total Users",
      value: "12,345",
      change: 12.5,
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      description: "Active users this month",
      badge: "↑ 12%"
    },
    {
      id: "revenue",
      title: "Revenue",
      value: "$45,678",
      change: 8.2,
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
      description: "Total revenue this month",
      badge: "↑ 8%"
    },
    {
      id: "orders",
      title: "Orders",
      value: "1,234",
      change: -3.1,
      icon: ShoppingBag,
      gradient: "from-purple-500 to-pink-500",
      description: "Orders processed today",
      badge: "↓ 3%"
    },
    {
      id: "messages",
      title: "Messages",
      value: "567",
      change: 15.8,
      icon: MessageSquare,
      gradient: "from-orange-500 to-red-500",
      description: "Support messages today",
      badge: "↑ 16%"
    },
    {
      id: "conversion",
      title: "Conversion Rate",
      value: "3.2%",
      change: 0.5,
      icon: TrendingUp,
      gradient: "from-indigo-500 to-purple-500",
      description: "Average conversion rate",
      badge: "↑ 0.5%"
    },
    {
      id: "active",
      title: "Active Now",
      value: "89",
      change: 5.2,
      icon: Activity,
      gradient: "from-pink-500 to-rose-500",
      description: "Users online right now",
      badge: "Live"
    }
  ];

  const finalStats = stats.length > 0 ? stats : defaultStats;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swiped left
      handleNext();
    }

    if (touchStart - touchEnd < -75) {
      // Swiped right
      handlePrev();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < finalStats.length - 1 ? prev + 1 : prev));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200",
              currentIndex === 0 
                ? "bg-nxe-surface/50 text-gray-600 cursor-not-allowed" 
                : "bg-nxe-surface text-gray-300 hover:bg-nxe-primary hover:text-white active:scale-95"
            )}
            data-testid="stats-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === finalStats.length - 1}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200",
              currentIndex === finalStats.length - 1
                ? "bg-nxe-surface/50 text-gray-600 cursor-not-allowed" 
                : "bg-nxe-surface text-gray-300 hover:bg-nxe-primary hover:text-white active:scale-95"
            )}
            data-testid="stats-next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div 
        ref={containerRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {finalStats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.change && stat.change > 0;
            const isActive = currentIndex === index;
            
            return (
              <div
                key={stat.id}
                className="w-full flex-shrink-0 px-1"
                data-testid={`stat-card-${stat.id}`}
              >
                <Card className={cn(
                  "bg-gradient-to-br backdrop-blur-sm border-0 transition-all duration-300",
                  stat.gradient,
                  isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white/80 text-sm font-medium">{stat.title}</p>
                          {stat.badge && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs font-semibold",
                                isPositive 
                                  ? "bg-white/20 text-white" 
                                  : "bg-white/20 text-white"
                              )}
                            >
                              {stat.badge}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                        {stat.description && (
                          <p className="text-white/70 text-xs">{stat.description}</p>
                        )}
                      </div>
                      
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Change Indicator */}
                    {stat.change !== undefined && (
                      <div className="flex items-center gap-2 pt-3 border-t border-white/20">
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md",
                          isPositive 
                            ? "bg-green-500/20 text-white" 
                            : "bg-red-500/20 text-white"
                        )}>
                          {isPositive ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          <span className="text-xs font-semibold">
                            {Math.abs(stat.change)}%
                          </span>
                        </div>
                        <span className="text-white/70 text-xs">vs last period</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {finalStats.map((stat, index) => (
          <button
            key={stat.id}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              currentIndex === index 
                ? "w-6 bg-nxe-primary" 
                : "w-1.5 bg-gray-600 hover:bg-gray-500"
            )}
            data-testid={`dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
