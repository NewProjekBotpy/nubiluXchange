import { useState } from "react";
import { logError } from '@/lib/logger';
import { ChevronRight, Save, Eye, EyeOff, Shield, Phone, Mail, Key, Lock, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import type { ConfirmationOptions } from "@/contexts/ConfirmationContext";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { TwoFactorDisable } from "@/components/auth/TwoFactorDisable";
import { RegenerateBackupCodes } from "@/components/auth/RegenerateBackupCodes";

const securityUpdateSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password minimal 6 karakter").optional(),
  confirmPassword: z.string().optional(),
  phoneNumber: z.string().min(10, "Nomor telepon tidak valid").optional(),
  email: z.string().email("Format email tidak valid").optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Password baru dan konfirmasi password tidak cocok",
  path: ["confirmPassword"]
});

type SecurityUpdate = z.infer<typeof securityUpdateSchema>;

export default function SecuritySettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const { confirm } = useConfirmation();
  
  // 2FA dialog states
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [showRegenerateBackup, setShowRegenerateBackup] = useState(false);

  // Form setup with validation
  const form = useForm<SecurityUpdate>({
    resolver: zodResolver(securityUpdateSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      phoneNumber: '',
      email: user?.email || '',
    }
  });

  // Security settings mutation
  const updateSecurityMutation = useMutation({
    mutationFn: async (updates: SecurityUpdate) => {
      const payload = { ...updates };
      
      // Only remove fields that are truly empty, not required
      // Keep currentPassword if changing password
      if (!payload.newPassword) {
        delete payload.currentPassword;
      }
      if (!payload.newPassword) delete payload.newPassword;
      if (!payload.confirmPassword) delete payload.confirmPassword;
      if (!payload.phoneNumber) delete payload.phoneNumber;
      if (!payload.email || payload.email === user?.email) delete payload.email;
      
      return apiRequest('/api/users/security', {
        method: 'PUT',
        body: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Pengaturan keamanan berhasil diperbarui",
        description: "Perubahan telah disimpan dengan aman.",
      });
      
      // Reset password fields
      form.setValue('currentPassword', '');
      form.setValue('newPassword', '');
      form.setValue('confirmPassword', '');
    },
    onError: (error: any) => {
      logError('Security update error', error as Error);
      toast({
        title: "Gagal memperbarui pengaturan keamanan",
        description: error.message || "Terjadi kesalahan, silakan coba lagi.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (data: SecurityUpdate) => {
    try {
      // Check if this is a sensitive change (password or email update)
      const isPasswordChange = data.newPassword && data.currentPassword;
      const isEmailChange = data.email && data.email !== user?.email;
      
      let confirmOptions: ConfirmationOptions;

      // Use more serious confirmation for password changes
      if (isPasswordChange) {
        confirmOptions = {
          title: "Konfirmasi Perubahan Password",
          description: "Anda akan mengubah password akun. Pastikan Anda mengingat password baru untuk login selanjutnya. Lanjutkan?",
          confirmText: "Ya, Ubah Password",
          cancelText: "Batal",
          variant: "destructive",
          icon: "warning"
        };
      } else if (isEmailChange) {
        confirmOptions = {
          title: "Konfirmasi Perubahan Email",
          description: "Anda akan mengubah email akun. Email baru perlu diverifikasi setelah perubahan. Lanjutkan?",
          confirmText: "Ya, Ubah Email",
          cancelText: "Batal",
          variant: "warning",
          icon: "warning"
        };
      } else {
        confirmOptions = {
          title: "Konfirmasi Perubahan Keamanan",
          description: "Apakah Anda yakin ingin menyimpan perubahan pengaturan keamanan ini?",
          confirmText: "Ya, Simpan",
          cancelText: "Batal",
          variant: "warning",
          icon: "shield"
        };
      }

      const confirmed = await confirm(confirmOptions);

      if (confirmed) {
        updateSecurityMutation.mutate(data);
      }
    } catch (error) {
      logError('Error confirming security update', error as Error);
    }
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      setShow2FASetup(true);
    } else {
      setShow2FADisable(true);
    }
  };

  const handleVerifyPhone = () => {
    toast({
      title: "Verifikasi nomor telepon",
      description: "Kode verifikasi akan dikirim ke nomor telepon Anda.",
    });
  };

  const handleVerifyEmail = () => {
    toast({
      title: "Verifikasi email",
      description: "Link verifikasi akan dikirim ke email Anda.",
    });
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
        <h1 className="text-xl font-semibold text-white">Pengaturan Keamanan</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Account Credentials */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-nxe-primary" />
                <CardTitle className="text-white text-lg">Kredensial Akun</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </div>
                        {user?.isVerified ? (
                          <span className="text-green-500 text-xs">✓ Terverifikasi</span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleVerifyEmail}
                            className="text-nxe-primary hover:text-nxe-primary/80 p-0 h-auto text-xs"
                            data-testid="button-verify-email"
                          >
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white"
                        placeholder="Masukkan email baru"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>Nomor Telepon</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleVerifyPhone}
                          className="text-nxe-primary hover:text-nxe-primary/80 p-0 h-auto text-xs"
                          data-testid="button-verify-phone"
                        >
                          Verifikasi
                        </Button>
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white"
                        placeholder="Masukkan nomor telepon"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Password Management */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-nxe-primary" />
                <CardTitle className="text-white text-lg">Ubah Password</CardTitle>
              </div>
              <p className="text-nxe-text text-sm">
                Kosongkan jika tidak ingin mengubah password
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      Password Saat Ini
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          className="mt-2 bg-nxe-surface border-nxe-border text-white pr-10"
                          placeholder="Masukkan password saat ini"
                          data-testid="input-current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-5 text-nxe-text hover:text-white transition-colors"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      Password Baru
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white"
                        placeholder="Masukkan password baru"
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      Konfirmasi Password Baru
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white"
                        placeholder="Ulangi password baru"
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Security Features */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-nxe-primary" />
                <CardTitle className="text-white text-lg">Fitur Keamanan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-nxe-primary" />
                  <div>
                    <Label className="text-white text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-nxe-text">
                      {user?.twoFactorEnabled 
                        ? "✓ Aktif - Akun Anda terlindungi dengan 2FA" 
                        : "Keamanan tambahan dengan kode verifikasi"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={user?.twoFactorEnabled || false}
                    onCheckedChange={handle2FAToggle}
                    data-testid="switch-2fa"
                  />
                  {user?.twoFactorEnabled ? (
                    <span className="text-green-500 text-xs font-medium">Aktif</span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShow2FASetup(true)}
                      className="text-nxe-primary hover:text-nxe-primary/80 text-xs"
                      data-testid="button-setup-2fa"
                    >
                      Setup
                    </Button>
                  )}
                </div>
              </div>

              {/* Regenerate Backup Codes - Only show if 2FA is enabled */}
              {user?.twoFactorEnabled && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-nxe-primary" />
                    <div>
                      <Label className="text-white text-sm font-medium">Backup Codes</Label>
                      <p className="text-xs text-nxe-text">Buat ulang kode backup untuk keamanan tambahan</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegenerateBackup(true)}
                    className="text-nxe-primary hover:text-nxe-primary/80 hover:bg-nxe-primary/10 border-nxe-primary/30 text-xs"
                    data-testid="button-regenerate-backup-codes"
                  >
                    Buat Ulang
                  </Button>
                </div>
              )}

              {/* Login Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-nxe-primary" />
                  <div>
                    <Label className="text-white text-sm font-medium">Notifikasi Login</Label>
                    <p className="text-xs text-nxe-text">Terima notifikasi saat ada login baru</p>
                  </div>
                </div>
                <Switch
                  checked={loginNotifications}
                  onCheckedChange={setLoginNotifications}
                  data-testid="switch-login-notifications"
                />
              </div>

              {/* Security Alerts */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-nxe-surface/30">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-nxe-primary" />
                  <div>
                    <Label className="text-white text-sm font-medium">Alert Keamanan</Label>
                    <p className="text-xs text-nxe-text">Peringatan aktivitas mencurigakan</p>
                  </div>
                </div>
                <Switch
                  checked={securityAlerts}
                  onCheckedChange={setSecurityAlerts}
                  data-testid="switch-security-alerts"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={updateSecurityMutation.isPending}
              className="bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium px-8 py-2"
              data-testid="button-save-security-settings"
            >
              {updateSecurityMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup 
        open={show2FASetup} 
        onOpenChange={setShow2FASetup} 
      />

      {/* 2FA Disable Dialog */}
      <TwoFactorDisable 
        open={show2FADisable} 
        onOpenChange={setShow2FADisable} 
      />

      {/* Regenerate Backup Codes Dialog */}
      <RegenerateBackupCodes 
        open={showRegenerateBackup} 
        onOpenChange={setShowRegenerateBackup} 
      />
    </div>
  );
}