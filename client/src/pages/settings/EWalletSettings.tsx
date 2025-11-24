import { useState } from "react";
import { ChevronRight, Wallet, Plus, Link2, Unlink, Shield, RefreshCw, Eye, EyeOff, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatIDR } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { EwalletConnection } from "@shared/schema";
import { insertEwalletConnectionSchema } from "@shared/schema";

// Create form schema based on insertEwalletConnectionSchema and enhance with client-side rules
const ewalletConnectionFormSchema = insertEwalletConnectionSchema
  .pick({ provider: true, accountName: true, phoneNumber: true })
  .extend({
    phoneNumber: z.string()
      .min(1, "Nomor telepon harus diisi")
      .regex(/^(\+62|62|0)[8][1-9][0-9]{6,10}$/, "Format nomor telepon Indonesia tidak valid (contoh: +62812-3456-7890)")
      .transform(val => {
        // Normalize to canonical +62 format
        const digits = val.replace(/\D/g, '');
        if (digits.startsWith('0')) {
          return '+62' + digits.slice(1);
        } else if (digits.startsWith('62')) {
          return '+62' + digits.slice(2);
        } else if (!digits.startsWith('62')) {
          return '+62' + digits;
        }
        return '+62' + digits.slice(2);
      })
  });

type EwalletConnectionFormData = z.infer<typeof ewalletConnectionFormSchema>;

interface EWallet {
  id: string;
  name: string;
  balance: number;
  isConnected: boolean;
  phoneNumber?: string;
  email?: string;
  isVerified: boolean;
  logo: string;
}

