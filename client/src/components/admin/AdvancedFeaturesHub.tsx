import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  Sparkles,
  MessageSquare,
  ImagePlus,
  Shield,
  Bot,
  BarChart3,
  Users,
  Lock,
  Smartphone,
  Video,
  FileText,
  TrendingUp,
  Zap,
  ChevronRight,
  Clock,
  LucideIcon,
  LayoutGrid,
  List,
  Calendar,
  Bell,
  ExternalLink,
  ArrowRight,
  Star,
  AlertCircle,
  Search,
  ThumbsUp,
  Flame,
  Rocket,
  Target,
  TrendingDown,
  Activity,
  Layers,
  Grid3x3,
  Vote,
  Heart,
  Bookmark,
  Share2,
  Filter,
  SortAsc,
  Eye,
  Boxes
} from "lucide-react";
import { cn, formatTikTokNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type FeatureStatus = "coming_soon" | "in_development" | "planned";
type FeaturePriority = "high" | "medium" | "low";
type ViewMode = "bento" | "kanban" | "timeline" | "compact" | "carousel";
type SortMode = "priority" | "progress" | "date" | "popularity";

interface UnimplementedFeature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: FeatureStatus;
  priority: FeaturePriority;
  progress: number;
  estimatedDate?: string;
  details: string[];
  color: string;
  category: string;
  href?: string;
  votes?: number;
  views?: number;
  size?: "small" | "medium" | "large";
}

