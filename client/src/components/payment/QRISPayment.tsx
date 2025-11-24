import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentStatus } from "./PaymentStatus";
import { formatIDR } from "@/lib/utils";

interface QRISPaymentProps {
  qrString: string;
  orderId: string;
  amount: number;
  expiryTime?: string;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

export function QRISPayment({ 
  qrString, 
  orderId, 
  amount, 
  expiryTime, 
  onSuccess, 
  onCancel 
}: QRISPaymentProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { toast } = useToast();

  // Calculate time remaining until expiry
  useEffect(() => {
    if (!expiryTime) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryTime).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft("00:00");
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  const handleCopyQR = async () => {
    try {
      await navigator.clipboard.writeText(qrString);
      toast({
        title: "QR Code Disalin",
        description: "QR code telah disalin ke clipboard",
      });
    } catch (error) {
      toast({
        title: "Gagal Menyalin",
        description: "Tidak dapat menyalin QR code",
        variant: "destructive",
      });
    }
  };

  // Use centralized money formatting utility
  // (formatCurrency function replaced with formatIDR from utils)

  return (
    <div className="space-y-6">
      <Card className="bg-nxe-card border-nxe-surface">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-white">Pembayaran QRIS</CardTitle>
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-nxe-primary">
              {formatIDR(amount)}
            </p>
            <p className="text-nxe-text text-sm">
              Order ID: {orderId}
            </p>
            
            {timeLeft && (
              <Badge 
                variant="outline" 
                className={`${
                  timeLeft === "00:00" ? "text-red-400 border-red-400" : "text-yellow-400 border-yellow-400"
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                {timeLeft === "00:00" ? "Expired" : `Berakhir dalam ${timeLeft}`}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-2xl">
              <QRCode
                value={qrString}
                size={200}
                level="M"
                data-testid="qr-code-display"
              />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-center space-y-3">
            <h3 className="text-white font-semibold">Cara Pembayaran:</h3>
            <div className="space-y-2 text-sm text-nxe-text">
              <p>1. Buka aplikasi mobile banking atau e-wallet Anda</p>
              <p>2. Pilih menu Scan QR atau QRIS</p>
              <p>3. Arahkan kamera ke QR code di atas</p>
              <p>4. Konfirmasi pembayaran di aplikasi Anda</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleCopyQR}
              variant="outline"
              className="flex-1 border-nxe-surface text-nxe-text hover:bg-nxe-surface"
              data-testid="button-copy-qr"
            >
              <Copy className="h-4 w-4 mr-2" />
              Salin QR Code
            </Button>
            
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600/10"
              data-testid="button-cancel-qris"
            >
              Batal
            </Button>
          </div>
          
          {/* Warning for expired payments */}
          {timeLeft === "00:00" && (
            <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 text-sm">
                QR code telah expired. Silakan buat pembayaran baru.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Payment Status Component */}
      <PaymentStatus
        orderId={orderId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}