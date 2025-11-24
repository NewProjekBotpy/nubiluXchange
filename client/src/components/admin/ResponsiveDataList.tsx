import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, MoreVertical, ChevronDown, ChevronUp, CheckCircle, Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DataListItem {
  id: string | number;
  title: string;
  subtitle?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  };
  metadata: Array<{
    label: string;
    value: string | number;
    highlight?: boolean;
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline";
    icon?: React.ComponentType<any>;
  }>;
}

interface ResponsiveDataListProps {
  items: DataListItem[];
  title?: string;
  searchable?: boolean;
  filterable?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingCount?: number;
}

const LoadingSkeleton = () => (
  <Card className="bg-nxe-card border-nxe-border">
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 bg-nxe-surface/70 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-nxe-surface/50 rounded animate-pulse w-2/3"></div>
          </div>
          <div className="h-6 w-16 bg-nxe-surface/70 rounded animate-pulse flex-shrink-0"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-3 bg-nxe-surface/50 rounded animate-pulse"></div>
          <div className="h-3 bg-nxe-surface/50 rounded animate-pulse"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ResponsiveDataList({
  items,
  title,
  searchable = true,
  filterable = false,
  emptyMessage = "No data available",
  isLoading = false,
  loadingCount = 3
}: ResponsiveDataListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string | number>>(new Set());
  const [swipedItem, setSwipedItem] = useState<string | number | null>(null);
  const [longPressItem, setLongPressItem] = useState<string | number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const filteredItems = items.filter(item =>
    searchTerm === "" ||
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.metadata.some(meta => 
      meta.value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleExpanded = (id: string | number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Touch and gesture handling
  const handleTouchStart = (e: React.TouchEvent, itemId: string | number) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      setLongPressItem(itemId);
      setOpenDropdown(itemId); // Open dropdown on long press
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600); // Reduced to 600ms for better UX
  };

  const handleTouchMove = (e: React.TouchEvent, itemId: string | number) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Cancel long press if user moves finger too much
    if (deltaY > 10 && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    // Horizontal swipe detection (threshold: 50px, vertical tolerance: 30px)
    if (Math.abs(deltaX) > 50 && deltaY < 30) {
      if (deltaX < 0) {
        // Swipe left - reveal quick actions (standard iOS/Android pattern)
        setSwipedItem(itemId);
      } else {
        // Swipe right - hide actions
        setSwipedItem(null);
      }
      
      // Cancel long press
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchStartRef.current = null;
    
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Close swipe actions when touching elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setSwipedItem(null);
      setLongPressItem(null);
      setOpenDropdown(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
        )}
        {Array.from({ length: loadingCount }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || searchable || filterable) && (
        <div className="space-y-4">
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
          
          {(searchable || filterable) && (
            <div className="flex gap-2">
              {searchable && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-nxe-surface border-nxe-surface text-white min-h-[44px] sm:min-h-[48px] text-base sm:text-sm"
                    data-testid="input-search-data"
                  />
                </div>
              )}
              {filterable && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-nxe-surface min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 text-sm"
                  data-testid="button-filter-data"
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="bg-nxe-card border-nxe-border">
            <CardContent className="py-8 text-center">
              <p className="text-gray-400">{emptyMessage}</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const visibleMetadata = isExpanded ? item.metadata : item.metadata.slice(0, 2);
            const hasMoreMetadata = item.metadata.length > 2;

            return (
              <Card 
                key={item.id} 
                className={`bg-nxe-card border-nxe-surface hover:border-nxe-primary/50 relative overflow-hidden ${
                  longPressItem === item.id ? 'ring-2 ring-nxe-primary bg-nxe-primary/10' : ''
                } ${
                  item.isSelected ? 'ring-2 ring-nxe-primary border-nxe-primary bg-nxe-primary/5' : ''
                }`}
                data-testid={`data-item-${item.id}`}
                onTouchStart={(e) => handleTouchStart(e, item.id)}
                onTouchMove={(e) => handleTouchMove(e, item.id)}
                onTouchEnd={handleTouchEnd}
              >
                {/* Swipe Actions Background - Always present behind content */}
                {item.actions && item.actions.length > 0 && (
                  <div className="absolute inset-y-0 right-0 w-24 bg-red-600 z-0 flex items-center justify-center gap-1 pointer-events-none" data-testid={`quick-actions-${item.id}`}>
                    {item.actions.slice(0, 2).map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                          setSwipedItem(null);
                        }}
                        className="min-h-[48px] min-w-[48px] p-2 bg-red-600 hover:bg-red-700 text-white border-0 pointer-events-auto"
                        data-testid={`swipe-action-${action.label.toLowerCase().replace(/\s+/g, '-')}-${item.id}`}
                      >
                        {action.icon && <action.icon className="h-4 w-4" />}
                        <span className="sr-only">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}

                <CardContent className={`px-3 py-3 sm:px-5 sm:py-4 relative z-10 bg-nxe-card transition-transform duration-200 ${
                  swipedItem === item.id ? 'transform -translate-x-24' : ''
                }`}>
                  {/* Header Row - Enhanced mobile layout */}
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    {/* Selection checkbox */}
                    {item.onSelect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onSelect!();
                        }}
                        className="min-h-[32px] min-w-[32px] sm:min-h-[24px] sm:min-w-[24px] p-1 sm:p-0 mr-2 sm:mr-3 mt-0 sm:mt-1 text-gray-400 hover:text-white"
                        data-testid={`button-select-${item.id}`}
                      >
                        {item.isSelected ? (
                          <CheckCircle className="h-5 w-5 text-nxe-primary" />
                        ) : (
                          <Circle className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                    )}
                    
                    <div className="flex-1 min-w-0 mr-2 sm:mr-4">
                      <h4 className="font-semibold text-white truncate text-sm sm:text-base leading-tight" data-testid={`item-title-${item.id}`}>
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5 sm:mt-1 leading-tight" data-testid={`item-subtitle-${item.id}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {item.badge && (
                        <Badge 
                          variant={item.badge.variant || "default"}
                          className={item.badge.className}
                          data-testid={`item-badge-${item.id}`}
                        >
                          {item.badge.text}
                        </Badge>
                      )}
                      
                      {item.actions && item.actions.length > 0 && (
                        <DropdownMenu open={openDropdown === item.id} onOpenChange={(open) => {
                          if (!open) {
                            setOpenDropdown(null);
                            setLongPressItem(null);
                          }
                        }}>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] p-2 text-gray-400 hover:text-white"
                              data-testid={`button-actions-${item.id}`}
                              onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                            >
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-nxe-surface border-nxe-surface">
                            {item.actions.map((action, actionIndex) => (
                              <DropdownMenuItem
                                key={actionIndex}
                                onClick={action.onClick}
                                className="text-white hover:bg-nxe-card cursor-pointer min-h-[44px] sm:min-h-[48px] py-2 sm:py-3 px-3 sm:px-4 text-sm"
                                data-testid={`action-${action.label.toLowerCase().replace(/\s+/g, '-')}-${item.id}`}
                              >
                                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid - Enhanced mobile layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm">
                    {visibleMetadata.map((meta, index) => (
                      <div key={index} className="flex justify-between items-center py-0.5 sm:py-1">
                        <span className="text-gray-400 font-medium text-xs sm:text-sm truncate mr-2">{meta.label}:</span>
                        <span 
                          className={`font-semibold text-right flex-shrink-0 text-xs sm:text-sm ${meta.highlight ? 'text-nxe-primary' : 'text-white'}`}
                          data-testid={`meta-${meta.label.toLowerCase().replace(/\s+/g, '-')}-${item.id}`}
                        >
                          {meta.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Expand/Collapse Button - Enhanced for mobile */}
                  {hasMoreMetadata && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full mt-3 sm:mt-4 text-gray-400 hover:text-white min-h-[44px] sm:min-h-[48px] py-2 sm:py-3 border border-nxe-surface hover:border-nxe-primary/50 rounded-lg transition-colors text-sm"
                      data-testid={`button-toggle-${item.id}`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          <span className="font-medium">Show Less</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          <span className="font-medium">Show {item.metadata.length - 2} More Details</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>

                {/* Long Press Indicator */}
                {longPressItem === item.id && (
                  <div className="absolute inset-0 bg-nxe-primary/20 flex items-center justify-center">
                    <div className="text-white bg-nxe-primary px-3 py-1 rounded-full text-sm font-medium">
                      Release to open menu
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}