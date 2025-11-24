import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Star, ArrowLeft } from "lucide-react";
import MidtransPayment from "./MidtransPayment";
import { formatIDR, formatTikTokNumber } from "@/lib/utils";

interface ProductCheckoutProps {
  product: {
    id: number;
    title: string;
    price: string;
    thumbnail?: string;
    category: string;
    isPremium: boolean;
    rating: string;
    reviewCount: number;
    seller?: {
      id: number;
      username: string;
      displayName?: string;
      profilePicture?: string;
      isVerified: boolean;
      rating?: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

export function ProductCheckout({ product, isOpen, onClose, onSuccess }: ProductCheckoutProps) {
  const [step, setStep] = useState<'confirm' | 'payment'>('confirm');

  // Use centralized money formatting utility
  // (formatCurrency function replaced with formatIDR from utils)

  const getCategoryDisplay = (category: string) => {
    const categories: Record<string, string> = {
      mobile_legends: "Mobile Legends",
      pubg_mobile: "PUBG Mobile", 
      free_fire: "Free Fire",
      valorant: "Valorant",
      genshin_impact: "Genshin Impact",
    };
    return categories[category] || category;
  };

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const handleBackToConfirm = () => {
    setStep('confirm');
  };

  const handlePaymentSuccess = (orderId: string) => {
    onSuccess?.(orderId);
    onClose();
    setStep('confirm'); // Reset for next time
  };

  const handleCancel = () => {
    if (step === 'payment') {
      setStep('confirm');
    } else {
      onClose();
    }
  };

  const totalPrice = parseInt(product.price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-nxe-card border-nxe-surface max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {step === 'payment' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToConfirm}
                className="p-1 hover:bg-nxe-surface/50"
                data-testid="button-back-to-confirm"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </Button>
            )}
            <DialogTitle className="text-white">
              {step === 'confirm' ? 'Konfirmasi Pembelian' : 'Pembayaran'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'confirm' ? (
          <div className="space-y-6">
            {/* Product Summary */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardContent className="p-4">
                <div className="flex space-x-3">
                  <img
                    src={product.thumbnail || `https://images.unsplash.com/photo-${1400 + product.id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`}
                    alt={product.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryDisplay(product.category)}
                      </Badge>
                      {product.isPremium && (
                        <Badge className="bg-nxe-primary text-xs">Premium</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-sm text-nxe-text">{product.rating}</span>
                        <span className="text-xs text-gray-500">({formatTikTokNumber(product.reviewCount)})</span>
                      </div>
                      
                      <p className="text-lg font-bold text-nxe-primary">
                        {formatIDR(product.price)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader className="pb-3">
                <h3 className="text-white font-medium text-sm">Penjual</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage 
                      src={product.seller?.profilePicture || `https://images.unsplash.com/photo-${1500 + (product.seller?.id || 0)}?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`}
                      alt={product.seller?.username}
                    />
                    <AvatarFallback>
                      {product.seller?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium text-sm">
                        {product.seller?.displayName || product.seller?.username || 'Seller'}
                      </p>
                      {product.seller?.isVerified && (
                        <Shield className="h-3 w-3 text-nxe-accent" />
                      )}
                    </div>
                    
                    {product.seller?.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-nxe-text">{product.seller.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="bg-nxe-surface border-nxe-border">
              <CardHeader className="pb-3">
                <h3 className="text-white font-medium">Ringkasan Pesanan</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-nxe-text">Harga Produk</span>
                  <span className="text-white">{formatIDR(product.price)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-nxe-text">Biaya Layanan</span>
                  <span className="text-green-400">Gratis</span>
                </div>
                
                <div className="border-t border-nxe-border pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-nxe-primary font-bold text-lg">
                      {formatIDR(product.price)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-nxe-border text-nxe-text hover:bg-nxe-surface"
                data-testid="button-cancel-checkout"
              >
                Batal
              </Button>
              
              <Button
                onClick={handleProceedToPayment}
                className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90 text-white"
                data-testid="button-proceed-payment"
              >
                Lanjut Pembayaran
              </Button>
            </div>
          </div>
        ) : (
          <MidtransPayment
            productId={product.id}
            amount={totalPrice}
            onSuccess={handlePaymentSuccess}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}