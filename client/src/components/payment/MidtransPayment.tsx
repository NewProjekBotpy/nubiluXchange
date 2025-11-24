import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { logError } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { QRISPayment } from "./QRISPayment";
import { EWalletPayment } from "./EWalletPayment";
import { PaymentStatus } from "./PaymentStatus";
import { AlertTriangle } from "lucide-react";

export type PaymentMethod = 'qris' | 'gopay' | 'shopeepay';

export interface PaymentData {
  productId: number;
  amount: number;
  paymentType: PaymentMethod;
}

export interface MidtransPaymentResponse {
  orderId: string;
  paymentType: string;
  transactionStatus: string;
  actions: Array<{
    name: string;
    method: string;
    url: string;
  }>;
  qrString?: string;
  expiryTime?: string;
  deeplink?: string;
}

export interface PaymentServiceStatus {
  available: boolean;
  services: {
    midtrans: boolean;
    payment_methods: string[];
  };
  message?: string;
  error?: string;
}

interface MidtransPaymentProps {
  productId: number;
  amount: number;
  onSuccess?: (orderId: string) => void;
  onCancel?: () => void;
}

export default function MidtransPayment({ 
  productId, 
  amount, 
  onSuccess, 
  onCancel 
}: MidtransPaymentProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');
  const [paymentResponse, setPaymentResponse] = useState<MidtransPaymentResponse | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { toast } = useToast();

  // Check payment service availability
  const { data: serviceStatus, isLoading: statusLoading } = useQuery<PaymentServiceStatus>({
    queryKey: ['/api/payments/status'],
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      return apiRequest('/api/payments/midtrans/charge', {
        method: 'POST',
        body: {
          productId: paymentData.productId,
          amount: paymentData.amount,
          payment_type: paymentData.paymentType
        }
      });
    },
    onSuccess: (data: MidtransPaymentResponse) => {
      setPaymentResponse(data);
      setShowPaymentForm(true);
    },
    onError: (error: any) => {
      logError('Payment creation error', error);
      
      // Provide specific error messages based on error type
      let errorTitle = "Gagal Membuat Pembayaran";
      let errorDescription = "Terjadi kesalahan saat membuat pembayaran";
      
      if (error?.message?.includes('Payment service unavailable')) {
        errorTitle = "Layanan Pembayaran Tidak Tersedia";
        errorDescription = "Layanan pembayaran sedang dalam pemeliharaan. Silakan coba lagi nanti.";
      } else if (error?.message?.includes('Product not found')) {
        errorTitle = "Produk Tidak Ditemukan";
        errorDescription = "Produk yang Anda pilih tidak tersedia.";
      } else if (error?.message?.includes('validation')) {
        errorTitle = "Data Tidak Valid";
        errorDescription = "Mohon periksa kembali data pembayaran Anda.";
      } else if (error?.message?.includes('503')) {
        errorTitle = "Layanan Tidak Tersedia";
        errorDescription = "Layanan pembayaran sementara tidak tersedia. Silakan hubungi administrator.";
      } else if (error?.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    },
  });

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleCreatePayment = () => {
    createPaymentMutation.mutate({
      productId,
      amount,
      paymentType: selectedMethod
    });
  };

  const handlePaymentSuccess = (orderId: string) => {
    toast({
      title: "Pembayaran Berhasil!",
      description: "Pembayaran Anda telah berhasil diproses.",
    });
    onSuccess?.(orderId);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setPaymentResponse(null);
    onCancel?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Show service unavailable message
  if (!statusLoading && serviceStatus && !serviceStatus.available) {
    return (
      <Card className="bg-nxe-card border-nxe-surface">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <span>Layanan Pembayaran Tidak Tersedia</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-nxe-text">
            {serviceStatus.message || 'Layanan pembayaran sedang dalam pemeliharaan. Silakan coba lagi nanti.'}
          </p>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-nxe-surface text-nxe-text hover:bg-nxe-surface"
              data-testid="button-back-service-unavailable"
            >
              Kembali
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showPaymentForm && paymentResponse) {
    return (
      <div className="space-y-6">
        {selectedMethod === 'qris' && paymentResponse.qrString && (
          <QRISPayment 
            qrString={paymentResponse.qrString}
            orderId={paymentResponse.orderId}
            amount={amount}
            expiryTime={paymentResponse.expiryTime}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
        
        {(selectedMethod === 'gopay' || selectedMethod === 'shopeepay') && (
          <EWalletPayment
            paymentMethod={selectedMethod}
            orderId={paymentResponse.orderId}
            amount={amount}
            actions={paymentResponse.actions}
            deeplink={paymentResponse.deeplink}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        )}
      </div>
    );
  }

  return (
    <Card className="bg-nxe-card border-nxe-surface">
      <CardHeader>
        <CardTitle className="text-white">Pilih Metode Pembayaran</CardTitle>
        <p className="text-nxe-text">Total: {formatCurrency(amount)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onMethodSelect={handlePaymentMethodSelect}
        />
        
        <div className="flex space-x-4">
          <Button
            onClick={handleCreatePayment}
            disabled={createPaymentMutation.isPending || statusLoading || (serviceStatus && !serviceStatus.available)}
            className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90 text-white disabled:opacity-50"
            data-testid="button-create-payment"
          >
            {createPaymentMutation.isPending ? "Memproses..." : 
             statusLoading ? "Memeriksa layanan..." :
             (serviceStatus && !serviceStatus.available) ? "Layanan tidak tersedia" : "Bayar Sekarang"}
          </Button>
          
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-nxe-surface text-nxe-text hover:bg-nxe-surface"
              data-testid="button-cancel-payment"
            >
              Batal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}