export default function EWalletSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(false);
  const [autoTopUp, setAutoTopUp] = useState(false);
  const [minBalance] = useState(50000);
  
  // Phone number connection states
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  
  // React Hook Form setup
  const form = useForm<EwalletConnectionFormData>({
    resolver: zodResolver(ewalletConnectionFormSchema),
    defaultValues: {
      provider: "",
      accountName: "",
      phoneNumber: "",
    },
  });

  // Available e-wallet providers with their details
  const availableProviders = [
    { id: 'gopay', name: 'GoPay', logo: '🟢' },
    { id: 'ovo', name: 'OVO', logo: '🟣' },
    { id: 'dana', name: 'DANA', logo: '🔵' },
    { id: 'shopeepay', name: 'ShopeePay', logo: '🟠' }
  ];

  // Fetch user's e-wallet connections from API
  const { data: connections = [], isLoading } = useQuery<EwalletConnection[]>({
    queryKey: ["/api/wallet/connections"],
  });

  // Merge available providers with user connections
  const eWallets: EWallet[] = availableProviders.map(provider => {
    const connection = connections.find(conn => conn.provider === provider.id);
    return {
      id: provider.id,
      name: provider.name,
      logo: provider.logo,
      balance: connection ? parseFloat(connection.balance || "0") : 0,
      isConnected: !!(connection && connection.isActive),
      phoneNumber: connection?.phoneNumber || undefined,
      isVerified: connection?.isVerified || false
    };
  });

  // Connect e-wallet mutation
  const connectMutation = useMutation({
    mutationFn: async (data: EwalletConnectionFormData) => {
      return apiRequest('/api/wallet/connections', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/connections"] });
      toast({
        title: "E-Wallet terhubung",
        description: "Silakan verifikasi nomor telepon Anda untuk melanjutkan.",
      });
      // Reset form and close dialog
      form.reset();
      setSelectedProvider("");
      setShowConnectDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal menghubungkan",
        description: error.message || "Terjadi kesalahan saat menghubungkan e-wallet",
        variant: "destructive"
      });
    }
  });

  // Disconnect e-wallet mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest(`/api/wallet/connections/${connectionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/connections"] });
      toast({
        title: "E-Wallet terputus",
        description: "Koneksi e-wallet telah diputuskan.",
        variant: "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal memutus koneksi",
        description: error.message || "Terjadi kesalahan saat memutus koneksi e-wallet",
        variant: "destructive"
      });
    }
  });

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const handleConnect = (walletId: string) => {
    const provider = availableProviders.find(p => p.id === walletId);
    if (provider) {
      setSelectedProvider(walletId);
      form.reset({
        provider: walletId,
        accountName: `My ${provider.name} Account`,
        phoneNumber: "",
      });
      setShowConnectDialog(true);
    }
  };

  const handleSubmitConnection = (data: EwalletConnectionFormData) => {
    if (!selectedProvider) {
      toast({
        title: "Provider tidak dipilih",
        description: "Silakan pilih provider e-wallet terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    connectMutation.mutate(data);
  };

  const handleDisconnect = (walletId: string) => {
    const connection = connections.find(conn => conn.provider === walletId);
    if (connection) {
      disconnectMutation.mutate(connection.id);
    }
  };

  // Refresh balance mutation
  const refreshBalanceMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest(`/api/wallet/connections/${connectionId}/refresh`, {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/connections"] });
      toast({
        title: "Saldo diperbarui",
        description: `Saldo berhasil disinkronkan: ${formatIDR(data.balance)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal memperbarui saldo",
        description: error.message || "Terjadi kesalahan saat memperbarui saldo",
        variant: "destructive"
      });
    }
  });

  // Verify e-wallet mutation
  const verifyMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest(`/api/wallet/connections/${connectionId}/verify`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/connections"] });
      toast({
        title: "Verifikasi berhasil",
        description: "E-wallet Anda telah berhasil diverifikasi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal memverifikasi",
        description: error.message || "Terjadi kesalahan saat memverifikasi e-wallet",
        variant: "destructive"
      });
    }
  });

  const handleRefreshBalance = (walletId: string) => {
    const connection = connections.find(conn => conn.provider === walletId);
    if (connection) {
      refreshBalanceMutation.mutate(connection.id);
    }
  };

  const handleVerify = (walletId: string) => {
    const connection = connections.find(conn => conn.provider === walletId);
    if (connection) {
      verifyMutation.mutate(connection.id);
    }
  };

  // Use centralized money formatting utility
  // (formatCurrency function replaced with formatIDR from utils)

  const totalBalance = eWallets
    .filter(wallet => wallet.isConnected)
    .reduce((sum, wallet) => sum + wallet.balance, 0);

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
        <h1 className="text-xl font-semibold text-white">E-Wallet Settings</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Balance Overview */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6 text-nxe-primary" />
              <CardTitle className="text-white text-lg">Total Saldo E-Wallet</CardTitle>
            </div>
            <Button
              onClick={() => setShowBalance(!showBalance)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              data-testid="button-toggle-balance"
            >
              {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-nxe-primary">
              {showBalance ? formatIDR(totalBalance) : '••••••••'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Dari {eWallets.filter(w => w.isConnected).length} e-wallet terhubung
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Top-up Settings */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Pengaturan Top-up Otomatis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white font-medium">Top-up Otomatis</Label>
              <p className="text-sm text-gray-400">Top-up saat saldo di bawah minimum</p>
            </div>
            <Switch
              checked={autoTopUp}
              onCheckedChange={setAutoTopUp}
              data-testid="switch-auto-topup"
            />
          </div>
          
          {autoTopUp && (
            <div className="space-y-2">
              <Label className="text-gray-200">Saldo Minimum</Label>
              <Input
                type="number"
                value={minBalance}
                className="bg-nxe-surface border-nxe-border text-white"
                placeholder="50000"
                data-testid="input-min-balance"
              />
              <p className="text-xs text-gray-500">
                Top-up otomatis akan dilakukan saat saldo di bawah jumlah ini
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* E-Wallet Connections */}
      <Card className="bg-nxe-card border-nxe-surface/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">E-Wallet Terdaftar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eWallets.map((wallet) => (
            <div
              key={wallet.id}
              className="p-4 bg-nxe-surface rounded-lg border border-nxe-border"
              data-testid={`ewallet-${wallet.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {wallet.logo}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium">{wallet.name}</h3>
                      {wallet.isConnected && (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                          Terhubung
                        </Badge>
                      )}
                    </div>
                    {wallet.phoneNumber && (
                      <p className="text-gray-400 text-sm">{wallet.phoneNumber}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      {wallet.isConnected && (
                        <p className="text-nxe-primary font-medium text-sm">
                          {showBalance ? formatIDR(wallet.balance) : '••••••'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {wallet.isConnected && (
                  <Button
                    onClick={() => handleRefreshBalance(wallet.id)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    data-testid={`button-refresh-${wallet.id}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {wallet.isConnected ? (
                    <>
                      {!wallet.isVerified && (
                        <Button
                          onClick={() => handleVerify(wallet.id)}
                          variant="outline"
                          size="sm"
                          className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                          data-testid={`button-verify-${wallet.id}`}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Verifikasi
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(wallet.id)}
                      variant="outline"
                      size="sm"
                      className="text-nxe-primary border-nxe-primary hover:bg-nxe-primary/10"
                      data-testid={`button-connect-${wallet.id}`}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Hubungkan
                    </Button>
                  )}
                </div>
                
                {wallet.isConnected && (
                  <Button
                    onClick={() => handleDisconnect(wallet.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-600 hover:bg-red-600/10"
                    data-testid={`button-disconnect-${wallet.id}`}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-nxe-card border-nxe-surface/30 mt-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-nxe-primary mt-1" />
            <div>
              <h3 className="text-white font-medium mb-2">Keamanan E-Wallet</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Koneksi e-wallet menggunakan protokol keamanan tingkat bank. 
                Data sensitif tidak disimpan dan hanya digunakan untuk transaksi yang sah.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connect E-Wallet Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="bg-nxe-card border-nxe-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center space-x-2">
              <Link2 className="h-5 w-5 text-nxe-primary" />
              <span>Hubungkan E-Wallet</span>
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitConnection)} className="space-y-6 py-4">
              {/* Selected Provider Display */}
              {selectedProvider && (
                <div className="flex items-center space-x-3 p-3 bg-nxe-surface rounded-lg">
                  <div className="text-2xl">
                    {availableProviders.find(p => p.id === selectedProvider)?.logo}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {availableProviders.find(p => p.id === selectedProvider)?.name}
                    </h3>
                    <p className="text-gray-400 text-sm">Digital Wallet</p>
                  </div>
                </div>
              )}

              {/* Phone Number Input */}
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200 flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>Nomor Telepon</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+62 812-3456-7890"
                        className="bg-nxe-surface border-nxe-border text-white placeholder:text-gray-400"
                        data-testid="input-phone-number"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Masukkan nomor telepon yang terdaftar di e-wallet Anda
                    </p>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Account Name Input */}
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Nama Akun</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="My E-Wallet Account"
                        className="bg-nxe-surface border-nxe-border text-white placeholder:text-gray-400"
                        data-testid="input-account-name"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Nama untuk mengidentifikasi akun e-wallet ini
                    </p>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-nxe-border text-gray-300 hover:bg-nxe-surface"
                  onClick={() => setShowConnectDialog(false)}
                  data-testid="button-cancel-connection"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-nxe-primary hover:bg-nxe-primary/80"
                  disabled={connectMutation.isPending}
                  data-testid="button-submit-connection"
                >
                  {connectMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Menghubungkan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Link2 className="h-4 w-4" />
                      <span>Hubungkan</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}