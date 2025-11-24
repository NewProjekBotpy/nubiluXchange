import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { BackupCodesDisplay } from "./BackupCodesDisplay";

interface RegenerateBackupCodesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateBackupCodes({ open, onOpenChange }: RegenerateBackupCodesProps) {
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const regenerateMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest('/api/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        body: { password }
      });
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      toast({
        title: "Backup Codes Berhasil Dibuat Ulang",
        description: "Kode backup lama tidak dapat digunakan lagi",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Membuat Ulang Backup Codes",
        description: error.message || "Password tidak valid. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  });

  const handleRegenerate = () => {
    if (!password || password.length < 6) {
      toast({
        title: "Password Tidak Valid",
        description: "Masukkan password yang valid (minimal 6 karakter)",
        variant: "destructive",
      });
      return;
    }
    regenerateMutation.mutate(password);
  };

  const handleClose = () => {
    setPassword("");
    setBackupCodes(null);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Always clear state when dialog closes, regardless of how it was closed
    if (!newOpen) {
      setPassword("");
      setBackupCodes(null);
    }
    onOpenChange(newOpen);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !backupCodes) {
      handleRegenerate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-nxe-card border-nxe-surface max-w-md" data-testid="dialog-regenerate-backup-codes">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <RefreshCw className="h-5 w-5 text-nxe-primary" />
            Buat Ulang Backup Codes
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {backupCodes 
              ? "Simpan backup codes baru Anda dengan aman"
              : "Konfirmasi dengan password untuk membuat backup codes baru"
            }
          </DialogDescription>
        </DialogHeader>

        {!backupCodes ? (
          <div className="space-y-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/50" data-testid="alert-regenerate-warning">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-400">
                <strong>Perhatian!</strong> Membuat backup codes baru akan membatalkan semua kode backup lama. 
                Pastikan Anda menyimpan kode baru dengan aman.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-white">Password Akun</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Masukkan password Anda"
                className="bg-nxe-surface border-nxe-surface text-white"
                autoFocus
                disabled={regenerateMutation.isPending}
                data-testid="input-password"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={regenerateMutation.isPending}
                data-testid="button-cancel"
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-nxe-primary hover:bg-nxe-primary/80"
                onClick={handleRegenerate}
                disabled={regenerateMutation.isPending || !password || password.length < 6}
                data-testid="button-confirm-regenerate"
              >
                {regenerateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Buat Ulang
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <BackupCodesDisplay codes={backupCodes} />
            
            <Button
              className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
              onClick={handleClose}
              data-testid="button-close-regenerate"
            >
              Selesai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
