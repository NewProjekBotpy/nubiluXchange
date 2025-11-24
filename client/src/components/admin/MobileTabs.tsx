import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  badge?: number | boolean;
  content: React.ReactNode;
  disabled?: boolean;
}

interface MobileTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  showBadges?: boolean;
  variant?: "scrollable" | "dropdown" | "grid";
}

export default function MobileTabs({
  tabs,
  defaultTab,
  onTabChange,
  showBadges = true,
  variant = "scrollable"
}: MobileTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  // Scrollable variant (default for mobile)
  const ScrollableTabs = () => (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide bg-nxe-card rounded-lg p-1 mb-4 scroll-smooth">
        <div className="flex space-x-1 min-w-max">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={`flex items-center space-x-2 whitespace-nowrap min-h-[48px] px-5 ${
                activeTab === tab.id 
                  ? "bg-nxe-primary text-white" 
                  : "text-gray-400 hover:text-white hover:bg-nxe-surface"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon && <tab.icon className="h-4 w-4 flex-shrink-0" />}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
              {showBadges && tab.badge && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 min-w-[20px] text-xs bg-red-500 text-white"
                  data-testid={`badge-${tab.id}`}
                >
                  {typeof tab.badge === 'number' ? tab.badge : '!'}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  // Dropdown variant for many tabs
  const DropdownTabs = () => (
    <div className="w-full mb-4">
      <Select value={activeTab} onValueChange={handleTabChange}>
        <SelectTrigger 
          className="w-full bg-nxe-card border-nxe-surface text-white min-h-[48px]"
          data-testid="select-trigger-tabs"
        >
          <SelectValue>
            <div className="flex items-center space-x-2">
              {activeTabData?.icon && <activeTabData.icon className="h-4 w-4" />}
              <span>{activeTabData?.label}</span>
              {showBadges && activeTabData?.badge && (
                <Badge variant="secondary" className="ml-2 bg-red-500 text-white">
                  {typeof activeTabData.badge === 'number' ? activeTabData.badge : '!'}
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-nxe-surface border-nxe-surface">
          {tabs.map((tab) => (
            <SelectItem 
              key={tab.id} 
              value={tab.id} 
              disabled={tab.disabled}
              className="text-white hover:bg-nxe-card"
              data-testid={`select-option-${tab.id}`}
            >
              <div className="flex items-center space-x-2 w-full">
                {tab.icon && <tab.icon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {showBadges && tab.badge && (
                  <Badge variant="secondary" className="ml-auto bg-red-500 text-white">
                    {typeof tab.badge === 'number' ? tab.badge : '!'}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Grid variant for few tabs
  const GridTabs = () => (
    <div className="w-full mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`flex flex-col items-center space-y-1 min-h-[64px] py-4 relative ${
              activeTab === tab.id 
                ? "bg-nxe-primary text-white border-nxe-primary" 
                : "bg-nxe-card border-nxe-surface text-gray-400 hover:text-white hover:border-nxe-primary/50"
            }`}
            data-testid={`grid-tab-${tab.id}`}
          >
            {tab.icon && <tab.icon className="h-5 w-5" />}
            <span className="text-xs text-center leading-tight">{tab.label}</span>
            {showBadges && tab.badge && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] text-xs bg-red-500 text-white"
                data-testid={`grid-badge-${tab.id}`}
              >
                {typeof tab.badge === 'number' && tab.badge > 9 ? '9+' : (typeof tab.badge === 'number' ? tab.badge : '!')}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Render Navigation based on variant */}
      {variant === "scrollable" && <ScrollableTabs />}
      {variant === "dropdown" && <DropdownTabs />}
      {variant === "grid" && <GridTabs />}

      {/* Tab Content */}
      <div className="w-full" data-testid={`tab-content-${activeTab}`}>
        {activeTabData?.content}
      </div>
    </div>
  );
}

// Hook for responsive tab variant selection
export function useResponsiveTabVariant(tabCount: number) {
  if (tabCount <= 4) return "grid";
  if (tabCount <= 6) return "scrollable";
  return "dropdown";
}