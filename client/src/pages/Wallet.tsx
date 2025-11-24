import { useState } from "react";
import { logWarning } from '@/lib/logger';
import { Wallet as WalletIcon, Plus, Minus, CreditCard, History, QrCode, Send, ShoppingBag, Gamepad2, Gift, Star, ArrowUpDown, Download, Smartphone, Zap, X, Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { WalletTopup } from "@/components/payment/WalletTopup";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import FinancialDashboard from "@/components/financial/FinancialDashboard";

// TypeScript interfaces for API responses
interface WalletApiResponse {
  message: string;
  balance: string;
}

interface WalletApiError {
  error: string;
}

interface WalletTransaction {
  id: number;
  userId: number;
  type: string; // topup, withdrawal, payment, commission
  amount: string; // decimal as string
  status: string; // pending, completed, failed
  description: string | null;
  metadata: Record<string, any>;
  createdAt: string; // ISO timestamp
}

export default function Wallet() {
  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showMidtransTopup, setShowMidtransTopup] = useState(false);
  
  // Send money states
  const [sendAmount, setSendAmount] = useState("");
  const [receiverUsername, setReceiverUsername] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  
  // Request money states
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestFromUsername, setRequestFromUsername] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  
  const { toast } = useToast();
  const { confirm } = useConfirmation();

  const { data: walletData, isLoading: isBalanceLoading, error: balanceError } = useQuery({
    queryKey: ["/api/wallet/balance"],
  });

  // Fetch real transaction data from API
  const { data: transactionsData, isLoading: isTransactionsLoading, error: transactionsError } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  const transactions = transactionsData || [];

  const balance = (walletData as any)?.balance || "0";

  // Mutation for depositing money
  const depositMutation = useMutation({
    mutationFn: async (amount: number): Promise<WalletApiResponse> => {
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount provided');
      }
      return apiRequest('/api/wallet/deposit', {
        method: 'POST',
        body: { amount: amount }
      });
    },
    onSuccess: (data: WalletApiResponse) => {
      // Use proper guards for response data
      const newBalance = data?.balance;
      if (!newBalance && newBalance !== '0') {
        logWarning('No balance returned from deposit API');
      }
      
      toast({
        title: "Top-up Berhasil!",
        description: newBalance ? `Saldo berhasil ditambahkan. Saldo baru: ${formatCurrency(newBalance)}` : "Saldo berhasil ditambahkan",
      });
      
      // Invalidate cache to refetch latest balance and transactions
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      setTopupAmount("");
      setShowTopupDialog(false);
    },
    onError: (error: any) => {
      // Improved error handling to detect Response objects and parse JSON error payloads
      let errorMessage = "Terjadi kesalahan saat melakukan top-up";
      
      // Handle Response objects
      if (error instanceof Response) {
        error.json().then((errorData: WalletApiError) => {
          toast({
            title: "Top-up Gagal",
            description: errorData?.error || errorMessage,
            variant: "destructive",
          });
        }).catch(() => {
          toast({
            title: "Top-up Gagal",
            description: errorMessage,
            variant: "destructive",
          });
        });
        return;
      }
      
      // Handle other error types
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Top-up Gagal",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation for withdrawing money
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number): Promise<WalletApiResponse> => {
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount provided');
      }
      return apiRequest('/api/wallet/withdraw', {
        method: 'POST',
        body: { amount: amount }
      });
    },
    onSuccess: (data: WalletApiResponse) => {
      // Use proper guards for response data
      const newBalance = data?.balance;
      if (!newBalance && newBalance !== '0') {
        logWarning('No balance returned from withdrawal API');
      }
      
      toast({
        title: "Penarikan Berhasil!",
        description: newBalance ? `Saldo berhasil ditarik. Saldo baru: ${formatCurrency(newBalance)}` : "Saldo berhasil ditarik",
      });
      
      // Invalidate cache to refetch latest balance and transactions
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      setWithdrawAmount("");
      setShowWithdrawDialog(false);
    },
    onError: (error: any) => {
      // Improved error handling to detect Response objects and parse JSON error payloads
      let errorMessage = "Terjadi kesalahan saat melakukan penarikan";
      
      // Handle Response objects
      if (error instanceof Response) {
        error.json().then((errorData: WalletApiError) => {
          toast({
            title: "Penarikan Gagal",
            description: errorData?.error || errorMessage,
            variant: "destructive",
          });
        }).catch(() => {
          toast({
            title: "Penarikan Gagal",
            description: errorMessage,
            variant: "destructive",
          });
        });
        return;
      }
      
      // Handle other error types
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Penarikan Gagal",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation for sending money
  const sendMoneyMutation = useMutation({
    mutationFn: async ({ receiverUsername, amount, message }: { receiverUsername: string; amount: number; message?: string }): Promise<WalletApiResponse> => {
      return apiRequest('/api/wallet/send', {
        method: 'POST',
        body: { receiverUsername, amount, message }
      });
    },
    onSuccess: (data: WalletApiResponse) => {
      const newBalance = data?.balance;
      toast({
        title: "Uang Berhasil Dikirim!",
        description: `Berhasil mengirim ${formatCurrency(sendAmount)} ke ${receiverUsername}`,
      });
      
      // Invalidate cache to refetch latest balance and transactions
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      
      // Reset form
      setSendAmount("");
      setReceiverUsername("");
      setSendMessage("");
      setShowSendDialog(false);
    },
    onError: (error: any) => {
      let errorMessage = "Terjadi kesalahan saat mengirim uang";
      
      if (error instanceof Response) {
        error.json().then((errorData: WalletApiError) => {
          toast({
            title: "Gagal Mengirim Uang",
            description: errorData?.error || errorMessage,
            variant: "destructive",
          });
        }).catch(() => {
          toast({
            title: "Gagal Mengirim Uang",
            description: errorMessage,
            variant: "destructive",
          });
        });
        return;
      }
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Gagal Mengirim Uang",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation for requesting money
  const requestMoneyMutation = useMutation({
    mutationFn: async ({ receiverUsername, amount, message }: { receiverUsername: string; amount: number; message?: string }): Promise<WalletApiResponse> => {
      return apiRequest('/api/wallet/request', {
        method: 'POST',
        body: { receiverUsername, amount, message }
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Permintaan Uang Berhasil Dikirim!",
        description: `Permintaan sebesar ${formatCurrency(requestAmount)} telah dikirim ke ${requestFromUsername}`,
      });
      
      // Reset form
      setRequestAmount("");
      setRequestFromUsername("");
      setRequestMessage("");
      setShowRequestDialog(false);
    },
    onError: (error: any) => {
      let errorMessage = "Terjadi kesalahan saat mengirim permintaan uang";
      
      if (error instanceof Response) {
        error.json().then((errorData: WalletApiError) => {
          toast({
            title: "Gagal Mengirim Permintaan",
            description: errorData?.error || errorMessage,
            variant: "destructive",
          });
        }).catch(() => {
          toast({
            title: "Gagal Mengirim Permintaan",
            description: errorMessage,
            variant: "destructive",
          });
        });
        return;
      }
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Gagal Mengirim Permintaan",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert to number and add proper validation with NaN guards
    const amount = Number(topupAmount);
    
    if (!topupAmount || isNaN(amount) || amount < 10000) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimum top-up adalah Rp 10,000",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog before top-up
    const confirmed = await confirm({
      title: "Konfirmasi Top-up Wallet",
      description: `Apakah Anda yakin ingin melakukan top-up sebesar ${formatCurrency(amount)} ke wallet Anda? Pastikan jumlah yang dimasukkan sudah benar.`,
      confirmText: "Top-up Sekarang",
      cancelText: "Batal",
      variant: "warning",
      icon: "warning"
    });

    if (confirmed) {
      // Call the deposit mutation with number
      depositMutation.mutate(amount);
    }
  };

  const handleQuickTopup = async () => {
    const confirmed = await confirm({
      title: "Konfirmasi Top-up Cepat",
      description: "Apakah Anda yakin ingin melanjutkan ke sistem pembayaran untuk melakukan top-up wallet? Anda akan diarahkan ke halaman pembayaran Midtrans.",
      confirmText: "Lanjutkan",
      cancelText: "Batal",
      variant: "warning",
      icon: "warning"
    });

    if (confirmed) {
      setShowMidtransTopup(true);
    }
  };

  const handleMidtransTopupSuccess = (orderId: string) => {
    toast({
      title: "Top-up Diproses!",
      description: `Pembayaran dengan Order ID ${orderId} sedang diproses. Saldo akan masuk setelah konfirmasi.`,
    });
    // Refresh balance after some delay to account for processing
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    }, 2000);
  };

  const handleQuickAmountSelect = (amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    setTopupAmount(amount.toString());
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = Number(sendAmount);
    
    if (!sendAmount || isNaN(amount) || amount < 10000) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimum pengiriman adalah Rp 10,000",
        variant: "destructive",
      });
      return;
    }

    if (!receiverUsername.trim()) {
      toast({
        title: "Username Tidak Valid",
        description: "Masukkan username penerima",
        variant: "destructive",
      });
      return;
    }

    if (amount > Number(balance)) {
      toast({
        title: "Saldo Tidak Mencukupi",
        description: "Saldo Anda tidak mencukupi untuk transaksi ini",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog before sending money
    const confirmed = await confirm({
      title: "Konfirmasi Pengiriman Uang",
      description: `Apakah Anda yakin ingin mengirim ${formatCurrency(amount)} ke @${receiverUsername.trim()}? Transaksi ini tidak dapat dibatalkan setelah diproses.`,
      confirmText: "Kirim Uang",
      cancelText: "Batal",
      variant: "warning",
      icon: "warning"
    });

    if (confirmed) {
      sendMoneyMutation.mutate({
        receiverUsername: receiverUsername.trim(),
        amount,
        message: sendMessage.trim() || undefined
      });
    }
  };

  const handleRequestMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = Number(requestAmount);
    
    if (!requestAmount || isNaN(amount) || amount < 10000) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimum permintaan adalah Rp 10,000",
        variant: "destructive",
      });
      return;
    }

    if (!requestFromUsername.trim()) {
      toast({
        title: "Username Tidak Valid",
        description: "Masukkan username dari siapa Anda ingin meminta uang",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog before requesting money
    const confirmed = await confirm({
      title: "Konfirmasi Permintaan Uang",
      description: `Apakah Anda yakin ingin meminta ${formatCurrency(amount)} dari @${requestFromUsername.trim()}? Permintaan akan dikirim dan mereka dapat menerima atau menolaknya.`,
      confirmText: "Kirim Permintaan",
      cancelText: "Batal",
      variant: "warning",
      icon: "warning"
    });

    if (confirmed) {
      requestMoneyMutation.mutate({
        receiverUsername: requestFromUsername.trim(),
        amount,
        message: requestMessage.trim() || undefined
      });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert to number and add proper validation with NaN guards
    const amount = Number(withdrawAmount);
    const currentBalance = Number(balance);
    
    if (!withdrawAmount || isNaN(amount) || amount < 50000) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimum penarikan adalah Rp 50,000",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(currentBalance) || amount > currentBalance) {
      toast({
        title: "Saldo Tidak Mencukupi",
        description: "Saldo Anda tidak mencukupi untuk penarikan ini",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog before withdrawal
    const confirmed = await confirm({
      title: "Konfirmasi Penarikan Uang",
      description: `Apakah Anda yakin ingin menarik ${formatCurrency(amount)} dari wallet? Penarikan akan diproses dan tidak dapat dibatalkan.`,
      confirmText: "Tarik Uang",
      cancelText: "Batal",
      variant: "warning",
      icon: "warning"
    });

    if (confirmed) {
      // Call the withdraw mutation with number
      withdrawMutation.mutate(amount);
    }
  };

  const quickAmounts = [50000, 100000, 250000, 500000, 1000000];


  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "topup":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "payment":
      case "withdrawal":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "commission":
        return <WalletIcon className="h-4 w-4 text-nxe-accent" />;
      default:
        return <WalletIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const quickActions = [
    { id: 'topup', label: 'Isi Saldo', icon: Plus, color: 'text-green-500' },
    { id: 'send', label: 'Kirim', icon: Send, color: 'text-blue-500' },
    { id: 'withdraw', label: 'Tarik', icon: Download, color: 'text-orange-500' },
    { id: 'request', label: 'Minta', icon: ArrowUpDown, color: 'text-purple-500' },
  ];

  const services = [
    { id: 'pulsa', label: 'Pulsa & Data', icon: Smartphone, color: 'text-red-500' },
    { id: 'deals', label: 'NXE Deals', icon: ShoppingBag, color: 'text-yellow-500' },
    { id: 'rewards', label: 'A+ Rewards', icon: Star, color: 'text-blue-500' },
    { id: 'games', label: 'Gaming Zone', icon: Gamepad2, color: 'text-purple-500' },
    { id: 'promo', label: 'Promo s.d 80%', icon: Gift, color: 'text-orange-500' },
    { id: 'qris', label: 'DANA QRISFEST', icon: QrCode, color: 'text-green-500' },
    { id: 'electric', label: 'Listrik', icon: Zap, color: 'text-yellow-400' },
    { id: 'more', label: 'Lihat Semua', icon: Plus, color: 'text-gray-400' },
  ];

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Header with Balance */}
      <div className="bg-gradient-to-b from-nxe-primary via-nxe-primary to-nxe-primary/90 px-4 pt-8 pb-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-4"></div>
        
        {/* Balance Card */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <WalletIcon className="h-6 w-6 text-nxe-primary" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Saldo NXE</p>
                <p className="text-white text-xs">Advanced Money Tracking</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10" data-testid="button-scan-qr">
              <QrCode className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white text-3xl font-bold mb-1" data-testid="text-balance">
              {isBalanceLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Loading...
                </span>
              ) : balanceError ? (
                <span className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-6 w-6" />
                  Error
                </span>
              ) : (
                formatCurrency(balance)
              )}
            </p>
            <p className="text-white/80 text-sm">
              {balanceError ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => queryClient.refetchQueries({ queryKey: ["/api/wallet/balance"] })}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 text-xs"
                  data-testid="button-retry-balance"
                >
                  Coba Lagi
                </Button>
              ) : (
                `💎 ${Number(balance) > 0 ? 'Bisa Nambah Tiap Hari' : 'Ayo isi saldo untuk mulai transaksi'}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 -mt-8 relative z-20 mb-6">
        <Tabs defaultValue="wallet" className="w-full" data-testid="tabs-wallet">
          <TabsList className="grid w-full grid-cols-2 bg-nxe-card border border-nxe-surface rounded-2xl mb-6">
            <TabsTrigger 
              value="wallet" 
              className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white text-gray-400 rounded-xl"
              data-testid="tab-wallet"
            >
              <WalletIcon className="h-4 w-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white text-gray-400 rounded-xl"
              data-testid="tab-dashboard"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-nxe-card rounded-2xl p-4 border border-nxe-surface shadow-lg">
              <div className="grid grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className="flex flex-col items-center space-y-2 h-16 hover:bg-nxe-surface/50"
                    onClick={() => {
                      switch(action.id) {
                        case 'topup':
                          handleQuickTopup();
                          break;
                        case 'withdraw':
                          setShowWithdrawDialog(true);
                          break;
                        case 'send':
                          setShowSendDialog(true);
                          break;
                        case 'request':
                          setShowRequestDialog(true);
                          break;
                      }
                    }}
                    data-testid={`button-${action.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-nxe-surface flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-white text-xs font-medium">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Services Grid */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-4">Layanan Favorit</h3>
              <div className="grid grid-cols-4 gap-4">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    variant="ghost"
                    className="flex flex-col items-center space-y-2 h-20 hover:bg-nxe-surface/30 rounded-xl"
                    data-testid={`service-${service.id}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-nxe-surface flex items-center justify-center ${service.color}`}>
                      <service.icon className="h-5 w-5" />
                    </div>
                    <span className="text-white text-xs text-center leading-tight">{service.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Aktivitas Terbaru</h3>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="text-nxe-primary hover:bg-nxe-surface/30" data-testid="button-view-all">
                    Lihat Semua
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-3">
                {isTransactionsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-nxe-primary" />
                    <span className="ml-2 text-white">Memuat transaksi...</span>
                  </div>
                ) : transactionsError ? (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-white text-sm font-medium mb-2">Gagal Memuat Transaksi</p>
                    <p className="text-gray-400 text-xs mb-4">Terjadi kesalahan saat memuat riwayat transaksi</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] })}
                      className="bg-transparent border-nxe-surface text-white hover:bg-nxe-surface"
                      data-testid="button-retry-transactions"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.slice(0, 3).map((transaction: WalletTransaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-nxe-card rounded-xl border border-nxe-surface"
                      data-testid={`transaction-${transaction.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-nxe-surface rounded-xl flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {transaction.description || `${transaction.type} - ${formatCurrency(transaction.amount)}`}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(transaction.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${
                          transaction.type === 'withdrawal' || transaction.type === 'payment'
                            ? 'text-red-400' 
                            : 'text-green-400'
                        }`}>
                          {transaction.type === 'withdrawal' || transaction.type === 'payment' ? '-' : '+'}
                          {formatCurrency(Math.abs(Number(transaction.amount)).toString())}
                        </p>
                        <p className={`text-xs ${
                          transaction.status === 'completed' 
                            ? 'text-green-400' 
                            : transaction.status === 'pending'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}>
                          {transaction.status === 'completed' ? 'Berhasil' : 
                           transaction.status === 'pending' ? 'Pending' : 'Gagal'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-nxe-surface rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-white text-sm font-medium mb-2">Belum Ada Transaksi</p>
                    <p className="text-gray-400 text-xs">Transaksi Anda akan muncul di sini setelah melakukan aktivitas</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <FinancialDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-nxe-card border-nxe-surface text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Download className="h-5 w-5 text-orange-500" />
              <span>Tarik Saldo</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount" className="text-white">Jumlah Penarikan (IDR)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Minimum Rp 50,000"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-withdraw-amount"
                disabled={withdrawMutation.isPending}
                autoFocus
              />
            </div>

            <div className="bg-nxe-surface p-3 rounded-lg">
              <p className="text-gray-400 text-sm">
                Saldo tersedia: {formatCurrency(balance)}
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWithdrawDialog(false)}
                className="flex-1 bg-transparent border-nxe-surface text-white hover:bg-nxe-surface"
                data-testid="button-cancel-withdraw"
                disabled={withdrawMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="button-confirm-withdraw"
                disabled={withdrawMutation.isPending || !withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < 50000 || Number(withdrawAmount) > Number(balance)}
              >
                {withdrawMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  "Tarik Saldo"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Top-up Dialog */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent className="bg-nxe-card border-nxe-surface text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Plus className="h-5 w-5 text-green-500" />
              <span>Isi Saldo</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTopup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topup-amount" className="text-white">Jumlah Top-up (IDR)</Label>
              <Input
                id="topup-amount"
                type="number"
                placeholder="Minimum Rp 10,000"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-topup-amount"
                disabled={depositMutation.isPending}
                autoFocus
              />
            </div>

            {/* Quick Amount Selection */}
            <div className="space-y-2">
              <Label className="text-white">Pilih Jumlah Cepat</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickAmountSelect(amount)}
                    className="bg-nxe-surface border-nxe-surface text-white hover:bg-nxe-surface/80 h-10"
                    data-testid={`button-quick-amount-${amount}`}
                    disabled={depositMutation.isPending}
                  >
                    {formatCurrency(amount.toString())}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-nxe-surface p-3 rounded-lg">
              <p className="text-gray-400 text-sm">
                Saldo saat ini: {formatCurrency(balance)}
              </p>
              {topupAmount && !isNaN(Number(topupAmount)) && Number(topupAmount) >= 10000 && (
                <p className="text-green-400 text-sm mt-1">
                  Saldo setelah top-up: {formatCurrency((Number(balance) + Number(topupAmount)).toString())}
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTopupDialog(false)}
                className="flex-1 bg-transparent border-nxe-surface text-white hover:bg-nxe-surface"
                data-testid="button-cancel-topup"
                disabled={depositMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-confirm-topup"
                disabled={depositMutation.isPending || !topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) < 10000}
              >
                {depositMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  "Isi Saldo"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="bg-nxe-card border-nxe-surface text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Send className="h-5 w-5 text-blue-500" />
              <span>Kirim Saldo</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMoney} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receiver-username" className="text-white">Username Penerima</Label>
              <Input
                id="receiver-username"
                type="text"
                placeholder="Masukkan username penerima"
                value={receiverUsername}
                onChange={(e) => setReceiverUsername(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-receiver-username"
                disabled={sendMoneyMutation.isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-amount" className="text-white">Jumlah Pengiriman (IDR)</Label>
              <Input
                id="send-amount"
                type="number"
                placeholder="Minimum Rp 10,000"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-send-amount"
                disabled={sendMoneyMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-message" className="text-white">Pesan (Opsional)</Label>
              <Input
                id="send-message"
                type="text"
                placeholder="Tambahkan pesan..."
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-send-message"
                disabled={sendMoneyMutation.isPending}
                maxLength={200}
              />
              <p className="text-xs text-gray-400">Maksimal 200 karakter</p>
            </div>

            <div className="bg-nxe-surface p-3 rounded-lg space-y-1">
              <p className="text-gray-400 text-sm">
                Saldo tersedia: {formatCurrency(balance)}
              </p>
              {sendAmount && !isNaN(Number(sendAmount)) && Number(sendAmount) >= 10000 && Number(sendAmount) <= Number(balance) && (
                <div className="space-y-1">
                  <p className="text-blue-400 text-sm">
                    Jumlah dikirim: {formatCurrency(sendAmount)}
                  </p>
                  <p className="text-green-400 text-sm">
                    Saldo setelah kirim: {formatCurrency((Number(balance) - Number(sendAmount)).toString())}
                  </p>
                </div>
              )}
              {sendAmount && Number(sendAmount) > Number(balance) && (
                <p className="text-red-400 text-sm">
                  ⚠️ Saldo tidak mencukupi
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSendDialog(false);
                  setSendAmount("");
                  setReceiverUsername("");
                  setSendMessage("");
                }}
                className="flex-1 bg-transparent border-nxe-surface text-white hover:bg-nxe-surface"
                data-testid="button-cancel-send"
                disabled={sendMoneyMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-confirm-send"
                disabled={sendMoneyMutation.isPending || !sendAmount || !receiverUsername || isNaN(Number(sendAmount)) || Number(sendAmount) < 10000 || Number(sendAmount) > Number(balance)}
              >
                {sendMoneyMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  "Kirim Saldo"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Money Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="bg-nxe-card border-nxe-surface text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <ArrowUpDown className="h-5 w-5 text-purple-500" />
              <span>Minta Saldo</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestMoney} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-from-username" className="text-white">Username Pengirim</Label>
              <Input
                id="request-from-username"
                type="text"
                placeholder="Dari siapa Anda ingin meminta"
                value={requestFromUsername}
                onChange={(e) => setRequestFromUsername(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-request-from-username"
                disabled={requestMoneyMutation.isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-amount" className="text-white">Jumlah Permintaan (IDR)</Label>
              <Input
                id="request-amount"
                type="number"
                placeholder="Minimum Rp 10,000"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-request-amount"
                disabled={requestMoneyMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-message" className="text-white">Alasan Permintaan (Opsional)</Label>
              <Input
                id="request-message"
                type="text"
                placeholder="Alasan meminta saldo..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="bg-nxe-surface border-nxe-surface text-white h-12"
                data-testid="input-request-message"
                disabled={requestMoneyMutation.isPending}
                maxLength={200}
              />
              <p className="text-xs text-gray-400">Maksimal 200 karakter</p>
            </div>

            <div className="bg-nxe-surface p-3 rounded-lg space-y-1">
              <p className="text-gray-400 text-sm">
                📋 Permintaan akan dikirim ke {requestFromUsername || '[username]'}
              </p>
              {requestAmount && !isNaN(Number(requestAmount)) && Number(requestAmount) >= 10000 && (
                <p className="text-purple-400 text-sm">
                  💰 Jumlah diminta: {formatCurrency(requestAmount)}
                </p>
              )}
              <p className="text-yellow-400 text-xs">
                ⚠️ Permintaan akan kedaluwarsa dalam 7 hari
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRequestDialog(false);
                  setRequestAmount("");
                  setRequestFromUsername("");
                  setRequestMessage("");
                }}
                className="flex-1 bg-transparent border-nxe-surface text-white hover:bg-nxe-surface"
                data-testid="button-cancel-request"
                disabled={requestMoneyMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-confirm-request"
                disabled={requestMoneyMutation.isPending || !requestAmount || !requestFromUsername || isNaN(Number(requestAmount)) || Number(requestAmount) < 10000}
              >
                {requestMoneyMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  "Kirim Permintaan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Midtrans Top-up Modal */}
      <WalletTopup
        isOpen={showMidtransTopup}
        onClose={() => setShowMidtransTopup(false)}
        onSuccess={handleMidtransTopupSuccess}
      />

    </div>
  );
}
