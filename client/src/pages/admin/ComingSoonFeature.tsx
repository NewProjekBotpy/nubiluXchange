import { useLocation, useRoute, Link } from "wouter";
import { 
  ArrowLeft, 
  Clock, 
  Star,
  Bell,
  Rocket,
  CheckCircle2,
  LucideIcon,
  MessageSquare,
  ImagePlus,
  Lock,
  Bot,
  Smartphone,
  Video,
  BarChart3,
  TrendingUp,
  Shield,
  FileText,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FeatureInfo {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  progress: number;
  estimatedDate: string;
  status: string;
  color: string;
  features: string[];
  benefits: string[];
}

const FEATURE_DATA: Record<string, FeatureInfo> = {
  "real-time-chat": {
    id: "real-time-chat",
    title: "Real-time Chat",
    description: "Sistem chat real-time dengan WebSocket yang mendukung typing indicators, status online, dan fitur chat modern lainnya.",
    icon: MessageSquare,
    progress: 65,
    estimatedDate: "Q2 2025",
    status: "In Development",
    color: "from-blue-500 to-cyan-500",
    features: [
      "WebSocket integration dengan Pusher untuk komunikasi real-time",
      "Typing indicators untuk mengetahui ketika pengguna lain sedang mengetik",
      "Online/offline status untuk melihat ketersediaan pengguna",
      "Read receipts untuk konfirmasi pesan telah dibaca",
      "Message reactions untuk interaksi cepat dengan emoji"
    ],
    benefits: [
      "Komunikasi lebih cepat dan responsif",
      "User experience yang lebih baik",
      "Meningkatkan engagement pengguna",
      "Mengurangi miscommunication"
    ]
  },
  "file-upload": {
    id: "file-upload",
    title: "File Upload System",
    description: "Sistem upload file yang powerful dengan dukungan cloud storage, kompresi otomatis, dan preview real-time.",
    icon: ImagePlus,
    progress: 45,
    estimatedDate: "Q2 2025",
    status: "In Development",
    color: "from-purple-500 to-pink-500",
    features: [
      "Multi-file upload dengan drag & drop interface",
      "Kompresi dan optimasi gambar otomatis",
      "Integrasi dengan cloud storage (Cloudinary/S3)",
      "Preview thumbnails sebelum upload",
      "Progress indicator untuk setiap file"
    ],
    benefits: [
      "Upload file lebih mudah dan cepat",
      "Hemat bandwidth dengan kompresi otomatis",
      "Storage yang reliable dengan cloud integration",
      "User experience yang intuitif"
    ]
  },
  "2fa": {
    id: "2fa",
    title: "Two-Factor Authentication",
    description: "Sistem keamanan berlapis dengan autentikasi dua faktor untuk melindungi akun pengguna.",
    icon: Lock,
    progress: 30,
    estimatedDate: "Q2 2025",
    status: "In Development",
    color: "from-red-500 to-orange-500",
    features: [
      "TOTP (Time-based OTP) support dengan authenticator apps",
      "QR code generation untuk setup mudah",
      "Backup codes untuk recovery akun",
      "SMS verification sebagai fallback option",
      "Biometric authentication untuk device modern"
    ],
    benefits: [
      "Keamanan akun yang lebih baik",
      "Perlindungan dari unauthorized access",
      "Peace of mind untuk pengguna",
      "Compliance dengan security standards"
    ]
  },
  "ai-assistant": {
    id: "ai-assistant",
    title: "AI Admin Assistant",
    description: "Asisten AI yang powerful untuk membantu tugas-tugas admin dengan natural language commands.",
    icon: Bot,
    progress: 55,
    estimatedDate: "Q3 2025",
    status: "In Development",
    color: "from-green-500 to-emerald-500",
    features: [
      "Natural language commands untuk kontrol intuitif",
      "Automated responses untuk user queries",
      "Smart data analysis dan insights",
      "Automated report generation",
      "Predictive insights untuk decision making"
    ],
    benefits: [
      "Menghemat waktu admin secara signifikan",
      "Otomasi tugas repetitif",
      "Insights yang lebih baik dari data",
      "Decision making yang lebih cepat"
    ]
  },
  "video-comments": {
    id: "video-comments",
    title: "Video Comments",
    description: "Sistem komentar khusus untuk konten video dengan threaded replies dan timestamp references.",
    icon: Video,
    progress: 10,
    estimatedDate: "Q4 2025",
    status: "Planned",
    color: "from-yellow-500 to-amber-500",
    features: [
      "Threaded comments untuk diskusi terorganisir",
      "Timestamp references untuk komentar spesifik",
      "Video reactions dengan emoji",
      "Comment moderation tools",
      "Real-time notification system"
    ],
    benefits: [
      "Engagement lebih baik pada konten video",
      "Diskusi yang lebih terstruktur",
      "Mudah mencari komentar relevan",
      "Komunitas yang lebih aktif"
    ]
  },
  "advanced-analytics": {
    id: "advanced-analytics",
    title: "Real-time Analytics",
    description: "Dashboard analytics real-time dengan custom metrics, predictive insights, dan export capabilities.",
    icon: BarChart3,
    progress: 40,
    estimatedDate: "Q3 2025",
    status: "In Development",
    color: "from-teal-500 to-cyan-500",
    features: [
      "Live data streaming untuk real-time insights",
      "Custom metrics builder untuk KPI spesifik",
      "Predictive analytics dengan machine learning",
      "Export reports dalam format PDF/Excel",
      "Scheduled reports otomatis"
    ],
    benefits: [
      "Data-driven decision making",
      "Visibility real-time terhadap performa",
      "Identifikasi trends lebih cepat",
      "Automated reporting menghemat waktu"
    ]
  },
  "seller-dashboard": {
    id: "seller-dashboard",
    title: "Seller Dashboard",
    description: "Dashboard komprehensif untuk seller dengan sales tracking, inventory management, dan customer insights.",
    icon: TrendingUp,
    progress: 15,
    estimatedDate: "Q2 2025",
    status: "Planned",
    color: "from-violet-500 to-purple-500",
    features: [
      "Sales analytics dengan visualisasi interaktif",
      "Inventory management terintegrasi",
      "Order tracking dan fulfillment",
      "Revenue reports dan forecasting",
      "Customer insights dan behavior analysis"
    ],
    benefits: [
      "Seller dapat manage bisnis dengan lebih baik",
      "Visibility lengkap terhadap operasi",
      "Optimasi inventory dan sales",
      "Better customer relationship"
    ]
  },
  "user-reports": {
    id: "user-reports",
    title: "User Reporting System",
    description: "Sistem pelaporan komprehensif dengan workflow approval dan automated ticket creation.",
    icon: FileText,
    progress: 25,
    estimatedDate: "Q3 2025",
    status: "Planned",
    color: "from-orange-500 to-red-500",
    features: [
      "Report categorization untuk tracking mudah",
      "Automated ticket creation system",
      "Admin review workflow dengan approvals",
      "Action tracking dan resolution history",
      "Reporter notifications untuk updates"
    ],
    benefits: [
      "Penanganan issues yang lebih terorganisir",
      "Transparansi dalam resolution process",
      "Meningkatkan trust pengguna",
      "Efisiensi team support"
    ]
  },
  "service-catalog": {
    id: "service-catalog",
    title: "Service Catalog Integration",
    description: "Integrasi dengan provider layanan eksternal untuk API marketplace dan automated provisioning.",
    icon: Zap,
    progress: 5,
    estimatedDate: "Q4 2025",
    status: "Planned",
    color: "from-pink-500 to-rose-500",
    features: [
      "API marketplace dengan berbagai services",
      "Third-party integrations yang seamless",
      "Automated provisioning dan setup",
      "Usage monitoring dan analytics",
      "Billing integration untuk payment"
    ],
    benefits: [
      "Ekspansi capabilities platform",
      "Integrasi mudah dengan tools favorit",
      "Automated workflows",
      "Monetization opportunities"
    ]
  }
};

export default function ComingSoonFeature() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/features/:featureId");
  const { toast } = useToast();
  
  const featureId = params?.featureId || "";
  const feature = FEATURE_DATA[featureId];

  if (!feature) {
    return (
      <div className="min-h-screen bg-nxe-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Feature Not Found</h1>
          <p className="text-gray-400 mb-4">The feature you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/admin")} className="bg-nxe-primary hover:bg-nxe-primary/90">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const Icon = feature.icon;

  const handleNotifyMe = () => {
    toast({
      title: "Notifikasi Diaktifkan! 🔔",
      description: `Anda akan diberitahu ketika ${feature.title} tersedia.`,
    });
  };

  return (
    <div className="min-h-screen bg-nxe-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-nxe-dark/95 backdrop-blur-sm border-b border-nxe-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            onClick={() => setLocation("/admin")}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Coming Soon</h1>
            <p className="text-xs text-gray-400">Feature Preview</p>
          </div>
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {feature.status}
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-nxe-card via-nxe-surface to-nxe-card border border-nxe-border rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className={cn(
              "p-6 rounded-2xl bg-gradient-to-br shadow-2xl",
              feature.color
            )}>
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{feature.title}</h1>
              <p className="text-gray-300 text-lg mb-4">{feature.description}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Estimasi: {feature.estimatedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Rocket className="h-4 w-4" />
                  <span>{feature.progress}% Complete</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-nxe-surface/50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Development Progress</span>
              <span className="text-xl font-bold text-white">{feature.progress}%</span>
            </div>
            <Progress value={feature.progress} className="h-3 mb-4" />
            <p className="text-xs text-gray-400">
              Fitur ini sedang dalam tahap {feature.status === "In Development" ? "pengembangan aktif" : "perencanaan"}. 
              Progress akan diupdate secara berkala.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleNotifyMe}
              className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-notify"
            >
              <Bell className="h-4 w-4 mr-2" />
              Beritahu Saya Ketika Tersedia
            </Button>
            <Button
              onClick={() => setLocation("/admin")}
              variant="outline"
              className="border-nxe-border"
              data-testid="button-back-to-admin"
            >
              Kembali ke Admin
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-nxe-card border border-nxe-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-nxe-primary/20 rounded-lg">
                <Star className="h-5 w-5 text-nxe-primary" />
              </div>
              <h2 className="text-xl font-bold text-white">Fitur Utama</h2>
            </div>
            <ul className="space-y-3">
              {feature.features.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-nxe-card border border-nxe-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Rocket className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Manfaat</h2>
            </div>
            <ul className="space-y-3">
              {feature.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-nxe-primary mt-2 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-nxe-primary/20 via-purple-500/20 to-nxe-accent/20 border border-nxe-primary/30 rounded-xl p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-2">Tertarik dengan fitur ini?</h3>
            <p className="text-gray-300 mb-4">
              Daftarkan email Anda untuk mendapatkan notifikasi ketika fitur ini tersedia.
            </p>
            <Button 
              onClick={handleNotifyMe}
              size="lg"
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-notify-cta"
            >
              <Bell className="h-5 w-5 mr-2" />
              Aktifkan Notifikasi
            </Button>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300 text-center">
            💡 <strong>Timeline Update:</strong> Estimasi waktu dapat berubah sesuai dengan prioritas dan kompleksitas implementasi. 
            Kami akan memberitahu Anda segera setelah fitur ini siap digunakan.
          </p>
        </div>
      </div>
    </div>
  );
}