const UNIMPLEMENTED_FEATURES: UnimplementedFeature[] = [
  {
    id: "real-time-chat",
    title: "Real-time Chat",
    description: "WebSocket chat with typing indicators and online status",
    icon: MessageSquare,
    status: "in_development",
    priority: "high",
    progress: 65,
    estimatedDate: "Q2 2025",
    details: [
      "WebSocket integration with Pusher",
      "Typing indicators real-time",
      "Online/offline status",
      "Read receipts",
      "Message reactions"
    ],
    color: "from-blue-500 to-cyan-500",
    category: "Communication",
    href: "/admin/features/real-time-chat",
    votes: 142,
    views: 1250,
    size: "large"
  },
  {
    id: "file-upload",
    title: "File Upload System",
    description: "Upload product images and media files with cloud storage",
    icon: ImagePlus,
    status: "in_development",
    priority: "high",
    progress: 45,
    estimatedDate: "Q2 2025",
    details: [
      "Multi-file upload support",
      "Image compression & optimization",
      "Cloud storage integration (Cloudinary/S3)",
      "Drag & drop interface",
      "Preview thumbnails"
    ],
    color: "from-purple-500 to-pink-500",
    category: "Media",
    href: "/admin/features/file-upload",
    votes: 98,
    views: 890,
    size: "medium"
  },
  {
    id: "2fa",
    title: "Two-Factor Authentication",
    description: "Two-factor authentication for extra security",
    icon: Lock,
    status: "in_development",
    priority: "high",
    progress: 30,
    estimatedDate: "Q2 2025",
    details: [
      "TOTP (Time-based OTP) support",
      "QR code generation",
      "Backup codes",
      "SMS verification fallback",
      "Biometric authentication"
    ],
    color: "from-red-500 to-orange-500",
    category: "Security",
    href: "/admin/features/2fa",
    votes: 187,
    views: 1450,
    size: "medium"
  },
  {
    id: "ai-chat",
    title: "AI Admin Assistant",
    description: "AI-powered admin chat for admin task automation",
    icon: Bot,
    status: "in_development",
    priority: "medium",
    progress: 55,
    estimatedDate: "Q3 2025",
    details: [
      "Natural language commands",
      "Automated user queries response",
      "Smart data analysis",
      "Report generation",
      "Predictive insights"
    ],
    color: "from-green-500 to-emerald-500",
    category: "AI & Automation",
    href: "/admin/features/ai-assistant",
    votes: 156,
    views: 1100,
    size: "large"
  },
  {
    id: "phone-alerts",
    title: "SMS Alert Manager",
    description: "SMS notification system for important alerts",
    icon: Smartphone,
    status: "planned",
    priority: "medium",
    progress: 20,
    estimatedDate: "Q3 2025",
    details: [
      "Twilio integration",
      "Custom alert templates",
      "Multi-recipient support",
      "Alert scheduling",
      "Delivery tracking"
    ],
    color: "from-indigo-500 to-blue-500",
    category: "Communication",
    href: "/admin/phone-alerts",
    votes: 67,
    views: 420,
    size: "small"
  },
  {
    id: "video-comments",
    title: "Video Comments",
    description: "Comment system for video content",
    icon: Video,
    status: "planned",
    priority: "low",
    progress: 10,
    estimatedDate: "Q4 2025",
    details: [
      "Threaded comments",
      "Timestamp references",
      "Video reactions",
      "Comment moderation",
      "Notification system"
    ],
    color: "from-yellow-500 to-amber-500",
    category: "Content",
    href: "/admin/features/video-comments",
    votes: 45,
    views: 320,
    size: "small"
  },
  {
    id: "advanced-analytics",
    title: "Real-time Analytics",
    description: "Real-time analytics dashboard with predictive insights",
    icon: BarChart3,
    status: "in_development",
    priority: "medium",
    progress: 40,
    estimatedDate: "Q3 2025",
    details: [
      "Live data streaming",
      "Custom metrics builder",
      "Predictive analytics",
      "Export reports (PDF/Excel)",
      "Scheduled reports"
    ],
    color: "from-teal-500 to-cyan-500",
    category: "Analytics",
    href: "/admin/features/advanced-analytics",
    votes: 123,
    views: 980,
    size: "medium"
  },
  {
    id: "seller-dashboard",
    title: "Seller Dashboard",
    description: "Complete dashboard for sellers with sales tracking",
    icon: TrendingUp,
    status: "planned",
    priority: "high",
    progress: 15,
    estimatedDate: "Q2 2025",
    details: [
      "Sales analytics",
      "Inventory management",
      "Order tracking",
      "Revenue reports",
      "Customer insights"
    ],
    color: "from-violet-500 to-purple-500",
    category: "E-commerce",
    href: "/admin/features/seller-dashboard",
    votes: 201,
    views: 1680,
    size: "large"
  },
  {
    id: "fraud-detection",
    title: "Advanced Fraud Detection",
    description: "AI-powered fraud detection with device fingerprinting",
    icon: Shield,
    status: "in_development",
    priority: "high",
    progress: 50,
    estimatedDate: "Q2 2025",
    details: [
      "Device fingerprinting",
      "Transaction velocity analysis",
      "Behavioral analysis",
      "Risk scoring",
      "Automated blocking"
    ],
    color: "from-red-500 to-rose-500",
    category: "Security",
    href: "/admin/fraud",
    votes: 178,
    views: 1320,
    size: "medium"
  },
  {
    id: "user-reports",
    title: "User Reporting System",
    description: "User reporting system with approval workflow",
    icon: FileText,
    status: "planned",
    priority: "medium",
    progress: 25,
    estimatedDate: "Q3 2025",
    details: [
      "Report categorization",
      "Automated ticket creation",
      "Admin review workflow",
      "Action tracking",
      "Reporter notifications"
    ],
    color: "from-orange-500 to-red-500",
    category: "Moderation",
    href: "/admin/features/user-reports",
    votes: 89,
    views: 670,
    size: "small"
  },
  {
    id: "service-catalog",
    title: "Service Catalog Integration",
    description: "Integration with external service providers",
    icon: Zap,
    status: "planned",
    priority: "low",
    progress: 5,
    estimatedDate: "Q4 2025",
    details: [
      "API marketplace",
      "Third-party integrations",
      "Automated provisioning",
      "Usage monitoring",
      "Billing integration"
    ],
    color: "from-pink-500 to-rose-500",
    category: "Integration",
    href: "/admin/features/service-catalog",
    votes: 34,
    views: 280,
    size: "small"
  },
  {
    id: "advanced-export",
    title: "Advanced Export Tools",
    description: "Export data in various formats with scheduling",
    icon: FileText,
    status: "in_development",
    priority: "medium",
    progress: 35,
    estimatedDate: "Q3 2025",
    details: [
      "Multiple format support (CSV, JSON, XML, Excel)",
      "Custom data filters",
      "Scheduled exports",
      "Cloud backup",
      "Compression options"
    ],
    color: "from-cyan-500 to-blue-500",
    category: "Data Management",
    href: "/admin/export",
    votes: 71,
    views: 540,
    size: "small"
  }
];

