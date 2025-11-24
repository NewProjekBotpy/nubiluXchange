import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  X,
  Users,
  Package,
  Settings,
  BarChart3,
  MessageSquare,
  Shield,
  Bell,
  FileText,
  DollarSign,
  TrendingUp,
  Command,
  ArrowRight,
  Clock,
  Star,
  Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
  category: string;
  keywords: string[];
  action: () => void;
  badge?: string;
}

interface MobileCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tabId: string) => void;
}

export default function MobileCommandPalette({ 
  isOpen, 
  onClose,
  onNavigate 
}: MobileCommandPaletteProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      title: "Go to Dashboard",
      description: "View analytics and stats",
      icon: BarChart3,
      category: "Navigation",
      keywords: ["dashboard", "analytics", "stats", "overview"],
      action: () => {
        onNavigate?.("dashboard");
        handleClose();
      }
    },
    {
      id: "users",
      title: "Manage Users",
      description: "View and edit users",
      icon: Users,
      category: "Navigation",
      keywords: ["users", "customers", "accounts", "members"],
      action: () => {
        onNavigate?.("users");
        handleClose();
      },
      badge: "123"
    },
    {
      id: "activity",
      title: "View Activity",
      description: "Monitor system activity",
      icon: Activity,
      category: "Navigation",
      keywords: ["activity", "logs", "history", "monitoring"],
      action: () => {
        onNavigate?.("activity");
        handleClose();
      }
    },
    {
      id: "configs",
      title: "Configurations",
      description: "Admin configurations",
      icon: Settings,
      category: "Navigation",
      keywords: ["configs", "settings", "configuration", "preferences"],
      action: () => {
        onNavigate?.("configs");
        handleClose();
      }
    },
    {
      id: "add-user",
      title: "Add New User",
      description: "Create a new user account",
      icon: Users,
      category: "Actions",
      keywords: ["add", "create", "new", "user"],
      action: () => {
        toast({
          title: "Add User",
          description: "User creation feature coming soon",
        });
        handleClose();
      }
    },
    {
      id: "add-product",
      title: "Add New Product",
      description: "Create a new product",
      icon: Package,
      category: "Actions",
      keywords: ["add", "create", "new", "product"],
      action: () => {
        toast({
          title: "Add Product",
          description: "Product creation feature coming soon",
        });
        handleClose();
      }
    },
    {
      id: "send-notification",
      title: "Send Notification",
      description: "Broadcast to all users",
      icon: Bell,
      category: "Actions",
      keywords: ["send", "notification", "broadcast", "message"],
      action: () => {
        toast({
          title: "Send Notification",
          description: "Notification feature coming soon",
        });
        handleClose();
      }
    },
    {
      id: "export-data",
      title: "Export Data",
      description: "Download reports and data",
      icon: FileText,
      category: "Actions",
      keywords: ["export", "download", "report", "data"],
      action: () => {
        toast({
          title: "Export Data",
          description: "Data export feature coming soon",
        });
        handleClose();
      }
    }
  ];

  const filteredCommands = search.length > 0
    ? commands.filter(cmd => 
        cmd.title.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(search.toLowerCase()) ||
        cmd.keywords.some(kw => kw.toLowerCase().includes(search.toLowerCase()))
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleClose = () => {
    setSearch("");
    setSelectedIndex(0);
    onClose();
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setSelectedIndex(0);
  };

  const handleSelect = (cmd: CommandItem) => {
    // Add to recent searches
    if (!recentSearches.includes(cmd.title)) {
      setRecentSearches(prev => [cmd.title, ...prev.slice(0, 4)]);
    }
    cmd.action();
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in-0 duration-200"
        onClick={handleClose}
        data-testid="command-palette-backdrop"
      />

      {/* Command Palette */}
      <div className="fixed inset-x-4 top-20 z-50 max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-300">
        <div className="bg-nxe-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-nxe-border overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b border-nxe-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search commands, actions, or pages..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 bg-nxe-surface border-nxe-surface text-white placeholder:text-gray-500"
                data-testid="command-palette-input"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  data-testid="command-palette-clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[400px]">
            {search.length === 0 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Recent</span>
                </div>
                {recentSearches.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setSearch(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-nxe-surface transition-colors"
                  >
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{item}</span>
                  </button>
                ))}
              </div>
            )}

            {Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">
                  <span>{category}</span>
                </div>
                {items.map((cmd, index) => {
                  const Icon = cmd.icon;
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                        isSelected 
                          ? "bg-nxe-primary text-white scale-[1.02]" 
                          : "text-gray-300 hover:bg-nxe-surface"
                      )}
                      data-testid={`command-${cmd.id}`}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isSelected ? "bg-white/20" : "bg-nxe-surface"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{cmd.title}</p>
                          {cmd.badge && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                isSelected ? "bg-white/20" : ""
                              )}
                            >
                              {cmd.badge}
                            </Badge>
                          )}
                        </div>
                        {cmd.description && (
                          <p className={cn(
                            "text-xs mt-0.5",
                            isSelected ? "text-white/80" : "text-gray-500"
                          )}>
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className={cn(
                        "h-4 w-4 transition-all",
                        isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                      )} />
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && search.length > 0 && (
              <div className="p-8 text-center">
                <div className="inline-flex p-3 bg-nxe-surface rounded-full mb-3">
                  <Search className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm">No commands found for "{search}"</p>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-nxe-border bg-nxe-surface/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-nxe-card border border-nxe-border rounded text-gray-400">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-nxe-card border border-nxe-border rounded text-gray-400">↵</kbd>
                  <span>Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-nxe-card border border-nxe-border rounded text-gray-400">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
