import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ExternalLink, CheckCircle, ArrowRight } from "lucide-react";
import { PaymentMethod } from "./MidtransPayment";
import { PaymentStatus } from "./PaymentStatus";
import { useToast } from "@/hooks/use-toast";

interface EWalletPaymentProps {
  paymentMethod: PaymentMethod;
  orderId: string;
  amount: number;
  actions: Array<{
    name: string;
    method: string;
    url: string;
  }>;
  deeplink?: string;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

export function EWalletPayment({ 
  paymentMethod, 
  orderId, 
  amount, 
  actions, 
  deeplink,
  onSuccess, 
  onCancel 
}: EWalletPaymentProps) {
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const { toast } = useToast();

  const getWalletInfo = (method: PaymentMethod) => {
    switch (method) {
      case 'gopay':
        return {
          name: 'GoPay',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-400/30',
          description: 'Akan membuka aplikasi Gojek'
        };
      case 'shopeepay':
        return {
          name: 'ShopeePay',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10', 
          borderColor: 'border-orange-400/30',
          description: 'Akan membuka aplikasi Shopee'
        };
      default:
        return {
          name: 'E-Wallet',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-400/30',
          description: 'Akan membuka aplikasi'
        };
    }
  };

  const walletInfo = getWalletInfo(paymentMethod);

  const handleOpenWallet = () => {
    try {
      // Try to open the deeplink first (mobile app)
      if (deeplink) {
        window.open(deeplink, '_blank');
        setPaymentInitiated(true);
        toast({
          title: "Membuka Aplikasi",
          description: `Mengarahkan ke aplikasi ${walletInfo.name}...`,
        });
        return;
      }

      // Fallback to web action
      const webAction = actions.find(action => 
        action.method === 'GET' || action.name.toLowerCase().includes('web')
      );

      if (webAction) {
        window.open(webAction.url, '_blank');
        setPaymentInitiated(true);
        toast({
          title: "Membuka Halaman Pembayaran",
          description: `Mengarahkan ke halaman pembayaran ${walletInfo.name}...`,
        });
      } else {
        throw new Error('No payment action available');
      }
    } catch (error) {
      toast({
        title: "Gagal Membuka Pembayaran",
        description: "Tidak dapat membuka aplikasi atau halaman pembayaran",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-nxe-card border-nxe-surface">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className={`p-2 rounded-lg ${walletInfo.bgColor} ${walletInfo.color}`}>
              <Smartphone className="h-5 w-5" />
            </div>
            <CardTitle className="text-white">Pembayaran {walletInfo.name}</CardTitle>
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-nxe-primary">
              {formatCurrency(amount)}
            </p>
            <p className="text-nxe-text text-sm">
              Order ID: {orderId}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!paymentInitiated ? (
            <>
              {/* Payment Instructions */}
              <div className="text-center space-y-4">
                <div className={`p-6 ${walletInfo.bgColor} ${walletInfo.borderColor} border rounded-xl`}>
                  <Smartphone className={`h-12 w-12 ${walletInfo.color} mx-auto mb-3`} />
                  <h3 className="text-white font-semibold mb-2">
                    Siap untuk pembayaran {walletInfo.name}
                  </h3>
                  <p className="text-nxe-text text-sm">
                    {walletInfo.description} untuk menyelesaikan pembayaran
                  </p>
                </div>
                
                <div className="space-y-3 text-sm text-nxe-text">
                  <p className="font-medium text-white">Langkah pembayaran:</p>
                  <div className="space-y-2">
                    <p>1. Klik tombol "Buka {walletInfo.name}" di bawah</p>
                    <p>2. Aplikasi {walletInfo.name} akan terbuka otomatis</p>
                    <p>3. Konfirmasi pembayaran di aplikasi</p>
                    <p>4. Tunggu konfirmasi pembayaran berhasil</p>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <Button
                onClick={handleOpenWallet}
                className={`w-full bg-nxe-primary hover:bg-nxe-primary/90 text-white font-semibold py-3`}
                data-testid={`button-open-${paymentMethod}`}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka {walletInfo.name}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              {/* Payment Initiated State */}
              <div className="text-center space-y-4">
                <div className={`p-6 ${walletInfo.bgColor} ${walletInfo.borderColor} border rounded-xl`}>
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-2">
                    Menunggu Konfirmasi
                  </h3>
                  <p className="text-nxe-text text-sm">
                    Silakan selesaikan pembayaran di aplikasi {walletInfo.name}
                  </p>
                </div>
                
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
                  Menunggu pembayaran...
                </Badge>
              </div>
              
              {/* Retry Button */}
              <Button
                onClick={handleOpenWallet}
                variant="outline"
                className="w-full border-nxe-surface text-nxe-text hover:bg-nxe-surface"
                data-testid={`button-retry-${paymentMethod}`}
              >
                Buka Ulang {walletInfo.name}
              </Button>
            </>
          )}
          
          {/* Cancel Button */}
          <Button
            onClick={onCancel}
            variant="outline"
            className="w-full border-red-600 text-red-400 hover:bg-red-600/10"
            data-testid="button-cancel-ewallet"
          >
            Batalkan Pembayaran
          </Button>
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