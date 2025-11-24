import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  CreditCard,
  Wallet,
  Filter,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

interface Transaction {
  id: number;
  type: 'purchase' | 'sale' | 'topup' | 'withdrawal' | 'commission';
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  createdAt: string;
  metadata?: {
    productTitle?: string;
    buyerUsername?: string;
    sellerUsername?: string;
    paymentMethod?: string;
  };
}

interface WalletTransaction {
  id: number;
  type: 'topup' | 'withdrawal' | 'payment' | 'commission';
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'failed':
    case 'refunded':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-600';
    case 'pending':
      return 'bg-yellow-600';
    case 'failed':
    case 'refunded':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
};

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'purchase':
      return <ShoppingCart className="h-4 w-4 text-blue-500" />;
    case 'sale':
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    case 'topup':
      return <ArrowDownLeft className="h-4 w-4 text-blue-500" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
    case 'commission':
      return <CreditCard className="h-4 w-4 text-purple-500" />;
    default:
      return <Wallet className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'completed':
      return 'Selesai';
    case 'pending':
      return 'Menunggu';
    case 'failed':
      return 'Gagal';
    case 'refunded':
      return 'Dikembalikan';
    default:
      return status || 'Tidak diketahui';
  }
};

export default function TransactionHistory() {
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("30");

  // Fetch product transactions
  const { data: productTransactions = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/transactions', filterStatus, filterPeriod]
  });

  // Fetch wallet transactions  
  const { data: walletTransactions = [], isLoading: loadingWallet } = useQuery({
    queryKey: ['/api/wallet/transactions', filterStatus, filterPeriod]
  });

  const formatPrice = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TransactionCard = ({ transaction, type }: { transaction: any, type: 'product' | 'wallet' }) => (
    <Card key={transaction.id} className="bg-nxe-surface border-nxe-border hover:border-nxe-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-nxe-dark rounded-lg">
              {getTypeIcon(transaction.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-white truncate">
                  {transaction.description}
                </h4>
                <Badge className={`${getStatusColor(transaction.status)} text-white text-xs`}>
                  {getStatusIcon(transaction.status)}
                  <span className="ml-1">{getStatusText(transaction.status)}</span>
                </Badge>
              </div>
              
              {transaction.metadata?.productTitle && (
                <p className="text-sm text-nxe-text mb-1 truncate">
                  Produk: {transaction.metadata.productTitle}
                </p>
              )}
              
              {transaction.metadata?.buyerUsername && (
                <p className="text-sm text-nxe-text mb-1">
                  Pembeli: @{transaction.metadata.buyerUsername}
                </p>
              )}
              
              {transaction.metadata?.sellerUsername && (
                <p className="text-sm text-nxe-text mb-1">
                  Penjual: @{transaction.metadata.sellerUsername}
                </p>
              )}
              
              {transaction.metadata?.paymentMethod && (
                <p className="text-sm text-nxe-text mb-1">
                  Metode: {transaction.metadata.paymentMethod.toUpperCase()}
                </p>
              )}
              
              <p className="text-xs text-nxe-text">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className={`font-semibold ${
              transaction.type === 'sale' || transaction.type === 'commission' || transaction.type === 'topup'
                ? 'text-green-500'
                : transaction.type === 'purchase' || transaction.type === 'withdrawal'
                ? 'text-red-500'
                : 'text-white'
            }`}>
              {(transaction.type === 'sale' || transaction.type === 'commission' || transaction.type === 'topup') ? '+' : '-'}
              {formatPrice(transaction.amount)}
            </p>
            <Button 
              variant="ghost" 
              size="sm"
              className="mt-1 text-nxe-primary hover:bg-nxe-primary/10 text-xs"
              onClick={() => setLocation(`/transaction/${transaction.id}`)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-nxe-dark p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Riwayat Transaksi
        </h1>
        <p className="text-nxe-text">
          Lihat semua aktivitas pembelian, penjualan, dan wallet Anda
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-nxe-primary" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-nxe-surface border-nxe-border text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nxe-surface border-nxe-border">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="completed">Berhasil</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-nxe-primary" />
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-40 bg-nxe-surface border-nxe-border text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-nxe-surface border-nxe-border">
              <SelectItem value="7">7 hari terakhir</SelectItem>
              <SelectItem value="30">30 hari terakhir</SelectItem>
              <SelectItem value="90">3 bulan terakhir</SelectItem>
              <SelectItem value="365">1 tahun terakhir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-nxe-surface border border-nxe-border">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Semua
          </TabsTrigger>
          <TabsTrigger 
            value="products"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Produk
          </TabsTrigger>
          <TabsTrigger 
            value="wallet"
            className="data-[state=active]:bg-nxe-primary data-[state=active]:text-white"
          >
            Wallet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loadingProducts || loadingWallet ? (
            <div className="flex justify-center items-center min-h-64" data-testid="all-transactions-loading">
              <Loading variant="spinner" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Combine and sort all transactions */}
              {[...(productTransactions as Transaction[]).map((t: Transaction) => ({...t, source: 'product'})),
                ...(walletTransactions as WalletTransaction[]).map((t: WalletTransaction) => ({...t, source: 'wallet'}))]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((transaction) => (
                  <TransactionCard 
                    key={`${transaction.source}-${transaction.id}`}
                    transaction={transaction} 
                    type={transaction.source as 'product' | 'wallet'}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {loadingProducts ? (
            <div className="flex justify-center items-center min-h-64" data-testid="products-transactions-loading">
              <Loading variant="dots" />
            </div>
          ) : (productTransactions as Transaction[]).length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Belum ada transaksi produk
              </h3>
              <p className="text-nxe-text mb-4">
                Mulai jual atau beli akun gaming untuk melihat riwayat transaksi
              </p>
              <Button 
                onClick={() => setLocation("/market")}
                className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
              >
                Jelajahi Marketplace
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(productTransactions as Transaction[]).map((transaction: Transaction) => (
                <TransactionCard 
                  key={transaction.id}
                  transaction={transaction} 
                  type="product"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          {loadingWallet ? (
            <div className="flex justify-center items-center min-h-64" data-testid="wallet-transactions-loading">
              <Loading variant="progress" />
            </div>
          ) : (walletTransactions as WalletTransaction[]).length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Belum ada transaksi wallet
              </h3>
              <p className="text-nxe-text mb-4">
                Top up wallet Anda untuk mulai bertransaksi
              </p>
              <Button 
                onClick={() => setLocation("/wallet")}
                className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
              >
                Buka Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(walletTransactions as WalletTransaction[]).map((transaction: WalletTransaction) => (
                <TransactionCard 
                  key={transaction.id}
                  transaction={transaction} 
                  type="wallet"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}