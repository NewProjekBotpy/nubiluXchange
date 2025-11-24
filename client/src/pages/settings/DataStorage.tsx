import { useState } from "react";
import { ChevronRight, HardDrive, Database, Trash2, Download, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { OfflineStoragePanel } from "@/components/settings/OfflineStoragePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useConfirmation } from "@/contexts/ConfirmationContext";

export default function DataStorage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [isClearing, setIsClearing] = useState(false);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  // Estimate storage usage (in MB)
  const storageData = {
    images: 45.2,
    cache: 23.8,
    messages: 12.5,
    other: 8.3,
    total: 89.8,
    limit: 200,
  };

  const storagePercentage = (storageData.total / storageData.limit) * 100;

  const handleClearCache = async () => {
    const confirmed = await confirm({
      title: "Hapus Cache",
      description: "Apakah Anda yakin ingin menghapus cache aplikasi? Ini akan mempercepat waktu loading pertama kali.",
      confirmText: "Hapus Cache",
      cancelText: "Batal",
      variant: "destructive",
      icon: "delete"
    });

    if (confirmed) {
      setIsClearing(true);
      // Simulate clearing cache
      setTimeout(() => {
        setIsClearing(false);
        toast({
          title: "Cache berhasil dihapus",
          description: `${storageData.cache.toFixed(1)} MB ruang telah dibebaskan.`,
        });
      }, 1500);
    }
  };

  const handleExportData = () => {
    toast({
      title: "Mengekspor data",
      description: "Data Anda sedang disiapkan untuk diunduh.",
    });
    // In real app, this would prepare and download user data
  };

  const handleImportData = () => {
    toast({
      title: "Impor data",
      description: "Silakan pilih file data yang ingin diimpor.",
    });
    // In real app, this would open file picker
  };

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handleBackClick}
          className="text-nxe-text hover:text-nxe-primary transition-colors duration-200"
          data-testid="button-back"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
        <h1 className="text-xl font-semibold text-white">Data & Penyimpanan</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Storage Overview */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Penggunaan Penyimpanan</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm">{storageData.total.toFixed(1)} MB / {storageData.limit} MB</span>
                <span className="text-gray-400 text-sm">{storagePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
            </div>

            <div className="space-y-2">
              {[
                { label: 'Gambar & Media', value: storageData.images, color: 'bg-blue-500' },
                { label: 'Cache Aplikasi', value: storageData.cache, color: 'bg-purple-500' },
                { label: 'Pesan', value: storageData.messages, color: 'bg-green-500' },
                { label: 'Lainnya', value: storageData.other, color: 'bg-gray-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-gray-300 text-sm">{item.label}</span>
                  </div>
                  <span className="text-white text-sm font-medium">{item.value.toFixed(1)} MB</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Actions */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Kelola Penyimpanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleClearCache}
            disabled={isClearing}
            variant="outline"
            className="w-full justify-start border-nxe-border text-white hover:bg-nxe-surface/50"
            data-testid="button-clear-cache"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? "Menghapus..." : `Hapus Cache (${storageData.cache.toFixed(1)} MB)`}
          </Button>

          <Button
            onClick={handleExportData}
            variant="outline"
            className="w-full justify-start border-nxe-border text-white hover:bg-nxe-surface/50"
            data-testid="button-export-data"
          >
            <Download className="h-4 w-4 mr-2" />
            Ekspor Data Saya
          </Button>

          <Button
            onClick={handleImportData}
            variant="outline"
            className="w-full justify-start border-nxe-border text-white hover:bg-nxe-surface/50"
            data-testid="button-import-data"
          >
            <Upload className="h-4 w-4 mr-2" />
            Impor Data
          </Button>
        </CardContent>
      </Card>

      {/* Offline Storage Panel */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Penyimpanan Offline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <OfflineStoragePanel />
        </CardContent>
      </Card>

      {/* Info */}
      <div className="p-4 rounded-lg bg-nxe-surface/30 border border-nxe-border">
        <p className="text-gray-400 text-sm">
          <strong className="text-white">Catatan:</strong> Data yang tersimpan secara offline akan tetap tersedia meskipun Anda tidak terhubung ke internet. Hapus cache secara berkala untuk menghemat ruang penyimpanan.
        </p>
      </div>
    </div>
  );
}
