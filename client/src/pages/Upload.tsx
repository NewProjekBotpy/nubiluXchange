import { ArrowLeft, FileText, Image, PlayCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Upload() {
  const [, setLocation] = useLocation();

  const uploadOptions = [
    {
      id: "product",
      title: "Upload Akun Game",
      description: "Post akun game Anda secara gratis",
      icon: FileText,
      path: "/upload/product",
      color: "text-nxe-primary",
      bgColor: "bg-nxe-primary/10",
      testId: "button-upload-product"
    },
    {
      id: "poster",
      title: "Generate Poster AI",
      description: "Buat poster profesional dengan AI",
      icon: Image,
      path: "/upload/poster",
      color: "text-nxe-accent",
      bgColor: "bg-nxe-accent/10",
      testId: "button-upload-poster"
    },
    {
      id: "video",
      title: "Upload Video",
      description: "Bagikan gameplay Anda",
      icon: PlayCircle,
      path: "/upload/video",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      testId: "button-upload-video"
    },
    {
      id: "status",
      title: "Buat Status",
      description: "Bagikan momen Anda",
      icon: Plus,
      path: "/upload/status",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      testId: "button-upload-status"
    }
  ];

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-nxe-dark border-b border-nxe-surface px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="p-2 text-white hover:bg-gray-800" 
            data-testid="button-back"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation('/');
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-white truncate" data-testid="text-page-title">Pilih Jenis Upload</h1>
            <p className="text-sm text-gray-400 truncate" data-testid="text-page-description">Pilih apa yang ingin Anda posting</p>
          </div>
        </div>
      </div>

      {/* Upload Options Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
          {uploadOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.id}
                className="bg-nxe-surface border-nxe-surface hover:border-nxe-primary/30 transition-all cursor-pointer group"
                onClick={() => setLocation(option.path)}
                data-testid={option.testId}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`${option.bgColor} ${option.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base mb-1">{option.title}</h3>
                      <p className="text-gray-400 text-sm">{option.description}</p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-nxe-primary transition-colors rotate-180" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-nxe-surface/50 p-4 rounded-lg border border-nxe-surface">
            <h4 className="text-white font-medium mb-3">Informasi</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• Upload Akun Game: Posting akun game gratis tanpa biaya</p>
              <p>• Generate Poster AI: Buat poster dengan AI (Rp 5,000)</p>
              <p>• Upload Video: Bagikan gameplay dan konten video</p>
              <p>• Buat Status: Status akan hilang dalam 24 jam</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
