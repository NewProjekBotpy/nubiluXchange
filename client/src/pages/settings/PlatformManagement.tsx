import { useState } from "react";
import { ChevronRight, Monitor, Link2, Unlink, Shield, Globe, Settings, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PlatformConnection } from "@shared/schema";

export default function PlatformManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [autoSync, setAutoSync] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  // Fetch platform connections
  const { data: platformConnections = [], isLoading } = useQuery<PlatformConnection[]>({
    queryKey: ['/api/platforms'],
  });

  // Connect platform mutation
  const connectMutation = useMutation({
    mutationFn: async (platform: { platformId: string; platformName: string; platformType: string; accountInfo: string; permissions: string[] }) => {
      return await apiRequest('/api/platforms', {
        method: 'POST',
        body: platform,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      toast({
        title: `${variables.platformName} terhubung`,
        description: `Akun ${variables.platformName} Anda berhasil ditautkan.`,
      });
    },
    onError: () => {
      toast({
        title: "Gagal menghubungkan",
        description: "Terjadi kesalahan saat menghubungkan platform.",
        variant: "destructive",
      });
    },
  });

  // Disconnect platform mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platformId: number) => {
      return await apiRequest(`/api/platforms/${platformId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      toast({
        title: "Platform diputuskan",
        description: "Koneksi dengan platform telah dihapus.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Gagal memutuskan",
        description: "Terjadi kesalahan saat memutuskan koneksi platform.",
        variant: "destructive",
      });
    },
  });

  // Sync platform mutation
  const syncMutation = useMutation({
    mutationFn: async (platformId: number) => {
      return await apiRequest(`/api/platforms/${platformId}/sync`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platforms'] });
      toast({
        title: "Sinkronisasi berhasil",
        description: "Data dari platform telah diperbarui.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal sinkronisasi",
        description: "Terjadi kesalahan saat sinkronisasi platform.",
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

  const handleConnect = (platformId: string, name: string, type: string, permissions: string[]) => {
    // In real app, this would trigger OAuth flow
    connectMutation.mutate({
      platformId,
      platformName: name,
      platformType: type,
      accountInfo: 'Akun terhubung',
      permissions,
    });
  };

  const handleDisconnect = (platformId: number) => {
    disconnectMutation.mutate(platformId);
  };

  const handleSyncNow = (platformId: number) => {
    syncMutation.mutate(platformId);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'social': return 'bg-blue-500';
      case 'gaming': return 'bg-purple-500';
      case 'payment': return 'bg-green-500';
      case 'other': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'social': return 'Sosial';
      case 'gaming': return 'Gaming';
      case 'payment': return 'Pembayaran';
      case 'other': return 'Lainnya';
      default: return 'Lainnya';
    }
  };

  const availablePlatforms = [
    { id: 'google', name: 'Google', type: 'social', icon: '🟦', permissions: ['Profile', 'Email'] },
    { id: 'facebook', name: 'Facebook', type: 'social', icon: '🟦', permissions: ['Profile', 'Friends'] },
    { id: 'steam', name: 'Steam', type: 'gaming', icon: '⚙️', permissions: ['Game Library', 'Achievements'] },
    { id: 'discord', name: 'Discord', type: 'social', icon: '🟣', permissions: ['Profile', 'Servers'] },
    { id: 'twitch', name: 'Twitch', type: 'gaming', icon: '🟣', permissions: ['Profile', 'Stream Info'] },
    { id: 'paypal', name: 'PayPal', type: 'payment', icon: '🟦', permissions: ['Payment', 'Transaction History'] },
    { id: 'github', name: 'GitHub', type: 'other', icon: '⚫', permissions: ['Profile', 'Repository Access'] },
  ];

  const connectedCount = platformConnections.filter(p => p.isActive).length;
  const totalCount = availablePlatforms.length;

  const isConnected = (platformId: string) => {
    return platformConnections.some(p => p.platformId === platformId && p.isActive);
  };

  const getConnectedPlatform = (platformId: string) => {
    return platformConnections.find(p => p.platformId === platformId && p.isActive);
  };

  if (isLoading) {
    return (
      <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-nxe-primary animate-spin" />
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
        <h1 className="text-xl font-semibold text-white">Manajemen Platform</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Connection Summary */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-nxe-primary" />
              <CardTitle className="text-white text-lg">Ringkasan Koneksi</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-nxe-primary text-white">
              {connectedCount}/{totalCount} Terhubung
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-nxe-primary">{connectedCount}</div>
              <div className="text-sm text-nxe-text">Platform Aktif</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-nxe-primary">{totalCount - connectedCount}</div>
              <div className="text-sm text-nxe-text">Tersedia</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Settings */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-nxe-primary" />
            <CardTitle className="text-white text-lg">Pengaturan Global</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-nxe-primary" />
              <div>
                <Label className="text-white text-sm font-medium">Sinkronisasi Otomatis</Label>
                <p className="text-xs text-nxe-text">Perbarui data platform secara otomatis</p>
              </div>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
              data-testid="switch-auto-sync"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-nxe-primary" />
              <div>
                <Label className="text-white text-sm font-medium">Berbagi Data Antar Platform</Label>
                <p className="text-xs text-nxe-text">Izinkan platform berbagi informasi</p>
              </div>
            </div>
            <Switch
              checked={dataSharing}
              onCheckedChange={setDataSharing}
              data-testid="switch-data-sharing"
            />
          </div>
        </CardContent>
      </Card>

      {/* Platform Connections */}
      <Card className="bg-nxe-card border-nxe-surface/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link2 className="h-5 w-5 text-nxe-primary" />
              <CardTitle className="text-white text-lg">Koneksi Platform</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-nxe-primary hover:text-nxe-primary/80"
              data-testid="button-add-platform"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {availablePlatforms.map((platform) => {
            const connected = isConnected(platform.id);
            const connectedPlatform = getConnectedPlatform(platform.id);

            return (
              <div
                key={platform.id}
                className="flex items-center justify-between p-4 rounded-lg bg-nxe-surface/30 border border-nxe-border"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{platform.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium">{platform.name}</h3>
                      <Badge 
                        variant="secondary" 
                        className={`${getTypeColor(platform.type)} text-white text-xs`}
                      >
                        {getTypeLabel(platform.type)}
                      </Badge>
                      {connected && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {connected && connectedPlatform ? (
                      <div className="text-xs text-nxe-text">
                        <div>{connectedPlatform.accountInfo}</div>
                        <div>Sinkronisasi: {connectedPlatform.lastSyncAt ? new Date(connectedPlatform.lastSyncAt).toLocaleString('id-ID') : 'Belum pernah'}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-nxe-text">
                        Akses: {platform.permissions.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {connected && connectedPlatform ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncNow(connectedPlatform.id)}
                        disabled={syncMutation.isPending}
                        className="text-nxe-primary hover:text-nxe-primary/80 text-xs"
                        data-testid={`button-sync-${platform.id}`}
                      >
                        {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(connectedPlatform.id)}
                        disabled={disconnectMutation.isPending}
                        className="text-red-500 hover:text-red-400 text-xs"
                        data-testid={`button-disconnect-${platform.id}`}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConnect(platform.id, platform.name, platform.type, platform.permissions)}
                      disabled={connectMutation.isPending}
                      className="text-nxe-primary hover:text-nxe-primary/80 text-xs"
                      data-testid={`button-connect-${platform.id}`}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Hubungkan
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <h4 className="text-amber-500 font-medium text-sm">Keamanan Platform</h4>
            <p className="text-amber-200 text-xs mt-1">
              Hanya hubungkan dengan platform yang Anda percayai. Periksa izin yang diberikan secara berkala.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
