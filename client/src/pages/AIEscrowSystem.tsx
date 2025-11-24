import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, 
  ArrowLeftRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Bot,
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  MessageSquare,
  Eye,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatIDR } from "@/lib/utils";

interface EscrowTransaction {
  id: number;
  buyerId: number;
  sellerId: number;
  productId: number;
  amount: string;
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'cancelled';
  aiStatus: 'processing' | 'approved' | 'flagged' | 'manual_review';
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  buyer?: {
    id: number;
    username: string;
    displayName?: string;
    profilePicture?: string;
    isVerified: boolean;
  };
  seller?: {
    id: number;
    username: string;
    displayName?: string;
    profilePicture?: string;
    isVerified: boolean;
  };
  product?: {
    id: number;
    title: string;
    category: string;
    thumbnail?: string;
  };
  aiDecision?: {
    recommendation: string;
    confidence: number;
    reasons: string[];
    timestamp: string;
  };
}

interface EscrowStats {
  totalTransactions: number;
  activeEscrows: number;
  completedToday: number;
  disputedCases: number;
  aiProcessedCount: number;
  totalVolume: string;
  averageProcessingTime: number;
  fraudPrevented: number;
}

export default function AIEscrowSystem() {
  const [selectedTransaction, setSelectedTransaction] = useState<EscrowTransaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch escrow statistics
  const { data: stats } = useQuery<EscrowStats>({
    queryKey: ['/api/escrow/stats'],
  });

  // Fetch all escrow transactions
  const { data: transactions = [] } = useQuery<EscrowTransaction[]>({
    queryKey: ['/api/escrow/transactions'],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable automatic polling
  });

  // Process escrow transaction mutation
  const processTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, action }: { transactionId: number, action: 'approve' | 'reject' | 'manual_review' }) => {
      return apiRequest('/api/escrow/process', {
        method: 'POST',
        body: { transaction_id: transactionId, action }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/escrow/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/escrow/stats'] });
      toast({ title: "Transaction processed successfully" });
      setDetailsOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to process transaction", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // AI re-analysis mutation
  const reAnalyzeMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest('/api/escrow/reanalyze', {
        method: 'POST',
        body: { transaction_id: transactionId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/escrow/transactions'] });
      toast({ title: "AI re-analysis completed" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to re-analyze", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Use centralized money formatting utility
  // (formatCurrency function replaced with formatIDR from utils)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'disputed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'flagged': return 'bg-red-500';
      case 'manual_review': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore < 30) return 'text-green-400';
    if (riskScore < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending' || t.aiStatus === 'manual_review');
  const activeTransactions = transactions.filter(t => t.status === 'active');
  const completedTransactions = transactions.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-nxe-dark/95 backdrop-blur-md border-b border-nxe-surface">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-nxe-accent" />
            <div>
              <h1 className="text-2xl font-bold text-white">AI Escrow System</h1>
              <p className="text-sm text-gray-400">Intelligent transaction protection</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-nxe-surface"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/escrow/transactions'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-nxe-surface"
              onClick={() => window.location.href = '/admin'}
            >
              Back to Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-nxe-card border-nxe-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">{stats?.totalTransactions || 0}</div>
                <ArrowLeftRight className="h-5 w-5 text-nxe-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nxe-card border-nxe-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Escrows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">{stats?.activeEscrows || 0}</div>
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nxe-card border-nxe-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">AI Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">{stats?.aiProcessedCount || 0}</div>
                <Bot className="h-5 w-5 text-nxe-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nxe-card border-nxe-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-white">{stats?.totalVolume ? formatIDR(stats.totalVolume) : 'Rp 0'}</div>
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid grid-cols-4 bg-nxe-card mb-6">
            <TabsTrigger value="pending" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Pending ({pendingTransactions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Active ({activeTransactions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Completed ({completedTransactions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Pending Transactions */}
          <TabsContent value="pending">
            <Card className="bg-nxe-card border-nxe-surface">
              <CardHeader>
                <CardTitle className="text-white">Pending Review</CardTitle>
                <p className="text-gray-400">Transactions requiring manual review or approval</p>
              </CardHeader>
              <CardContent>
                {pendingTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">No pending transactions</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nxe-surface">
                        <TableHead className="text-gray-400">Transaction</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Risk Score</TableHead>
                        <TableHead className="text-gray-400">AI Status</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTransactions.map(transaction => (
                        <TableRow key={transaction.id} className="border-nxe-surface">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={transaction.buyer?.profilePicture} />
                                <AvatarFallback>{transaction.buyer?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white font-medium">#{transaction.id}</p>
                                <p className="text-sm text-gray-400">{transaction.product?.title}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-white font-medium">{formatIDR(transaction.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${getRiskColor(transaction.riskScore)}`}>
                                {transaction.riskScore}%
                              </span>
                              <Progress value={transaction.riskScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getAIStatusColor(transaction.aiStatus)}>
                              {transaction.aiStatus.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-400">{formatDate(transaction.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setDetailsOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="border-nxe-surface"
                                data-testid={`button-view-transaction-${transaction.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                onClick={() => processTransactionMutation.mutate({ 
                                  transactionId: transaction.id, 
                                  action: 'approve' 
                                })}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={processTransactionMutation.isPending}
                                data-testid={`button-approve-transaction-${transaction.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                onClick={() => processTransactionMutation.mutate({ 
                                  transactionId: transaction.id, 
                                  action: 'reject' 
                                })}
                                size="sm"
                                variant="destructive"
                                disabled={processTransactionMutation.isPending}
                                data-testid={`button-reject-transaction-${transaction.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Transactions */}
          <TabsContent value="active">
            <Card className="bg-nxe-card border-nxe-surface">
              <CardHeader>
                <CardTitle className="text-white">Active Escrows</CardTitle>
                <p className="text-gray-400">Transactions currently in escrow</p>
              </CardHeader>
              <CardContent>
                {activeTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">No active escrows</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTransactions.map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-nxe-surface rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={transaction.buyer?.profilePicture} />
                              <AvatarFallback>{transaction.buyer?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={transaction.seller?.profilePicture} />
                              <AvatarFallback>{transaction.seller?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <p className="text-white font-medium">#{transaction.id} - {transaction.product?.title}</p>
                            <p className="text-sm text-gray-400">
                              {transaction.buyer?.username} → {transaction.seller?.username}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-white font-medium">{formatIDR(transaction.amount)}</p>
                            <p className="text-sm text-gray-400">{formatDate(transaction.createdAt)}</p>
                          </div>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completed Transactions */}
          <TabsContent value="completed">
            <Card className="bg-nxe-card border-nxe-surface">
              <CardHeader>
                <CardTitle className="text-white">Completed Transactions</CardTitle>
                <p className="text-gray-400">Successfully completed escrow transactions</p>
              </CardHeader>
              <CardContent>
                {completedTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">No completed transactions</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-nxe-surface">
                        <TableHead className="text-gray-400">Transaction</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Completed</TableHead>
                        <TableHead className="text-gray-400">Processing Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTransactions.map(transaction => (
                        <TableRow key={transaction.id} className="border-nxe-surface">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={transaction.buyer?.profilePicture} />
                                  <AvatarFallback className="text-xs">{transaction.buyer?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <ArrowLeftRight className="h-3 w-3 text-gray-400" />
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={transaction.seller?.profilePicture} />
                                  <AvatarFallback className="text-xs">{transaction.seller?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div>
                                <p className="text-white font-medium">#{transaction.id}</p>
                                <p className="text-sm text-gray-400">{transaction.product?.title}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-white font-medium">{formatIDR(transaction.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-400">{formatDate(transaction.updatedAt)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-400">
                              {Math.floor((new Date(transaction.updatedAt).getTime() - new Date(transaction.createdAt).getTime()) / (1000 * 60))} min
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-nxe-card border-nxe-surface">
                <CardHeader>
                  <CardTitle className="text-white">AI Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Fraud Detection Rate</span>
                      <span className="text-white font-bold">99.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Auto-Approval Rate</span>
                      <span className="text-white font-bold">87.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Average Processing Time</span>
                      <span className="text-white font-bold">{stats?.averageProcessingTime || 0} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Fraud Cases Prevented</span>
                      <span className="text-red-400 font-bold">{stats?.fraudPrevented || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-nxe-card border-nxe-surface">
                <CardHeader>
                  <CardTitle className="text-white">Daily Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Transactions Today</span>
                      <span className="text-white font-bold">{stats?.completedToday || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Disputes</span>
                      <span className="text-yellow-400 font-bold">{stats?.disputedCases || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Success Rate</span>
                      <span className="text-green-400 font-bold">98.7%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">AI Confidence Average</span>
                      <span className="text-nxe-accent font-bold">94.3%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-nxe-card border-nxe-surface max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed information and AI analysis for transaction #{selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-medium mb-2">Buyer</h3>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedTransaction.buyer?.profilePicture} />
                      <AvatarFallback>{selectedTransaction.buyer?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white">{selectedTransaction.buyer?.displayName || selectedTransaction.buyer?.username}</p>
                      <p className="text-sm text-gray-400">Buyer</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-white font-medium mb-2">Seller</h3>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedTransaction.seller?.profilePicture} />
                      <AvatarFallback>{selectedTransaction.seller?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white">{selectedTransaction.seller?.displayName || selectedTransaction.seller?.username}</p>
                      <p className="text-sm text-gray-400">Seller</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedTransaction.aiDecision && (
                <div>
                  <h3 className="text-white font-medium mb-3">AI Analysis</h3>
                  <Card className="bg-nxe-surface border-nxe-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">AI Recommendation</span>
                        <Badge className={getAIStatusColor(selectedTransaction.aiDecision.recommendation)}>
                          {selectedTransaction.aiDecision.recommendation.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">Confidence Level</span>
                        <span className="text-white font-bold">{selectedTransaction.aiDecision.confidence}%</span>
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-gray-400 block mb-2">Analysis Reasons</span>
                        <ul className="space-y-1">
                          {selectedTransaction.aiDecision.reasons.map((reason, index) => (
                            <li key={index} className="text-sm text-gray-300 flex items-start">
                              <span className="text-nxe-accent mr-2">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center space-x-4 pt-3 border-t border-nxe-border">
                        <Button
                          onClick={() => reAnalyzeMutation.mutate(selectedTransaction.id)}
                          size="sm"
                          variant="outline"
                          className="border-nxe-border"
                          disabled={reAnalyzeMutation.isPending}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Re-analyze
                        </Button>
                        
                        <Button
                          onClick={() => processTransactionMutation.mutate({ 
                            transactionId: selectedTransaction.id, 
                            action: 'manual_review' 
                          })}
                          size="sm"
                          variant="outline"
                          className="border-nxe-border"
                          disabled={processTransactionMutation.isPending}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Manual Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-nxe-surface">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                
                {selectedTransaction.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => processTransactionMutation.mutate({ 
                        transactionId: selectedTransaction.id, 
                        action: 'approve' 
                      })}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={processTransactionMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => processTransactionMutation.mutate({ 
                        transactionId: selectedTransaction.id, 
                        action: 'reject' 
                      })}
                      variant="destructive"
                      disabled={processTransactionMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}