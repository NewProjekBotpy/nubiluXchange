import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentStatusResponse {
  orderId: string;
  status: string;
  transactionStatus: string;
  paymentType: string;
  grossAmount: string;
  transactionTime?: string;
  fraudStatus?: string;
}

interface PaymentStatusProps {
  orderId: string;
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
  pollingInterval?: number;
  onRetry?: () => void;
}

// Enhanced error categorization
interface PaymentError {
  type: 'network' | 'timeout' | 'server' | 'validation' | 'payment' | 'unknown';
  message: string;
  details?: string;
  retryable: boolean;
  userFriendlyMessage: string;
}

const categorizeError = (error: any): PaymentError => {
  // Network connectivity issues
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return {
      type: 'network',
      message: error.message,
      retryable: true,
      userFriendlyMessage: 'Koneksi internet tidak stabil. Silakan periksa koneksi Anda dan coba lagi.'
    };
  }

  // Server errors (5xx)
  if (error?.status >= 500) {
    return {
      type: 'server',
      message: error.message || 'Server error',
      retryable: true,
      userFriendlyMessage: 'Terjadi gangguan server. Tim kami sedang memperbaikinya. Mohon coba lagi dalam beberapa menit.'
    };
  }

  // Client errors (4xx)
  if (error?.status >= 400 && error?.status < 500) {
    return {
      type: 'validation',
      message: error.message || 'Client error',
      retryable: false,
      userFriendlyMessage: 'Terjadi kesalahan pada data. Silakan mulai pembayaran baru.'
    };
  }

  // Timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: error.message,
      retryable: true,
      userFriendlyMessage: 'Waktu tunggu habis. Silakan coba lagi dengan koneksi yang lebih stabil.'
    };
  }

  // Payment specific errors
  if (error?.message?.includes('payment') || error?.message?.includes('transaction')) {
    return {
      type: 'payment',
      message: error.message,
      retryable: true,
      userFriendlyMessage: 'Terjadi masalah dengan pembayaran. Silakan coba lagi atau hubungi customer service.'
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: error?.message || 'Unknown error',
    retryable: true,
    userFriendlyMessage: 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.'
  };
};

