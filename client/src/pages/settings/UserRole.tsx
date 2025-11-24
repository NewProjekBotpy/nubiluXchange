import { ArrowLeft, Shield, User, Store, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function UserRole() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'user' | 'seller'>('user');
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: authResponse } = useQuery<{ user: { role: string } }>({
    queryKey: ['/api/auth/me'],
    enabled: !!user
  });

  const currentUserRole = authResponse?.user?.role;

  useEffect(() => {
    if (currentUserRole === 'user' || currentUserRole === 'seller') {
      setSelectedRole(currentUserRole as 'user' | 'seller');
    }
  }, [currentUserRole]);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const updateRoleMutation = useMutation({
    mutationFn: (role: 'user' | 'seller') => 
      apiRequest('/api/users/switch-role', {
        method: 'POST',
        body: { role },
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      toast({
        title: "Berhasil",
        description: "Peran berhasil diperbarui!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal mengubah peran",
        variant: "destructive",
      });
    }
  });

  const handleRoleUpdate = async () => {
    const roleData = roles.find(role => role.id === selectedRole);
    if (!roleData) return;

    const confirmed = await confirm({
      title: "Konfirmasi Perubahan Peran",
      description: `Apakah Anda yakin ingin mengubah peran menjadi ${roleData.title}? Perubahan ini akan mempengaruhi fitur dan akses yang tersedia untuk Anda.`,
      confirmText: "Ubah Peran",
      cancelText: "Batal",
      variant: "warning",
      icon: "shield"
    });

    if (confirmed) {
      updateRoleMutation.mutate(selectedRole);
    }
  };

  const roles = [
    {
      id: 'user',
      title: 'Pembeli',
      description: 'Beli akun gaming dari penjual terpercaya',
      icon: User,
      features: [
        'Akses ke semua produk',
        'Chat dengan penjual',
        'Sistem escrow aman',
        'Rating dan review'
      ]
    },
    {
      id: 'seller',
      title: 'Penjual',
      description: 'Jual akun gaming Anda dengan mudah',
      icon: Store,
      features: [
        'Upload produk unlimited',
        'Dashboard analytics',
        'Manajemen pesanan',
        'Komisi kompetitif'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Header */}
      <div className="sticky top-0 bg-nxe-surface border-b border-nxe-border z-10">
        <div className="flex items-center px-4 py-4">
          <button 
            onClick={() => setLocation('/settings')}
            className="p-2 hover:bg-nxe-card rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-nxe-text" />
          </button>
          <h1 className="text-lg font-semibold text-nxe-text ml-3">Peran Pengguna</h1>
        </div>
      </div>

      <div className="p-6">
        {isAdminOrOwner && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-nxe-text mb-1">Peran Tidak Dapat Diubah</h3>
              <p className="text-sm text-nxe-text-secondary">
                Sebagai {currentUserRole === 'owner' ? 'Owner' : 'Admin'}, peran Anda tidak dapat diubah untuk menjaga keamanan dan integritas sistem.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-6 h-6 text-nxe-primary" />
            <h2 className="text-xl font-bold text-nxe-text">Pilih Peran Anda</h2>
          </div>
          <p className="text-nxe-text-secondary">
            {isAdminOrOwner 
              ? 'Lihat informasi tentang peran pengguna di bawah ini.' 
              : 'Pilih peran yang sesuai dengan kebutuhan Anda. Anda dapat mengubahnya kapan saja.'
            }
          </p>
        </div>

        <div className="space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <div
                key={role.id}
                onClick={() => !isAdminOrOwner && setSelectedRole(role.id as 'user' | 'seller')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  isAdminOrOwner 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:border-nxe-primary/50'
                } ${
                  isSelected 
                    ? 'border-nxe-primary bg-nxe-primary/5' 
                    : 'border-nxe-border bg-nxe-card'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-full ${
                    isSelected ? 'bg-nxe-primary text-white' : 'bg-nxe-surface text-nxe-text-secondary'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-nxe-text mb-2">{role.title}</h3>
                    <p className="text-nxe-text-secondary mb-4">{role.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-nxe-text text-sm">Fitur:</h4>
                      <ul className="space-y-1">
                        {role.features.map((feature, index) => (
                          <li key={index} className="text-sm text-nxe-text-secondary flex items-center">
                            <div className="w-1.5 h-1.5 bg-nxe-primary rounded-full mr-3"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isAdminOrOwner && (
          <div className="mt-8">
            <button
              onClick={handleRoleUpdate}
              disabled={updateRoleMutation.isPending || currentUserRole === selectedRole}
              className="w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
              data-testid="button-save-role"
            >
              {updateRoleMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}