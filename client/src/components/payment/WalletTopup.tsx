import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MidtransPayment from "./MidtransPayment";

interface WalletTopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

// Mock product for wallet top-up (will be handled by backend)
const WALLET_TOPUP_PRODUCT_ID = -1; // Special ID for wallet top-up

export function WalletTopup({ isOpen, onClose, onSuccess }: WalletTopupProps) {
  const [step, setStep] = useState<'amount' | 'payment'>('amount');
  const [topupAmount, setTopupAmount] = useState('');
  const { toast } = useToast();

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleQuickAmountSelect = (amount: number) => {
    setTopupAmount(amount.toString());
  };

  const handleProceedToPayment = () => {
    const amount = Number(topupAmount);
    
    if (!topupAmount || isNaN(amount) || amount < 10000) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimum top-up adalah Rp 10,000",
        variant: "destructive",
      });
      return;
    }
    
    if (amount > 10000000) {
      toast({
        title: "Jumlah Terlalu Besar",
        description: "Jumlah maksimum top-up adalah Rp 10,000,000",
        variant: "destructive",
      });
      return;
    }

    setStep('payment');
  };

  const handleBackToAmount = () => {
    setStep('amount');
  };

  const handlePaymentSuccess = (orderId: string) => {
    toast({
      title: "Top-up Berhasil!",
      description: `Saldo Anda akan ditambahkan setelah pembayaran dikonfirmasi.`,
    });
    onSuccess?.(orderId);
    onClose();
    setStep('amount'); // Reset for next time
  };

  const handleCancel = () => {
    if (step === 'payment') {
      setStep('amount');
    } else {
      onClose();
      setStep('amount'); // Reset
      setTopupAmount('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-nxe-card border-nxe-surface max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {step === 'payment' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToAmount}
                className="p-1 hover:bg-nxe-surface/50"
                data-testid="button-back-to-amount"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </Button>
            )}
            <DialogTitle className="text-white flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-nxe-primary" />
              <span>{step === 'amount' ? 'Top-up Saldo' : 'Pembayaran Top-up'}</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'amount' ? (
          <div className="space-y-6">
            {/* Amount Input */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white text-lg">Masukkan Jumlah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-nxe-text">
                    Jumlah Top-up (IDR)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Masukkan jumlah..."
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="bg-nxe-dark border-nxe-border text-white text-lg font-medium"
                    min="10000"
                    max="10000000"
                    data-testid="input-topup-amount"
                  />
                  
                  {topupAmount && !isNaN(Number(topupAmount)) && Number(topupAmount) >= 10000 && (
                    <p className="text-nxe-primary font-medium">
                      {formatCurrency(Number(topupAmount))}
                    </p>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <Label className="text-nxe-text text-sm mb-3 block">
                    Pilih Cepat:
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {quickAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => handleQuickAmountSelect(amount)}
                        className={`h-12 text-sm ${
                          topupAmount === amount.toString()
                            ? 'border-nxe-primary bg-nxe-primary/20 text-nxe-primary'
                            : 'border-nxe-border text-nxe-text hover:bg-nxe-surface'
                        }`}
                        data-testid={`quick-amount-${amount}`}
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-nxe-primary/10 border border-nxe-primary/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Plus className="h-4 w-4 text-nxe-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="text-nxe-primary font-medium mb-1">Info Top-up</p>
                      <ul className="text-nxe-text space-y-1">
                        <li>• Minimum: Rp 10,000</li>
                        <li>• Maksimum: Rp 10,000,000</li>
                        <li>• Saldo akan masuk setelah pembayaran berhasil</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 border-nxe-border text-nxe-text hover:bg-nxe-surface"
                data-testid="button-cancel-topup"
              >
                Batal
              </Button>
              
              <Button
                onClick={handleProceedToPayment}
                className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90 text-white"
                disabled={!topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) < 10000}
                data-testid="button-proceed-topup"
              >
                Lanjut Pembayaran
              </Button>
            </div>
          </div>
        ) : (
          <MidtransPayment
            productId={WALLET_TOPUP_PRODUCT_ID}
            amount={Number(topupAmount)}
            onSuccess={handlePaymentSuccess}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}