import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorLoginProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  onSuccess: (user: any) => void;
}

export function TwoFactorLogin({ open, onOpenChange, userId, onSuccess }: TwoFactorLoginProps) {
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const { toast } = useToast();
  const { verify2FA } = useAuth();

  // TOTP verification mutation
  const verifyTOTPMutation = useMutation({
    mutationFn: async (token: string) => {
      return verify2FA(userId, token, false);
    },
    onSuccess: (user) => {
      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali!",
      });
      onSuccess(user);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Verifikasi Gagal",
        description: error.message || "Kode verifikasi tidak valid. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  });

  // Backup code verification mutation
  const verifyBackupMutation = useMutation({
    mutationFn: async (code: string) => {
      return verify2FA(userId, code, true);
    },
    onSuccess: (user) => {
      toast({
        title: "Login Berhasil",
        description: "Backup code digunakan. Harap regenerate backup codes Anda.",
      });
      onSuccess(user);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Kode Backup Tidak Valid",
        description: error.message || "Backup code tidak valid atau sudah digunakan.",
        variant: "destructive",
      });
    }
  });

  const handleVerifyTOTP = () => {
    if (token.length !== 6) {
      toast({
        title: "Kode Tidak Valid",
        description: "Kode harus 6 digit",
        variant: "destructive",
      });
      return;
    }
    verifyTOTPMutation.mutate(token);
  };

  const handleVerifyBackup = () => {
    if (backupCode.length !== 8) {
      toast({
        title: "Kode Tidak Valid",
        description: "Backup code harus 8 karakter",
        variant: "destructive",
      });
      return;
    }
    verifyBackupMutation.mutate(backupCode.trim().toUpperCase());
  };

  const handleClose = () => {
    setToken("");
    setBackupCode("");
    setMode("totp");
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter') {
      handler();
    }
  };

  const isPending = verifyTOTPMutation.isPending || verifyBackupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-nxe-card border-nxe-surface max-w-md" data-testid="dialog-2fa-login">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-nxe-primary" />
            Verifikasi Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Masukkan kode verifikasi untuk melanjutkan login
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "totp" | "backup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-nxe-surface">
            <TabsTrigger value="totp" data-testid="tab-totp">Authenticator</TabsTrigger>
            <TabsTrigger value="backup" data-testid="tab-backup-code">Backup Code</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4 mt-4">
            <Alert className="bg-blue-500/10 border-blue-500/50" data-testid="alert-totp-instruction">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-400">
                Buka aplikasi authenticator Anda dan masukkan kode 6 digit
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-white">Kode Verifikasi (6 digit)</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => handleKeyPress(e, handleVerifyTOTP)}
                placeholder="000000"
                className="bg-nxe-surface border-nxe-surface text-white text-center text-2xl font-mono tracking-widest"
                autoFocus
                disabled={isPending}
                data-testid="input-2fa-code"
              />
            </div>

            <Button
              className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
              onClick={handleVerifyTOTP}
              disabled={isPending || token.length !== 6}
              data-testid="button-submit-2fa"
            >
              {verifyTOTPMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Verifikasi"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/50" data-testid="alert-backup-instruction">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                Masukkan salah satu backup code yang Anda simpan saat setup 2FA
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-white">Backup Code (8 karakter)</Label>
              <Input
                type="text"
                maxLength={8}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyPress={(e) => handleKeyPress(e, handleVerifyBackup)}
                placeholder="XXXXXXXX"
                className="bg-nxe-surface border-nxe-surface text-white text-center text-xl font-mono tracking-widest uppercase"
                disabled={isPending}
                data-testid="input-backup-code"
              />
            </div>

            <Alert className="bg-orange-500/10 border-orange-500/50">
              <AlertDescription className="text-orange-400 text-sm">
                ⚠️ Backup code hanya bisa digunakan sekali. Setelah login, regenerate backup codes baru.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
              onClick={handleVerifyBackup}
              disabled={isPending || backupCode.length !== 8}
              data-testid="button-verify-backup"
            >
              {verifyBackupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Gunakan Backup Code"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="text-center pt-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
            className="text-gray-400 hover:text-white text-sm"
            data-testid="button-cancel-2fa"
          >
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
