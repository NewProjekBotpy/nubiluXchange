import { useState, useRef, useEffect } from "react";
import { useAdvancedMobileGestures } from "@/hooks/useAdvancedMobileGestures";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TabLoadingOverlay from "@/components/admin/TabLoadingOverlay";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  badge?: number | boolean;
  content: React.ReactNode;
  disabled?: boolean;
}

interface ImprovedMobileTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  showBadges?: boolean;
  variant?: "scrollable" | "dropdown" | "grid";
  className?: string;
  isTabLoading?: boolean;
}

export default function ImprovedMobileTabs({
  tabs,
  defaultTab,
  onTabChange,
  showBadges = true,
  variant = "scrollable",
  className,
  isTabLoading
}: ImprovedMobileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [showLeftChevron, setShowLeftChevron] = useState(false);
  const [showRightChevron, setShowRightChevron] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Sync activeTab with defaultTab prop changes (for external navigation)
  useEffect(() => {
    if (defaultTab && defaultTab !== activeTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Enhanced gesture support for tab navigation
  const { bindGestures, gestureState } = useAdvancedMobileGestures({
    enableHapticFeedback: true,
    swipeThreshold: 60
  }, {
    onSwipeLeft: () => {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        handleTabChange(tabs[currentIndex + 1].id);
      }
    },
    onSwipeRight: () => {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex > 0) {
        handleTabChange(tabs[currentIndex - 1].id);
      }
    }
  });

  const handleTabChange = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    
    setActiveTab(tabId);
    onTabChange?.(tabId);
    
    // Scroll active tab into view without delay
    requestAnimationFrame(() => {
      if (activeTabRef.current && scrollContainerRef.current) {
        const tabElement = scrollContainerRef.current.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
        if (tabElement) {
          tabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }
    });
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftChevron(scrollLeft > 10);
      setShowRightChevron(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const scrollContainer = scrollContainerRef.current;
    
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      
      return () => {
        scrollContainer.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, [tabs]);

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  // Scrollable variant (optimized for mobile)
  const ScrollableTabs = () => (
    <div className="w-full min-w-0">
      {/* Tab Navigation with improved scrolling */}
      <div className="relative w-full min-w-0">
        {/* Left scroll button */}
        {showLeftChevron && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 sm:h-12 w-6 sm:w-8 p-0 bg-gradient-to-r from-nxe-background via-nxe-background/90 to-transparent hover:bg-nxe-surface flex-shrink-0"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </Button>
        )}

        {/* Right scroll button */}
        {showRightChevron && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 sm:h-12 w-6 sm:w-8 p-0 bg-gradient-to-l from-nxe-background via-nxe-background/90 to-transparent hover:bg-nxe-surface flex-shrink-0"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          </Button>
        )}

        {/* Scrollable tab container with gesture support */}
        <div
          ref={(node) => {
            if (node && scrollContainerRef.current !== node) {
              // This is the correct way to use a ref callback
              // when you need to also pass the node to another function
              (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              bindGestures(node);
            }
          }}
          className={cn(
            "flex overflow-x-auto scrollbar-hide bg-nxe-card/50 backdrop-blur-sm rounded-xl p-1 scroll-smooth transition-all duration-300 w-full min-w-0",
            gestureState.isPulling && "scale-105"
          )}
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div className="flex space-x-0.5 sm:space-x-1 min-w-max px-1 sm:px-2 lg:px-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : undefined}
                  data-tab-id={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "relative flex items-center justify-center space-x-1 sm:space-x-1.5 whitespace-nowrap min-h-[36px] sm:min-h-[40px] lg:min-h-[44px] px-1.5 sm:px-2.5 lg:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ease-out min-w-0",
                    "hover:scale-105 hover:shadow-lg active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    isActive 
                      ? "bg-nxe-primary text-white shadow-xl shadow-nxe-primary/25 scale-105" 
                      : "text-gray-400 hover:text-white hover:bg-nxe-surface/70 backdrop-blur-sm"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  {/* Active tab indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-nxe-primary/80 to-nxe-primary rounded-lg" />
                  )}
                  
                  <div className="relative flex items-center space-x-1 sm:space-x-2">
                    {Icon && (
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                        isActive && "rotate-12"
                      )} />
                    )}
                    <span className="hidden sm:inline transition-all duration-200 truncate max-w-[70px] lg:max-w-[90px]">{tab.label}</span>
                    <span className="sm:hidden text-xs transition-all duration-200 truncate max-w-[30px]">
                      {tab.label.split(' ')[0].slice(0, 4)}
                    </span>
                    {showBadges && tab.badge && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "h-4 min-w-[16px] text-xs px-1 transition-all duration-200",
                          isActive ? "bg-white text-nxe-primary" : "bg-red-500 text-white"
                        )}
                        data-testid={`badge-${tab.id}`}
                      >
                        {typeof tab.badge === 'number' ? tab.badge : '!'}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content without animations to prevent flicker */}
      <div className="mt-2 sm:mt-4 min-w-0 relative">
        <div className="min-w-0">
          {activeTabData?.content}
        </div>
      </div>
    </div>
  );

  // Dropdown variant for when there are too many tabs
  const DropdownTabs = () => (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 bg-nxe-card border-nxe-border hover:bg-nxe-surface transition-all duration-200"
            >
              {activeTabData?.icon && <activeTabData.icon className="h-4 w-4" />}
              <span>{activeTabData?.label || 'Select Tab'}</span>
              <MoreHorizontal className="h-4 w-4" />
              {showBadges && activeTabData?.badge && (
                <Badge variant="destructive" className="h-4 min-w-[16px] text-xs">
                  {typeof activeTabData.badge === 'number' ? activeTabData.badge : '!'}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "flex items-center justify-between cursor-pointer transition-colors duration-200",
                    activeTab === tab.id && "bg-nxe-primary text-white"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                  </div>
                  {showBadges && tab.badge && (
                    <Badge variant="destructive" className="h-4 min-w-[16px] text-xs">
                      {typeof tab.badge === 'number' ? tab.badge : '!'}
                    </Badge>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative">
        <div>
          {activeTabData?.content}
        </div>
      </div>
    </div>
  );

  // Grid variant for tablets
  const GridTabs = () => (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4 p-1 bg-nxe-card/50 rounded-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "relative flex flex-col items-center justify-center space-y-1 p-3 rounded-lg text-sm font-medium transition-all duration-300 ease-out",
                "hover:scale-105 hover:shadow-lg active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                isActive 
                  ? "bg-nxe-primary text-white shadow-xl shadow-nxe-primary/25" 
                  : "text-gray-400 hover:text-white hover:bg-nxe-surface/70"
              )}
              data-testid={`grid-tab-${tab.id}`}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="text-xs text-center">{tab.label}</span>
              {showBadges && tab.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 min-w-[16px] text-xs"
                >
                  {typeof tab.badge === 'number' ? tab.badge : '!'}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div>
          {activeTabData?.content}
        </div>
      </div>
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case "dropdown":
        return <DropdownTabs />;
      case "grid":
        return <GridTabs />;
      default:
        return <ScrollableTabs />;
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {renderVariant()}
    </div>
  );
}