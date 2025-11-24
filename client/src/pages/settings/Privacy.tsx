import { useState, useEffect } from "react";
import { ChevronRight, Shield, Eye, Lock, Users, MessageCircle, Search, X, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PrivacySettings, BlockedUser } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Privacy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showBlockedUsersDialog, setShowBlockedUsersDialog] = useState(false);
  const [unblockDialogUser, setUnblockDialogUser] = useState<{ id: number; username: string } | null>(null);
  const [localSettings, setLocalSettings] = useState({
    profileVisibility: true,
    showOnlineStatus: true,
    allowMessageFromStrangers: false,
    showPurchaseHistory: false,
    allowProductIndexing: true,
    shareActivityStatus: true,
    allowDataAnalytics: true,
    enableReadReceipts: true,
  });

  // Fetch privacy settings
  const { data: privacySettings, isLoading: isLoadingSettings } = useQuery<PrivacySettings>({
    queryKey: ['/api/privacy/settings'],
  });

  // Fetch blocked users
  const { data: blockedUsers = [], isLoading: isLoadingBlocked } = useQuery<any[]>({
    queryKey: ['/api/privacy/blocked'],
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (privacySettings) {
      setLocalSettings({
        profileVisibility: privacySettings.profileVisibility ?? true,
        showOnlineStatus: privacySettings.showOnlineStatus ?? true,
        allowMessageFromStrangers: privacySettings.allowMessageFromStrangers ?? false,
        showPurchaseHistory: privacySettings.showPurchaseHistory ?? false,
        allowProductIndexing: privacySettings.allowProductIndexing ?? true,
        shareActivityStatus: privacySettings.shareActivityStatus ?? true,
        allowDataAnalytics: privacySettings.allowDataAnalytics ?? true,
        enableReadReceipts: privacySettings.enableReadReceipts ?? true,
      });
    }
  }, [privacySettings]);

  // Save privacy settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof localSettings) => {
      return await apiRequest('/api/privacy/settings', {
        method: 'PUT',
        body: settings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/settings'] });
      toast({
        title: "Pengaturan privasi tersimpan",
        description: "Pengaturan privasi Anda telah diperbarui.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan pengaturan privasi.",
        variant: "destructive",
      });
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      return await apiRequest(`/api/privacy/blocked/${blockId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/blocked'] });
      toast({
        title: "Pengguna dibuka blokirnya",
        description: "Pengguna telah berhasil dihapus dari daftar blokir.",
      });
      setUnblockDialogUser(null);
    },
    onError: () => {
      toast({
        title: "Gagal membuka blokir",
        description: "Terjadi kesalahan saat membuka blokir pengguna.",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const handleToggleSetting = (key: keyof typeof localSettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const handleUnblock = (blockId: number, username: string) => {
    setUnblockDialogUser({ id: blockId, username });
  };

  const confirmUnblock = () => {
    if (unblockDialogUser) {
      unblockMutation.mutate(unblockDialogUser.id);
    }
  };

  const privacyOptions = [
    {
      key: 'profileVisibility' as const,
      icon: <Eye className="h-5 w-5" />,
      title: 'Profil Publik',
      description: 'Izinkan orang lain melihat profil Anda',
      category: 'profile'
    },
    {
      key: 'showOnlineStatus' as const,
      icon: <Users className="h-5 w-5" />,
      title: 'Status Online',
      description: 'Tampilkan status online kepada pengguna lain',
      category: 'profile'
    },
    {
      key: 'allowMessageFromStrangers' as const,
      icon: <MessageCircle className="h-5 w-5" />,
      title: 'Pesan dari Orang Asing',
      description: 'Izinkan pesan dari pengguna yang tidak Anda kenal',
      category: 'communication'
    },
    {
      key: 'enableReadReceipts' as const,
      icon: <MessageCircle className="h-5 w-5" />,
      title: 'Konfirmasi Baca',
      description: 'Kirim konfirmasi saat Anda membaca pesan',
      category: 'communication'
    },
    {
      key: 'showPurchaseHistory' as const,
      icon: <Search className="h-5 w-5" />,
      title: 'Riwayat Pembelian',
      description: 'Tampilkan riwayat pembelian di profil publik',
      category: 'activity'
    },
    {
      key: 'allowProductIndexing' as const,
      icon: <Search className="h-5 w-5" />,
      title: 'Indeks Produk',
      description: 'Izinkan produk Anda muncul di hasil pencarian',
      category: 'activity'
    },
    {
      key: 'shareActivityStatus' as const,
      icon: <Users className="h-5 w-5" />,
      title: 'Bagikan Aktivitas',
      description: 'Bagikan status aktivitas seperti login terakhir',
      category: 'activity'
    },
    {
      key: 'allowDataAnalytics' as const,
      icon: <Shield className="h-5 w-5" />,
      title: 'Analitik Data',
      description: 'Izinkan penggunaan data untuk analisis dan peningkatan layanan',
      category: 'data'
    },
  ];

  const groupedOptions = {
    profile: privacyOptions.filter(opt => opt.category === 'profile'),
    communication: privacyOptions.filter(opt => opt.category === 'communication'),
    activity: privacyOptions.filter(opt => opt.category === 'activity'),
    data: privacyOptions.filter(opt => opt.category === 'data'),
  };

  const categories = [
    { key: 'profile', title: 'Profil & Identitas', icon: <Users className="h-5 w-5" /> },
    { key: 'communication', title: 'Komunikasi', icon: <MessageCircle className="h-5 w-5" /> },
    { key: 'activity', title: 'Aktivitas & Konten', icon: <Search className="h-5 w-5" /> },
    { key: 'data', title: 'Data & Privasi', icon: <Shield className="h-5 w-5" /> },
  ];

  if (isLoadingSettings) {
    return (
      <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Memuat pengaturan privasi...</div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl font-semibold text-white">Privasi</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      <div className="space-y-6">
        {/* Header Info */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-nxe-primary/20 rounded-full">
                <Shield className="h-6 w-6 text-nxe-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Kontrol Privasi Anda</h2>
                <p className="text-sm text-gray-400">Kelola siapa yang dapat melihat informasi dan aktivitas Anda</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings by Category */}
        {categories.map(category => (
          <Card key={category.key} className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <div className="text-nxe-primary">{category.icon}</div>
                <span>{category.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedOptions[category.key as keyof typeof groupedOptions].map(option => (
                <div key={option.key} className="flex items-center justify-between py-2" data-testid={`privacy-option-${option.key}`}>
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-gray-400">
                      {option.icon}
                    </div>
                    <div>
                      <Label className="text-white font-medium cursor-pointer">
                        {option.title}
                      </Label>
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings[option.key]}
                    onCheckedChange={() => handleToggleSetting(option.key)}
                    data-testid={`switch-${option.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Blocked Users Section */}
        <Card className="bg-nxe-card border-nxe-surface/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center space-x-2">
              <div className="text-nxe-primary">
                <Lock className="h-5 w-5" />
              </div>
              <span>Pengguna yang Diblokir</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-2">
                {isLoadingBlocked ? "Memuat..." : blockedUsers.length === 0 ? "Belum ada pengguna yang diblokir" : `${blockedUsers.length} pengguna diblokir`}
              </p>
              <Dialog open={showBlockedUsersDialog} onOpenChange={setShowBlockedUsersDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-nxe-border text-gray-300 hover:bg-nxe-surface/50"
                    data-testid="button-manage-blocked-users"
                  >
                    Kelola Daftar Blokir
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-nxe-card border-nxe-surface/30 text-white">
                  <DialogHeader>
                    <DialogTitle>Daftar Pengguna yang Diblokir</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Kelola pengguna yang telah Anda blokir
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    {blockedUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <UserX className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Belum ada pengguna yang diblokir</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blockedUsers.map((blocked: any) => (
                          <div key={blocked.id} className="flex items-center justify-between p-3 bg-nxe-surface/30 rounded-lg" data-testid={`blocked-user-${blocked.blockedId}`}>
                            <div className="flex items-center space-x-3">
                              {blocked.profilePicture ? (
                                <img src={blocked.profilePicture} alt={blocked.username} className="h-10 w-10 rounded-full" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-nxe-primary/20 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-nxe-primary" />
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium">{blocked.displayName || blocked.username}</p>
                                <p className="text-sm text-gray-400">@{blocked.username}</p>
                                {blocked.reason && (
                                  <p className="text-xs text-gray-500 mt-1">Alasan: {blocked.reason}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblock(blocked.id, blocked.username)}
                              className="border-nxe-border text-gray-300 hover:bg-nxe-surface/50"
                              data-testid={`button-unblock-${blocked.blockedId}`}
                            >
                              Buka Blokir
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white py-3 font-semibold"
          data-testid="button-save-privacy"
        >
          {saveSettingsMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan Privasi"}
        </Button>
      </div>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={!!unblockDialogUser} onOpenChange={(open) => !open && setUnblockDialogUser(null)}>
        <AlertDialogContent className="bg-nxe-card border-nxe-surface/30 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Buka Blokir Pengguna?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Apakah Anda yakin ingin membuka blokir <span className="text-white font-medium">@{unblockDialogUser?.username}</span>? Mereka akan dapat menghubungi Anda kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-nxe-surface/50 border-nxe-border text-white hover:bg-nxe-surface">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnblock}
              disabled={unblockMutation.isPending}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
            >
              {unblockMutation.isPending ? "Memproses..." : "Buka Blokir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
