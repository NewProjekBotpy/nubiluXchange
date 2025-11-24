import { Smartphone, CreditCard, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentMethod } from "./MidtransPayment";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodSelect: (method: PaymentMethod) => void;
}

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'qris',
    name: 'QRIS',
    description: 'Scan QR code dengan aplikasi perbankan atau e-wallet',
    icon: QrCode,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-400/30'
  },
  {
    id: 'gopay',
    name: 'GoPay',
    description: 'Bayar dengan aplikasi Gojek',
    icon: Smartphone,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-400/30'
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    description: 'Bayar dengan aplikasi Shopee',
    icon: CreditCard,
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-400/30'
  }
];

export function PaymentMethodSelector({ selectedMethod, onMethodSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-medium">Metode Pembayaran</h3>
      
      <div className="grid gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? `bg-nxe-primary/20 border-nxe-primary`
                  : `bg-nxe-surface border-nxe-border hover:border-nxe-primary/50`
              }`}
              onClick={() => onMethodSelect(method.id)}
              data-testid={`payment-method-${method.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div 
                    className={`p-2 rounded-lg ${method.bgColor} ${method.textColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium">{method.name}</h4>
                      
                      <div 
                        className={`w-4 h-4 rounded-full border-2 transition-colors ${
                          isSelected
                            ? 'bg-nxe-primary border-nxe-primary'
                            : 'border-nxe-border'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-full h-full rounded-full bg-white scale-50" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-nxe-text text-sm mt-1">
                      {method.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}