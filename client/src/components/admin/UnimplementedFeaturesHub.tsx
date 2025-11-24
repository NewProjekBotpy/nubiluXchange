import { useState } from "react";
import { Link } from "wouter";
import { 
  Sparkles,
  MessageSquare,
  ImagePlus,
  CreditCard,
  Shield,
  Bot,
  BarChart3,
  Settings,
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
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type FeatureStatus = "coming_soon" | "in_development" | "planned";
type FeaturePriority = "high" | "medium" | "low";
type ViewMode = "grid" | "list" | "timeline";

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
}

const UNIMPLEMENTED_FEATURES: UnimplementedFeature[] = [
  {
    id: "real-time-chat",
    title: "Real-time Chat",
    description: "WebSocket chat dengan typing indicators dan status online",
    icon: MessageSquare,
    status: "in_development",
    priority: "high",
    progress: 95,
    estimatedDate: "Q2 2025",
    details: [
      "WebSocket integration dengan Pusher",
      "Typing indicators real-time",
      "Online/offline status",
      "Read receipts",
      "Message reactions"
    ],
    color: "from-blue-500 to-cyan-500",
    category: "Communication",
    href: "/admin/features/real-time-chat"
  },
  {
    id: "file-upload",
    title: "File Upload System",
    description: "Upload gambar produk dan media files dengan cloud storage",
    icon: ImagePlus,
    status: "in_development",
    priority: "high",
    progress: 90,
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
    href: "/admin/features/file-upload"
  },
  {
    id: "2fa",
    title: "Two-Factor Authentication",
    description: "Autentikasi dua faktor untuk keamanan ekstra",
    icon: Lock,
    status: "in_development",
    priority: "high",
    progress: 85,
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
    href: "/admin/features/2fa"
  },
  {
    id: "ai-chat",
    title: "AI Admin Assistant",
    description: "AI-powered admin chat untuk automasi tugas admin",
    icon: Bot,
    status: "in_development",
    priority: "medium",
    progress: 75,
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
    href: "/admin/features/ai-assistant"
  },
  {
    id: "phone-alerts",
    title: "SMS Alert Manager",
    description: "Sistem notifikasi SMS untuk alert penting",
    icon: Smartphone,
    status: "in_development",
    priority: "medium",
    progress: 95,
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
    href: "/admin/phone-alerts"
  },
  {
    id: "video-comments",
    title: "Video Comments",
    description: "Sistem komentar untuk konten video",
    icon: Video,
    status: "in_development",
    priority: "low",
    progress: 80,
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
    href: "/admin/features/video-comments"
  },
  {
    id: "advanced-analytics",
    title: "Real-time Analytics",
    description: "Dashboard analytics real-time dengan predictive insights",
    icon: BarChart3,
    status: "in_development",
    priority: "medium",
    progress: 70,
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
    href: "/admin/features/advanced-analytics"
  },
  {
    id: "seller-dashboard",
    title: "Seller Dashboard",
    description: "Dashboard lengkap untuk seller dengan sales tracking",
    icon: TrendingUp,
    status: "planned",
    priority: "high",
    progress: 45,
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
    href: "/admin/features/seller-dashboard"
  },
  {
    id: "fraud-detection",
    title: "Advanced Fraud Detection",
    description: "AI-powered fraud detection dengan device fingerprinting",
    icon: Shield,
    status: "in_development",
    priority: "high",
    progress: 88,
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
    href: "/admin/fraud"
  },
  {
    id: "user-reports",
    title: "User Reporting System",
    description: "Sistem pelaporan user dengan workflow approval",
    icon: FileText,
    status: "in_development",
    priority: "medium",
    progress: 65,
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
    href: "/admin/features/user-reports"
  },
  {
    id: "service-catalog",
    title: "Service Catalog Integration",
    description: "Integrasi dengan provider layanan eksternal",
    icon: Zap,
    status: "planned",
    priority: "low",
    progress: 30,
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
    href: "/admin/features/service-catalog"
  },
  {
    id: "advanced-export",
    title: "Advanced Export Tools",
    description: "Export data dalam berbagai format dengan scheduling",
    icon: FileText,
    status: "in_development",
    priority: "medium",
    progress: 85,
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
    href: "/admin/export"
  }
];

