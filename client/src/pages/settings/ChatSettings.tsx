import { useState } from "react";
import { ChevronRight, MessageCircle, Image, Download, Lock, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ChatSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chatSettings, setChatSettings] = useState({
    theme: "dark",
    wallpaper: "default",
    fontSize: "medium",
    autoDownloadImages: true,
    autoDownloadVideos: false,
    encryptMessages: true,
    showTypingIndicator: true,
    readReceipts: true,
    lastSeenEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    backupChats: true
  });

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const handleToggleSetting = (key: keyof typeof chatSettings, value?: string | boolean) => {
    setChatSettings(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key as keyof typeof chatSettings]
    }));
  };

  const handleSaveSettings = () => {
    toast({
      title: "Pengaturan chat tersimpan",
      description: "Pengaturan chat Anda telah diperbarui.",
    });
  };

  const handleBackupChats = () => {
    toast({
      title: "Backup chat dimulai",
      description: "Riwayat chat Anda sedang dibackup ke cloud.",
    });
  };

  const handleClearChatHistory = () => {
    toast({
      title: "Konfirmasi diperlukan",
      description: "Fitur ini memerlukan konfirmasi tambahan untuk keamanan.",
      variant: "destructive"
    });
  };

  const themes = [
    { value: "dark", label: "Gelap" },
    { value: "light", label: "Terang" },
    { value: "auto", label: "Otomatis" }
  ];

  const wallpapers = [
    { value: "default", label: "Default" },
    { value: "gradient", label: "Gradient" },
    { value: "pattern", label: "Pattern" },
    { value: "custom", label: "Kustom" }
  ];

  const fontSizes = [
    { value: "small", label: "Kecil" },
    { value: "medium", label: "Sedang" },
    { value: "large", label: "Besar" }
  ];

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
        <h1 className="text-xl font-semibold text-white">Pengaturan Chat</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Appearance Settings */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <Palette className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Tampilan</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-200">Tema Chat</Label>
            <Select value={chatSettings.theme} onValueChange={(value) => handleToggleSetting("theme", value)}>
              <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themes.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Wallpaper</Label>
            <Select value={chatSettings.wallpaper} onValueChange={(value) => handleToggleSetting("wallpaper", value)}>
              <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wallpapers.map((wallpaper) => (
                  <SelectItem key={wallpaper.value} value={wallpaper.value}>
                    {wallpaper.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Ukuran Font</Label>
            <Select value={chatSettings.fontSize} onValueChange={(value) => handleToggleSetting("fontSize", value)}>
              <SelectTrigger className="bg-nxe-surface border-nxe-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Media Settings */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <Image className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Media</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Download Gambar Otomatis</Label>
              <p className="text-sm text-gray-400">Gambar akan otomatis diunduh</p>
            </div>
            <Switch
              checked={chatSettings.autoDownloadImages}
              onCheckedChange={() => handleToggleSetting("autoDownloadImages")}
              data-testid="switch-auto-download-images"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Download Video Otomatis</Label>
              <p className="text-sm text-gray-400">Video akan otomatis diunduh</p>
            </div>
            <Switch
              checked={chatSettings.autoDownloadVideos}
              onCheckedChange={() => handleToggleSetting("autoDownloadVideos")}
              data-testid="switch-auto-download-videos"
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <Lock className="h-6 w-6 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Privasi & Keamanan</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Enkripsi End-to-End</Label>
              <p className="text-sm text-gray-400">Pesan terenkripsi secara aman</p>
            </div>
            <Switch
              checked={chatSettings.encryptMessages}
              onCheckedChange={() => handleToggleSetting("encryptMessages")}
              data-testid="switch-encrypt-messages"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Indikator Mengetik</Label>
              <p className="text-sm text-gray-400">Tampilkan saat Anda mengetik</p>
            </div>
            <Switch
              checked={chatSettings.showTypingIndicator}
              onCheckedChange={() => handleToggleSetting("showTypingIndicator")}
              data-testid="switch-typing-indicator"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Konfirmasi Dibaca</Label>
              <p className="text-sm text-gray-400">Centang biru saat pesan dibaca</p>
            </div>
            <Switch
              checked={chatSettings.readReceipts}
              onCheckedChange={() => handleToggleSetting("readReceipts")}
              data-testid="switch-read-receipts"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Terakhir Dilihat</Label>
              <p className="text-sm text-gray-400">Tampilkan kapan terakhir online</p>
            </div>
            <Switch
              checked={chatSettings.lastSeenEnabled}
              onCheckedChange={() => handleToggleSetting("lastSeenEnabled")}
              data-testid="switch-last-seen"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chat Management */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Kelola Chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-white font-medium">Backup Otomatis</Label>
              <p className="text-sm text-gray-400">Backup chat ke cloud secara rutin</p>
            </div>
            <Switch
              checked={chatSettings.backupChats}
              onCheckedChange={() => handleToggleSetting("backupChats")}
              data-testid="switch-backup-chats"
            />
          </div>

          <Button
            onClick={handleBackupChats}
            variant="outline"
            className="w-full justify-start bg-nxe-surface border-nxe-border text-white hover:bg-nxe-surface/80"
            data-testid="button-backup-now"
          >
            <Download className="h-4 w-4 mr-3" />
            Backup Chat Sekarang
          </Button>

          <Button
            onClick={handleClearChatHistory}
            variant="outline"
            className="w-full justify-start border-red-600 text-red-400 hover:bg-red-600/10"
            data-testid="button-clear-history"
          >
            <MessageCircle className="h-4 w-4 mr-3" />
            Hapus Semua Riwayat Chat
          </Button>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSaveSettings}
          className="bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium px-8 py-2"
          data-testid="button-save-settings"
        >
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}