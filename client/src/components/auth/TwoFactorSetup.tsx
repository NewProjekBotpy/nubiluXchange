import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { BackupCodesDisplay } from "./BackupCodesDisplay";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SetupStep = "qr" | "verify" | "backup" | "success";

interface SetupData {
  qrCodeUrl: string;
}

interface VerifyResponse {
  success: boolean;
  backupCodes: string[];
}

export function TwoFactorSetup({ open, onOpenChange }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>("qr");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyToken, setVerifyToken] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Setup mutation - get QR code
  const setupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/2fa/setup', {
        method: 'POST',
        body: {}
      });
    },
    onSuccess: (data) => {
      setSetupData(data);
      setStep("qr");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal memulai setup 2FA",
        variant: "destructive",
      });
    }
  });

  // Verify mutation - enable 2FA (SECURITY: only sends token, not secret)
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiRequest('/api/auth/2fa/verify', {
        method: 'POST',
        body: { token }
      });
    },
    onSuccess: (data: VerifyResponse) => {
      setBackupCodes(data.backupCodes);
      setStep("backup");
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Kode Salah",
        description: error.message || "Kode verifikasi tidak valid. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  });


  const handleVerify = () => {
    if (verifyToken.length !== 6) {
      toast({
        title: "Kode Tidak Valid",
        description: "Kode harus 6 digit",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate(verifyToken);
  };

  const handleClose = () => {
    setStep("qr");
    setSetupData(null);
    setBackupCodes([]);
    setVerifyToken("");
    onOpenChange(false);
  };

  const handleBackupCodesClose = () => {
    setStep("success");
  };

  const handleSuccess = () => {
    toast({
      title: "2FA Aktif",
      description: "Two-Factor Authentication telah berhasil diaktifkan",
    });
    handleClose();
  };

  // Auto-start setup when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !setupData) {
      setupMutation.mutate();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-nxe-card border-nxe-surface max-w-md" data-testid="dialog-2fa-setup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-nxe-primary" />
            Aktifkan Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Tambahkan lapisan keamanan ekstra untuk akun Anda
          </DialogDescription>
        </DialogHeader>

        {setupMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-8" data-testid="loading-setup">
            <Loader2 className="h-8 w-8 animate-spin text-nxe-primary mb-4" />
            <p className="text-gray-400">Mempersiapkan setup 2FA...</p>
          </div>
        )}

        {step === "qr" && setupData && (
          <div className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/50" data-testid="alert-qr-instruction">
              <AlertDescription className="text-blue-400">
                Scan QR code ini menggunakan aplikasi authenticator seperti Google Authenticator atau Authy
              </AlertDescription>
            </Alert>

            <div className="flex justify-center p-4 bg-white rounded-lg" data-testid="container-qr-code">
              <img src={setupData.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>

            <Alert className="bg-amber-500/10 border-amber-500/50" data-testid="alert-qr-info">
              <AlertDescription className="text-amber-400">
                Scan kode QR ini dengan aplikasi authenticator Anda untuk melanjutkan.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
              onClick={() => setStep("verify")}
              data-testid="button-next-to-verify"
            >
              Lanjutkan ke Verifikasi
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/50" data-testid="alert-verify-instruction">
              <AlertDescription className="text-blue-400">
                Masukkan kode 6 digit dari aplikasi authenticator Anda
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-white">Kode Verifikasi (6 digit)</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="bg-nxe-surface border-nxe-surface text-white text-center text-2xl font-mono tracking-widest"
                autoFocus
                data-testid="input-2fa-token"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("qr")}
                disabled={verifyMutation.isPending}
                data-testid="button-back-to-qr"
              >
                Kembali
              </Button>
              <Button
                className="flex-1 bg-nxe-primary hover:bg-nxe-primary/80"
                onClick={handleVerify}
                disabled={verifyMutation.isPending || verifyToken.length !== 6}
                data-testid="button-verify-2fa"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Verifikasi"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/50" data-testid="alert-backup-instruction">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-400">
                <strong>Penting!</strong> Simpan kode backup ini untuk mengakses akun jika kehilangan authenticator
              </AlertDescription>
            </Alert>

            <BackupCodesDisplay codes={backupCodes} onClose={handleBackupCodesClose} />
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6" data-testid="container-success">
              <div className="p-4 bg-green-500/10 rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">2FA Berhasil Diaktifkan!</h3>
              <p className="text-gray-400 text-center">
                Akun Anda sekarang terlindungi dengan Two-Factor Authentication
              </p>
            </div>

            <Button
              className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
              onClick={handleSuccess}
              data-testid="button-finish-setup"
            >
              Selesai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
