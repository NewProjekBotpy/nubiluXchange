import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react";

interface TwoFactorDisableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorDisable({ open, onOpenChange }: TwoFactorDisableProps) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      return apiRequest('/api/auth/2fa/disable', {
        method: 'POST',
        body: { password }
      });
    },
    onSuccess: () => {
      toast({
        title: "2FA Dinonaktifkan",
        description: "Two-Factor Authentication telah berhasil dinonaktifkan",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Menonaktifkan 2FA",
        description: error.message || "Password tidak valid. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  });

  const handleDisable = () => {
    if (!password || password.length < 6) {
      toast({
        title: "Password Tidak Valid",
        description: "Masukkan password yang valid (minimal 6 karakter)",
        variant: "destructive",
      });
      return;
    }
    disableMutation.mutate(password);
  };

  const handleClose = () => {
    setPassword("");
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDisable();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-nxe-card border-nxe-surface max-w-md" data-testid="dialog-2fa-disable">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldOff className="h-5 w-5 text-red-500" />
            Nonaktifkan Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Konfirmasi dengan password Anda untuk menonaktifkan 2FA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-red-500/10 border-red-500/50" data-testid="alert-disable-warning">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              <strong>Perhatian!</strong> Menonaktifkan 2FA akan mengurangi keamanan akun Anda. 
              Pastikan Anda memahami risikonya.
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
              disabled={disableMutation.isPending}
              data-testid="input-password"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={disableMutation.isPending}
              data-testid="button-cancel"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDisable}
              disabled={disableMutation.isPending || !password || password.length < 6}
              data-testid="button-confirm-disable"
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menonaktifkan...
                </>
              ) : (
                "Nonaktifkan 2FA"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