const statusConfig = {
  coming_soon: {
    label: "Coming Soon",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    dotColor: "bg-yellow-400"
  },
  in_development: {
    label: "In Development",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    dotColor: "bg-blue-400"
  },
  planned: {
    label: "Planned",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    dotColor: "bg-purple-400"
  }
};

const priorityConfig = {
  high: {
    label: "High",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: Flame
  },
  medium: {
    label: "Medium",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: Target
  },
  low: {
    label: "Low",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    icon: Clock
  }
};

export default function AdvancedFeaturesHub() {
  const [selectedFeature, setSelectedFeature] = useState<UnimplementedFeature | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("bento");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [statusFilter, setStatusFilter] = useState<"all" | FeatureStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  const categories = useMemo(() => 
    ["all", ...Array.from(new Set(UNIMPLEMENTED_FEATURES.map(f => f.category)))],
    []
  );

  const filteredAndSortedFeatures = useMemo(() => {
    let features = UNIMPLEMENTED_FEATURES.filter(feature => {
      const matchesSearch = feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || feature.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || feature.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });

    features.sort((a, b) => {
      switch (sortMode) {
        case "priority":
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "progress":
          return b.progress - a.progress;
        case "popularity":
          return (b.votes || 0) - (a.votes || 0);
        case "date":
          return (a.estimatedDate || "").localeCompare(b.estimatedDate || "");
        default:
          return 0;
      }
    });

    return features;
  }, [searchQuery, statusFilter, categoryFilter, sortMode]);

  const handleVote = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Vote Recorded! 🎉",
      description: "Thank you for your support for this feature",
    });
  };

  const handleBookmark = (featureTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Bookmark Added! 📌",
      description: `${featureTitle} added to bookmarks`,
    });
  };

  const handleShare = (featureTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Link Copied! 🔗",
      description: `Link for ${featureTitle} copied to clipboard`,
    });
  };

  const BentoCard = ({ feature, className = "" }: { feature: UnimplementedFeature; className?: string }) => {
    const Icon = feature.icon;
    const status = statusConfig[feature.status];
    const priority = priorityConfig[feature.priority];
    const PriorityIcon = priority.icon;
    const size = feature.size || "medium";

    return (
      <div
        onClick={() => setSelectedFeature(feature)}
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-nxe-border",
          "bg-gradient-to-br from-nxe-card/50 via-nxe-surface/30 to-nxe-card/50",
          "hover:border-nxe-primary/50 transition-all duration-500 cursor-pointer",
          "hover:shadow-2xl hover:shadow-nxe-primary/20",
          size === "large" && "md:col-span-2 md:row-span-2",
          size === "medium" && "md:col-span-1 md:row-span-1",
          size === "small" && "md:col-span-1",
          className
        )}
        data-testid={`bento-card-${feature.id}`}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-10 blur-xl",
            feature.color
          )} />
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-nxe-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-nxe-accent/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 delay-100" />
        </div>

        <div className="relative p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
              "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300",
              feature.color
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className={cn("text-xs border backdrop-blur-sm", status.color)}>
                <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", status.dotColor)} />
                {status.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs border backdrop-blur-sm flex items-center gap-1", priority.color)}>
                <PriorityIcon className="h-3 w-3" />
                {priority.label}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className={cn(
              "font-bold text-white mb-2 group-hover:text-nxe-primary transition-colors",
              size === "large" ? "text-xl" : "text-base"
            )}>
              {feature.title}
            </h3>
            <p className={cn(
              "text-gray-400 mb-4",
              size === "large" ? "text-sm line-clamp-3" : "text-xs line-clamp-2"
            )}>
              {feature.description}
            </p>

            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Progress
                </span>
                <span className="text-white font-bold">{feature.progress}%</span>
              </div>
              <div className="relative">
                <Progress value={feature.progress} className="h-2" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </div>

            {/* Meta info for large cards */}
            {size === "large" && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {feature.details.slice(0, 4).map((detail, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                    <ChevronRight className="h-3 w-3 text-nxe-primary/50" />
                    <span className="truncate">{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-nxe-border/50">
            <div className="flex items-center gap-3">
              {feature.estimatedDate && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{feature.estimatedDate}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <ThumbsUp className="h-3 w-3" />
                <span>{formatTikTokNumber(feature.votes)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="h-3 w-3" />
                <span>{formatTikTokNumber(feature.views)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleVote(feature.id, e)}
                className="h-7 w-7 p-0"
                data-testid={`vote-${feature.id}`}
              >
                <Heart className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleBookmark(feature.title, e)}
                className="h-7 w-7 p-0"
                data-testid={`bookmark-${feature.id}`}
              >
                <Bookmark className="h-3.5 w-3.5" />
              </Button>
              {feature.href && (
                <Link href={feature.href} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="h-7 px-3 bg-nxe-primary hover:bg-nxe-primary/90"
                    data-testid={`view-${feature.id}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ status, features }: { status: FeatureStatus; features: UnimplementedFeature[] }) => {
    const config = statusConfig[status];
    
    return (
      <div className="flex-1 min-w-[280px]" data-testid={`kanban-column-${status}`}>
        <div className="sticky top-0 z-10 bg-nxe-dark/95 backdrop-blur-sm pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", config.dotColor)} />
              <h3 className="font-bold text-white">{config.label}</h3>
            </div>
            <Badge variant="outline" className={cn("text-xs", config.color)}>
              {features.length}
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {features.map((feature, idx) => (
              <div
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className={cn(
                  "bg-nxe-card border border-nxe-border rounded-xl p-4",
                  "hover:border-nxe-primary/50 transition-all duration-300 cursor-pointer",
                  "hover:shadow-lg hover:shadow-nxe-primary/10 group"
                )}
                style={{
                  animationDelay: `${idx * 50}ms`,
                  animation: "slideIn 0.3s ease-out forwards"
                }}
                data-testid={`kanban-card-${feature.id}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn(
                    "p-2.5 rounded-lg bg-gradient-to-br",
                    feature.color,
                    "group-hover:scale-110 transition-transform duration-200"
                  )}>
                    <feature.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-white group-hover:text-nxe-primary transition-colors truncate">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{feature.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-medium">{feature.progress}%</span>
                  </div>
                  <Progress value={feature.progress} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-nxe-border/50">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {feature.estimatedDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{feature.estimatedDate}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{feature.votes}</span>
                    </div>
                    {feature.href && (
                      <Link href={feature.href} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" data-testid={`kanban-view-${feature.id}`}>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const TimelineView = () => {
    const quarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
    
    return (
      <div className="space-y-8" data-testid="timeline-view">
        {quarters.map((quarter, qIdx) => {
          const quarterFeatures = filteredAndSortedFeatures.filter(f => f.estimatedDate === quarter);
          if (quarterFeatures.length === 0) return null;
          
          return (
            <div key={quarter} className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="bg-gradient-to-r from-nxe-primary to-nxe-accent text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg">
                    {quarter}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-nxe-primary to-transparent" />
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-nxe-primary via-nxe-border to-transparent" />
                <Badge variant="outline" className="bg-nxe-surface/50 backdrop-blur-sm">
                  {quarterFeatures.length} Features
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-8 border-l-2 border-nxe-border/30 pl-8">
                {quarterFeatures.map((feature, idx) => (
                  <div
                    key={feature.id}
                    style={{
                      animationDelay: `${(qIdx * 100) + (idx * 50)}ms`,
                      animation: "fadeIn 0.5s ease-out forwards"
                    }}
                  >
                    <BentoCard feature={feature} className="h-full" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const CompactView = () => (
    <div className="space-y-2" data-testid="compact-view">
      {filteredAndSortedFeatures.map((feature, idx) => {
        const Icon = feature.icon;
        const status = statusConfig[feature.status];
        
        return (
          <div
            key={feature.id}
            onClick={() => setSelectedFeature(feature)}
            className={cn(
              "bg-nxe-card border border-nxe-border rounded-lg p-3",
              "hover:border-nxe-primary/50 transition-all duration-200 cursor-pointer",
              "hover:bg-nxe-surface/50 group"
            )}
            style={{
              animationDelay: `${idx * 30}ms`,
              animation: "slideIn 0.3s ease-out forwards"
            }}
            data-testid={`compact-item-${feature.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-br flex-shrink-0",
                feature.color
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-white group-hover:text-nxe-primary transition-colors truncate">
                    {feature.title}
                  </h4>
                  <Badge variant="outline" className={cn("text-xs border flex-shrink-0", status.color)}>
                    {feature.progress}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 truncate">{feature.description}</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{feature.votes}</span>
                </div>
                {feature.href && (
                  <Link href={feature.href} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`compact-view-${feature.id}`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const CarouselView = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const feature = filteredAndSortedFeatures[currentIndex];

    if (!feature) return null;

    const Icon = feature.icon;
    const status = statusConfig[feature.status];
    const priority = priorityConfig[feature.priority];

    return (
      <div className="space-y-4" data-testid="carousel-view">
        <div className="relative bg-gradient-to-br from-nxe-card via-nxe-surface to-nxe-card border border-nxe-border rounded-2xl p-8 overflow-hidden">
          {/* Background effects */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-5",
            feature.color
          )} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-nxe-primary/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "p-6 rounded-2xl bg-gradient-to-br shadow-2xl",
                feature.color
              )}>
                <Icon className="h-10 w-10 text-white" />
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <Badge variant="outline" className={cn("border backdrop-blur-sm", status.color)}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className={cn("border backdrop-blur-sm flex items-center gap-1", priority.color)}>
                  <priority.icon className="h-3 w-3" />
                  {priority.label}
                </Badge>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-3">{feature.title}</h2>
            <p className="text-gray-400 mb-6 text-lg">{feature.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {feature.details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                  <ChevronRight className="h-4 w-4 text-nxe-primary" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Development Progress</span>
                <span className="text-white font-bold text-lg">{feature.progress}%</span>
              </div>
              <Progress value={feature.progress} className="h-3" />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-nxe-border">
              <div className="flex items-center gap-6">
                {feature.estimatedDate && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{feature.estimatedDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{formatTikTokNumber(feature.votes)} votes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Eye className="h-4 w-4" />
                  <span>{formatTikTokNumber(feature.views)} views</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => handleVote(feature.id, e)}
                  variant="outline"
                  className="gap-2"
                  data-testid={`carousel-vote-${feature.id}`}
                >
                  <Heart className="h-4 w-4" />
                  Vote
                </Button>
                {feature.href && (
                  <Link href={feature.href}>
                    <Button className="gap-2 bg-nxe-primary hover:bg-nxe-primary/90" data-testid={`carousel-view-${feature.id}`}>
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            data-testid="carousel-prev"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>

          <div className="flex items-center gap-2">
            {filteredAndSortedFeatures.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  idx === currentIndex ? "bg-nxe-primary w-8" : "bg-gray-600 hover:bg-gray-500"
                )}
                data-testid={`carousel-dot-${idx}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.min(filteredAndSortedFeatures.length - 1, currentIndex + 1))}
            disabled={currentIndex === filteredAndSortedFeatures.length - 1}
            data-testid="carousel-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center text-sm text-gray-400">
          Feature {currentIndex + 1} of {filteredAndSortedFeatures.length}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="advanced-features-hub">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-nxe-card via-nxe-surface to-nxe-card border border-nxe-border rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-nxe-primary/5 via-nxe-accent/5 to-nxe-primary/5 animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-nxe-primary to-nxe-accent rounded-2xl shadow-lg">
                <Rocket className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  Platform Features Roadmap
                  <Sparkles className="h-5 w-5 text-nxe-primary" />
                </h2>
                <p className="text-gray-400">
                  Explore features that are being and will be developed
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Search and View Mode */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-nxe-surface/50 border-nxe-border"
                  data-testid="search-features"
                />
              </div>

              <div className="flex items-center gap-2 bg-nxe-surface/50 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "bento" ? "default" : "ghost"}
                  onClick={() => setViewMode("bento")}
                  className={cn(
                    "h-9 px-3",
                    viewMode === "bento" && "bg-nxe-primary hover:bg-nxe-primary/90"
                  )}
                  data-testid="view-bento"
                >
                  <Boxes className="h-4 w-4 mr-2" />
                  Bento
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "h-9 px-3",
                    viewMode === "kanban" && "bg-nxe-primary hover:bg-nxe-primary/90"
                  )}
                  data-testid="view-kanban"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "timeline" ? "default" : "ghost"}
                  onClick={() => setViewMode("timeline")}
                  className={cn(
                    "h-9 px-3",
                    viewMode === "timeline" && "bg-nxe-primary hover:bg-nxe-primary/90"
                  )}
                  data-testid="view-timeline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "compact" ? "default" : "ghost"}
                  onClick={() => setViewMode("compact")}
                  className={cn(
                    "h-9 px-3",
                    viewMode === "compact" && "bg-nxe-primary hover:bg-nxe-primary/90"
                  )}
                  data-testid="view-compact"
                >
                  <List className="h-4 w-4 mr-2" />
                  Compact
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "carousel" ? "default" : "ghost"}
                  onClick={() => setViewMode("carousel")}
                  className={cn(
                    "h-9 px-3",
                    viewMode === "carousel" && "bg-nxe-primary hover:bg-nxe-primary/90"
                  )}
                  data-testid="view-carousel"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Carousel
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px] bg-nxe-surface/50" data-testid="filter-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_development">In Development</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-nxe-surface/50" data-testid="filter-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortMode} onValueChange={(v: SortMode) => setSortMode(v)}>
                <SelectTrigger className="w-[180px] bg-nxe-surface/50" data-testid="sort-mode">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Sort by Priority</SelectItem>
                  <SelectItem value="progress">Sort by Progress</SelectItem>
                  <SelectItem value="popularity">Sort by Popularity</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="px-3 py-1">
                {filteredAndSortedFeatures.length} Features
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {viewMode === "bento" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr" data-testid="bento-view">
            {filteredAndSortedFeatures.map(feature => (
              <BentoCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}

        {viewMode === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-view">
            <KanbanColumn 
              status="in_development" 
              features={filteredAndSortedFeatures.filter(f => f.status === "in_development")} 
            />
            <KanbanColumn 
              status="planned" 
              features={filteredAndSortedFeatures.filter(f => f.status === "planned")} 
            />
            <KanbanColumn 
              status="coming_soon" 
              features={filteredAndSortedFeatures.filter(f => f.status === "coming_soon")} 
            />
          </div>
        )}

        {viewMode === "timeline" && <TimelineView />}
        {viewMode === "compact" && <CompactView />}
        {viewMode === "carousel" && <CarouselView />}
      </div>

      {/* Feature Detail Dialog */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl bg-nxe-card border-nxe-border">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-br shadow-lg",
                    selectedFeature.color
                  )}>
                    <selectedFeature.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedFeature.title}</DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedFeature.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("border", statusConfig[selectedFeature.status].color)}>
                    {statusConfig[selectedFeature.status].label}
                  </Badge>
                  <Badge variant="outline" className={cn("border", priorityConfig[selectedFeature.priority].color)}>
                    {priorityConfig[selectedFeature.priority].label}
                  </Badge>
                  <Badge variant="outline">{selectedFeature.category}</Badge>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3">Upcoming Features:</h4>
                  <ul className="space-y-2">
                    {selectedFeature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <ChevronRight className="h-4 w-4 text-nxe-primary" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Development Progress</span>
                    <span className="text-white font-bold">{selectedFeature.progress}%</span>
                  </div>
                  <Progress value={selectedFeature.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-nxe-border">
                  <div className="flex items-center gap-4">
                    {selectedFeature.estimatedDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{selectedFeature.estimatedDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{selectedFeature.votes} votes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Eye className="h-4 w-4" />
                      <span>{selectedFeature.views} views</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={(e) => handleShare(selectedFeature.title, e)}
                      data-testid="dialog-share"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    {selectedFeature.href && (
                      <Link href={selectedFeature.href}>
                        <Button className="bg-nxe-primary hover:bg-nxe-primary/90" data-testid="dialog-view">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