export function PaymentStatus({ 
  orderId, 
  onSuccess, 
  onCancel,
  pollingInterval = 3000 
}: PaymentStatusProps) {
  const { toast } = useToast();
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [currentBackoff, setCurrentBackoff] = useState(3000); // Start with 3s
  const [categorizedError, setCategorizedError] = useState<PaymentError | null>(null);
  const maxPollCount = 100; // Stop polling after many attempts

  // Calculate exponential backoff: 3s, 6s, 12s, 24s, 30s (max)
  const calculateBackoff = useCallback((errorCount: number): number => {
    const backoffIntervals = [3000, 6000, 12000, 24000, 30000]; // ms
    const index = Math.min(errorCount, backoffIntervals.length - 1);
    return backoffIntervals[index];
  }, []);

  // Query payment status with dynamic polling interval
  const { data: statusData, error, refetch, isLoading } = useQuery({
    queryKey: ['/api/payments', orderId, 'status'],
    refetchInterval: isPolling ? currentBackoff : false,
    refetchIntervalInBackground: true,
    retry: false, // Handle retries manually with exponential backoff
    enabled: !!orderId
  });

  const paymentStatus = statusData as PaymentStatusResponse;

  // Handle errors with useEffect since onError is removed in TanStack Query v5
  useEffect(() => {
    if (error) {
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      
      if (categorized.retryable) {
        setConsecutiveErrors(prev => {
          const newCount = prev + 1;
          setCurrentBackoff(calculateBackoff(newCount));
          return newCount;
        });
        
        toast({
          title: "Kesalahan Koneksi",
          description: categorized.userFriendlyMessage,
          variant: "destructive",
        });
      } else {
        setIsPolling(false);
        toast({
          title: "Kesalahan Pembayaran",
          description: categorized.userFriendlyMessage,
          variant: "destructive",
        });
      }
    }
  }, [error, toast, calculateBackoff]);

  useEffect(() => {
    if (!paymentStatus) return;

    // Reset error count on successful response
    setConsecutiveErrors(0);
    setCurrentBackoff(3000);
    setCategorizedError(null);

    // Stop polling if payment is completed or failed
    if (['completed', 'failed', 'cancelled'].includes(paymentStatus.status)) {
      setIsPolling(false);
      
      if (paymentStatus.status === 'completed') {
        setTimeout(() => onSuccess(orderId), 1000);
      }
    }

    // Increment poll count and stop if exceeded
    setPollCount(prev => {
      const newCount = prev + 1;
      if (newCount >= maxPollCount) {
        setIsPolling(false);
      }
      return newCount;
    });
  }, [paymentStatus, orderId, onSuccess, maxPollCount]);

  const getStatusInfo = (status?: string, transactionStatus?: string) => {
    // Use transactionStatus from Midtrans if available, otherwise fallback to status
    const currentStatus = transactionStatus || status;
    
    switch (currentStatus) {
      case 'settlement':
      case 'capture':
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          text: 'Pembayaran Berhasil',
          description: 'Pembayaran telah berhasil diproses'
        };
        
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          text: 'Menunggu Pembayaran',
          description: 'Menunggu konfirmasi pembayaran'
        };
        
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failed':
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          text: 'Pembayaran Gagal',
          description: 'Pembayaran tidak dapat diproses'
        };
        
      case 'refund':
        return {
          icon: AlertTriangle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
          text: 'Pembayaran Dikembalikan',
          description: 'Pembayaran telah dikembalikan'
        };
        
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          text: 'Mengecek Status...',
          description: 'Sedang memverifikasi status pembayaran'
        };
    }
  };

  const handleManualRefresh = () => {
    refetch();
  };

  if (error && categorizedError) {
    const getErrorIcon = () => {
      switch (categorizedError.type) {
        case 'network':
          return WifiOff;
        case 'server':
          return AlertTriangle;
        case 'timeout':
          return Clock;
        default:
          return XCircle;
      }
    };

    const getErrorColor = () => {
      switch (categorizedError.type) {
        case 'network':
          return 'text-orange-400';
        case 'server':
          return 'text-yellow-400';
        case 'timeout':
          return 'text-blue-400';
        default:
          return 'text-red-400';
      }
    };

    const ErrorIcon = getErrorIcon();
    const errorColor = getErrorColor();

    return (
      <Card className="bg-nxe-card border-nxe-surface">
        <CardContent className="p-4">
          <div className={`flex items-start space-x-3 ${errorColor}`}>
            <ErrorIcon className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {categorizedError.type === 'network' ? 'Masalah Koneksi' :
                 categorizedError.type === 'server' ? 'Gangguan Server' :
                 categorizedError.type === 'timeout' ? 'Waktu Habis' :
                 'Kesalahan Pembayaran'}
              </p>
              <p className="text-sm text-nxe-text mt-1">{categorizedError.userFriendlyMessage}</p>
              
              {consecutiveErrors > 0 && categorizedError.retryable && (
                <p className="text-xs text-nxe-text mt-2">
                  Mencoba lagi dalam {currentBackoff / 1000} detik... (Percobaan ke-{consecutiveErrors})
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2 mt-4">
            {categorizedError.retryable && (
              <Button
                onClick={() => {
                  setConsecutiveErrors(0);
                  setCurrentBackoff(3000);
                  setCategorizedError(null);
                  setIsPolling(true);
                  handleManualRefresh();
                }}
                variant="outline"
                size="sm"
                className="border-nxe-surface text-nxe-text hover:bg-nxe-surface"
                data-testid="button-retry-status"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi Sekarang
              </Button>
            )}
            
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-600/10"
              data-testid="button-cancel-status"
            >
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(paymentStatus?.status, paymentStatus?.transactionStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={`bg-nxe-card border-nxe-surface ${statusInfo.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <StatusIcon className={`h-5 w-5 ${statusInfo.color} ${isPolling && !paymentStatus ? 'animate-pulse' : ''}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-medium">{statusInfo.text}</p>
              
              {isPolling && (
                <Badge variant="outline" className="text-xs">
                  <div className="w-2 h-2 bg-nxe-primary rounded-full mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            
            <p className="text-nxe-text text-sm mb-2">
              {statusInfo.description}
            </p>
            
            {paymentStatus && (
              <div className="space-y-1 text-xs text-nxe-text">
                <p>Order ID: {paymentStatus.orderId}</p>
                {paymentStatus.transactionTime && (
                  <p>Waktu: {new Date(paymentStatus.transactionTime).toLocaleString('id-ID')}</p>
                )}
                {paymentStatus.paymentType && (
                  <p>Metode: {paymentStatus.paymentType.toUpperCase()}</p>
                )}
              </div>
            )}
            
            {!isPolling && !['completed', 'failed', 'cancelled'].includes(paymentStatus?.status || '') && (
              <Button
                onClick={handleManualRefresh}
                variant="ghost"
                size="sm"
                className="mt-2 text-nxe-primary hover:bg-nxe-primary/10 p-1 h-auto"
                data-testid="button-refresh-status"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Status
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}