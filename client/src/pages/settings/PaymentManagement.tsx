import { useState } from "react";
import { ChevronRight, CreditCard, Plus, Trash2, Shield, Clock, CheckCircle, Wallet, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PaymentMethod } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PaymentManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMethod, setNewMethod] = useState({
    type: 'card' as 'card' | 'bank' | 'ewallet',
    name: '',
    details: '',
    expiresAt: '',
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
  });

  // Add payment method mutation
  const addMethodMutation = useMutation({
    mutationFn: async (method: typeof newMethod) => {
      return await apiRequest('/api/payment-methods', {
        method: 'POST',
        body: method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Metode pembayaran ditambahkan",
        description: "Metode pembayaran baru telah berhasil ditambahkan.",
      });
      setShowAddDialog(false);
      setNewMethod({ type: 'card', name: '', details: '', expiresAt: '' });
    },
    onError: () => {
      toast({
        title: "Gagal menambahkan",
        description: "Terjadi kesalahan saat menambahkan metode pembayaran.",
        variant: "destructive",
      });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: number) => {
      return await apiRequest(`/api/payment-methods/${methodId}/default`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Metode pembayaran utama diubah",
        description: "Metode pembayaran utama telah diperbarui.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal mengubah",
        description: "Terjadi kesalahan saat mengubah metode pembayaran utama.",
        variant: "destructive",
      });
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (methodId: number) => {
      return await apiRequest(`/api/payment-methods/${methodId}/verify`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Verifikasi berhasil",
        description: "Metode pembayaran telah diverifikasi.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal memverifikasi",
        description: "Terjadi kesalahan saat memverifikasi metode pembayaran.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (methodId: number) => {
      return await apiRequest(`/api/payment-methods/${methodId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: "Metode pembayaran dihapus",
        description: "Metode pembayaran telah berhasil dihapus.",
      });
    },
    onError: () => {
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus metode pembayaran.",
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

  const handleAddPaymentMethod = () => {
    if (!newMethod.name || !newMethod.details) {
      toast({
        title: "Data tidak lengkap",
        description: "Silakan isi semua field yang diperlukan.",
        variant: "destructive",
      });
      return;
    }
    addMethodMutation.mutate(newMethod);
  };

  const handleSetDefault = (methodId: number) => {
    setDefaultMutation.mutate(methodId);
  };

  const handleRemoveMethod = async (method: PaymentMethod) => {
    const confirmed = await confirm({
      title: "Hapus Metode Pembayaran",
      description: `Apakah Anda yakin ingin menghapus metode pembayaran ${method.name} (${method.details})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
      icon: "delete"
    });

    if (confirmed) {
      deleteMutation.mutate(method.id);
    }
  };

  const handleVerifyMethod = (methodId: number) => {
    verifyMutation.mutate(methodId);
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank':
        return <Building2 className="h-5 w-5" />;
      case 'ewallet':
        return <Wallet className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'card':
        return 'Kartu';
      case 'bank':
        return 'Bank';
      case 'ewallet':
        return 'E-Wallet';
      default:
        return 'Lainnya';
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Memuat metode pembayaran...</div>
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
        <h1 className="text-xl font-semibold text-white">Kelola Pembayaran</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Add Payment Method */}
      <Card className="bg-nxe-card border-nxe-surface/30 mb-6">
        <CardContent className="p-4">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium"
                data-testid="button-add-payment-method"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Metode Pembayaran
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-nxe-card border-nxe-surface/30 text-white">
              <DialogHeader>
                <DialogTitle>Tambah Metode Pembayaran</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Tambahkan metode pembayaran baru untuk transaksi Anda
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type" className="text-white">Tipe</Label>
                  <Select value={newMethod.type} onValueChange={(value: any) => setNewMethod({ ...newMethod, type: value })}>
                    <SelectTrigger className="bg-nxe-surface border-nxe-border text-white" id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-nxe-surface border-nxe-border text-white">
                      <SelectItem value="card">Kartu Kredit/Debit</SelectItem>
                      <SelectItem value="bank">Transfer Bank</SelectItem>
                      <SelectItem value="ewallet">E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name" className="text-white">Nama Metode</Label>
                  <Input
                    id="name"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                    placeholder="Contoh: Kartu Kredit BCA"
                    className="bg-nxe-surface border-nxe-border text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="details" className="text-white">Detail/Nomor</Label>
                  <Input
                    id="details"
                    value={newMethod.details}
                    onChange={(e) => setNewMethod({ ...newMethod, details: e.target.value })}
                    placeholder="Contoh: **** **** **** 1234"
                    className="bg-nxe-surface border-nxe-border text-white"
                  />
                </div>
                {newMethod.type === 'card' && (
                  <div>
                    <Label htmlFor="expires" className="text-white">Masa Berlaku (MM/YY)</Label>
                    <Input
                      id="expires"
                      value={newMethod.expiresAt}
                      onChange={(e) => setNewMethod({ ...newMethod, expiresAt: e.target.value })}
                      placeholder="12/25"
                      className="bg-nxe-surface border-nxe-border text-white"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="border-nxe-border text-white hover:bg-nxe-surface"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAddPaymentMethod}
                  disabled={addMethodMutation.isPending}
                  className="bg-nxe-primary hover:bg-nxe-primary/90"
                >
                  {addMethodMutation.isPending ? "Menambahkan..." : "Tambahkan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Payment Methods List */}
      <Card className="bg-nxe-card border-nxe-surface/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg">Metode Pembayaran Tersimpan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Belum ada metode pembayaran tersimpan</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="p-4 bg-nxe-surface rounded-lg border border-nxe-border"
                data-testid={`payment-method-${method.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-nxe-primary/20 rounded-lg text-nxe-primary">
                      {getMethodIcon(method.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-white font-medium">{method.name}</h3>
                        {method.isDefault && (
                          <Badge variant="secondary" className="bg-nxe-primary/20 text-nxe-primary">
                            Utama
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{method.details}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(method.type)}
                        </Badge>
                        {method.expiresAt && (
                          <Badge variant="outline" className="text-xs flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{method.expiresAt}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {method.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Button
                        onClick={() => handleVerifyMethod(method.id)}
                        variant="outline"
                        size="sm"
                        className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                        data-testid={`button-verify-${method.id}`}
                        disabled={verifyMutation.isPending}
                      >
                        Verifikasi
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        onClick={() => handleSetDefault(method.id)}
                        variant="outline"
                        size="sm"
                        className="text-nxe-primary border-nxe-primary hover:bg-nxe-primary/10"
                        data-testid={`button-set-default-${method.id}`}
                        disabled={setDefaultMutation.isPending}
                      >
                        Jadikan Utama
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={() => handleRemoveMethod(method)}
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-600 hover:bg-red-600/10"
                    data-testid={`button-remove-${method.id}`}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-nxe-card border-nxe-surface/30 mt-6">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-nxe-primary mt-1" />
            <div>
              <h3 className="text-white font-medium mb-2">Keamanan Pembayaran</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Semua metode pembayaran menggunakan enkripsi tingkat bank dan disimpan dengan aman. 
                Data kartu kredit tidak pernah disimpan di server kami.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