const statusConfig = {
  coming_soon: {
    label: "Coming Soon",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  },
  in_development: {
    label: "In Development",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  planned: {
    label: "Planned",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  }
};

const priorityConfig = {
  high: {
    label: "High Priority",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertCircle
  },
  medium: {
    label: "Medium",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: Star
  },
  low: {
    label: "Low Priority",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    icon: Clock
  }
};

export default function UnimplementedFeaturesHub() {
  const [selectedFeature, setSelectedFeature] = useState<UnimplementedFeature | null>(null);
  const [filter, setFilter] = useState<"all" | FeatureStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { toast } = useToast();

  const categories = ["all", ...Array.from(new Set(UNIMPLEMENTED_FEATURES.map(f => f.category)))];

  const filteredFeatures = UNIMPLEMENTED_FEATURES.filter(feature => {
    const matchesStatus = filter === "all" || feature.status === filter;
    const matchesCategory = categoryFilter === "all" || feature.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const handleNotifyMe = (featureTitle: string) => {
    toast({
      title: "Notification Enabled! 🔔",
      description: `You will be notified when ${featureTitle} is available.`,
    });
  };

  const FeatureCard = ({ feature, index }: { feature: UnimplementedFeature; index: number }) => {
    const Icon = feature.icon;
    const status = statusConfig[feature.status];
    const priority = priorityConfig[feature.priority];
    const PriorityIcon = priority.icon;

    return (
      <div
        className={cn(
          "bg-nxe-card border border-nxe-border rounded-xl p-4",
          "hover:border-nxe-primary/50 transition-all duration-300",
          "hover:shadow-lg hover:shadow-nxe-primary/10 hover:scale-[1.02]",
          "group relative overflow-hidden"
        )}
        style={{
          animationDelay: `${index * 50}ms`,
          animation: "fadeIn 0.5s ease-out forwards"
        }}
        data-testid={`feature-card-${feature.id}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300" 
          style={{ background: `linear-gradient(135deg, ${feature.color.replace('from-', '').replace(' to-', ', ')})` }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "p-3 rounded-lg bg-gradient-to-br",
              feature.color,
              "group-hover:scale-110 transition-transform duration-300 shadow-lg"
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge
                variant="outline"
                className={cn("text-xs border", status.color)}
              >
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-xs border flex items-center gap-1", priority.color)}
              >
                <PriorityIcon className="h-3 w-3" />
                {priority.label}
              </Badge>
            </div>
          </div>

          <h3 className="text-base font-semibold text-white mb-1 group-hover:text-nxe-primary transition-colors">
            {feature.title}
          </h3>
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">
            {feature.description}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-medium">{feature.progress}%</span>
            </div>
            <Progress value={feature.progress} className="h-1.5" />
            
            {feature.estimatedDate && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                <Clock className="h-3 w-3" />
                <span>Est: {feature.estimatedDate}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-nxe-border flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{feature.category}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNotifyMe(feature.title);
                }}
                className="h-7 px-2 text-xs"
                data-testid={`notify-${feature.id}`}
              >
                <Bell className="h-3 w-3 mr-1" />
                Notify
              </Button>
              {feature.href ? (
                <Link href={feature.href}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs group-hover:bg-nxe-primary group-hover:text-white"
                    data-testid={`view-${feature.id}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFeature(feature)}
                  className="h-7 px-2 text-xs"
                  data-testid={`details-${feature.id}`}
                >
                  Detail
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FeatureListItem = ({ feature }: { feature: UnimplementedFeature }) => {
    const Icon = feature.icon;
    const status = statusConfig[feature.status];
    const priority = priorityConfig[feature.priority];

    return (
      <div
        className={cn(
          "bg-nxe-card border border-nxe-border rounded-lg p-4",
          "hover:border-nxe-primary/50 transition-all duration-200",
          "hover:shadow-md hover:shadow-nxe-primary/5 group"
        )}
        data-testid={`feature-list-${feature.id}`}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br flex-shrink-0",
            feature.color,
            "group-hover:scale-105 transition-transform duration-200"
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white group-hover:text-nxe-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <Badge variant="outline" className={cn("text-xs border", status.color)}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className={cn("text-xs border", priority.color)}>
                  {priority.label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{feature.progress}%</span>
                </div>
                <Progress value={feature.progress} className="h-1.5" />
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {feature.estimatedDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{feature.estimatedDate}</span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleNotifyMe(feature.title)}
                  className="h-7 px-2"
                  data-testid={`notify-list-${feature.id}`}
                >
                  <Bell className="h-3 w-3" />
                </Button>
                {feature.href ? (
                  <Link href={feature.href}>
                    <Button
                      size="sm"
                      className="h-7 px-3 bg-nxe-primary hover:bg-nxe-primary/90"
                      data-testid={`view-list-${feature.id}`}
                    >
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedFeature(feature)}
                    className="h-7 px-3"
                    data-testid={`details-list-${feature.id}`}
                  >
                    Detail
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TimelineView = () => {
    const quarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
    
    return (
      <div className="space-y-6" data-testid="timeline-view">
        {quarters.map((quarter) => {
          const quarterFeatures = filteredFeatures.filter(f => f.estimatedDate === quarter);
          if (quarterFeatures.length === 0) return null;
          
          return (
            <div key={quarter} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-nxe-primary text-white px-4 py-2 rounded-full text-sm font-bold">
                  {quarter}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-nxe-primary to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4 border-l-2 border-nxe-border pl-4">
                {quarterFeatures.map((feature, idx) => (
                  <FeatureCard key={feature.id} feature={feature} index={idx} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="unimplemented-features-hub">
      <div className="bg-gradient-to-r from-nxe-card via-nxe-surface to-nxe-card border border-nxe-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-nxe-primary to-nxe-accent rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upcoming Features</h2>
              <p className="text-sm text-gray-400">Platform development roadmap</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-nxe-surface/50 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 w-8 p-0",
                viewMode === "grid" && "bg-nxe-primary hover:bg-nxe-primary/90"
              )}
              data-testid="view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 w-8 p-0",
                viewMode === "list" && "bg-nxe-primary hover:bg-nxe-primary/90"
              )}
              data-testid="view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "timeline" ? "default" : "ghost"}
              onClick={() => setViewMode("timeline")}
              className={cn(
                "h-8 w-8 p-0",
                viewMode === "timeline" && "bg-nxe-primary hover:bg-nxe-primary/90"
              )}
              data-testid="view-timeline"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 snap-x snap-mandatory touch-pan-x">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={cn(
              "flex-shrink-0 snap-start",
              filter === "all" && "bg-nxe-primary hover:bg-nxe-primary/90"
            )}
            data-testid="filter-all"
          >
            All ({UNIMPLEMENTED_FEATURES.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "in_development" ? "default" : "outline"}
            onClick={() => setFilter("in_development")}
            className={cn(
              "flex-shrink-0 snap-start",
              filter === "in_development" && "bg-blue-500 hover:bg-blue-600"
            )}
            data-testid="filter-in-development"
          >
            In Development ({UNIMPLEMENTED_FEATURES.filter(f => f.status === "in_development").length})
          </Button>
          <Button
            size="sm"
            variant={filter === "planned" ? "default" : "outline"}
            onClick={() => setFilter("planned")}
            className={cn(
              "flex-shrink-0 snap-start",
              filter === "planned" && "bg-purple-500 hover:bg-purple-600"
            )}
            data-testid="filter-planned"
          >
            Planned ({UNIMPLEMENTED_FEATURES.filter(f => f.status === "planned").length})
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory touch-pan-x">
          {categories.map(category => (
            <Button
              key={category}
              size="sm"
              variant={categoryFilter === category ? "secondary" : "ghost"}
              onClick={() => setCategoryFilter(category)}
              className="flex-shrink-0 snap-start text-xs"
              data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {category === "all" ? "All Categories" : category}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFeatures.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-3">
          {filteredFeatures.map((feature) => (
            <FeatureListItem key={feature.id} feature={feature} />
          ))}
        </div>
      )}

      {viewMode === "timeline" && <TimelineView />}

      {filteredFeatures.length === 0 && (
        <div className="bg-nxe-card border border-nxe-border rounded-xl p-8 text-center">
          <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No features match the filter</p>
        </div>
      )}

      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="bg-nxe-card border-nxe-border text-white max-w-lg">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "p-4 rounded-xl bg-gradient-to-br flex-shrink-0",
                    selectedFeature.color
                  )}>
                    <selectedFeature.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-bold text-white mb-2">
                      {selectedFeature.title}
                    </DialogTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", statusConfig[selectedFeature.status].color)}
                      >
                        {statusConfig[selectedFeature.status].label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", priorityConfig[selectedFeature.priority].color)}
                      >
                        {priorityConfig[selectedFeature.priority].label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedFeature.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <DialogDescription className="text-gray-300 text-base">
                    {selectedFeature.description}
                  </DialogDescription>
                </div>

                <div className="bg-nxe-surface/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Development Progress</span>
                    <span className="text-lg font-bold text-white">{selectedFeature.progress}%</span>
                  </div>
                  <Progress value={selectedFeature.progress} className="h-2" />
                  {selectedFeature.estimatedDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Estimated: {selectedFeature.estimatedDate}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Features to be Implemented:</h4>
                  <ul className="space-y-2">
                    {selectedFeature.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-nxe-primary mt-1.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    💡 This feature is currently in the {selectedFeature.status === "in_development" ? "active development" : "planning"} stage. 
                    Estimated timeline may change based on priority and implementation complexity.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleNotifyMe(selectedFeature.title)}
                    className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90"
                    data-testid={`notify-dialog-${selectedFeature.id}`}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notify Me
                  </Button>
                  {selectedFeature.href && (
                    <Link href={selectedFeature.href}>
                      <Button
                        variant="outline"
                        className="border-nxe-border"
                        data-testid={`visit-dialog-${selectedFeature.id}`}
                      >
                        Visit Page
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
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
        `
      }} />
    </div>
  );
}
