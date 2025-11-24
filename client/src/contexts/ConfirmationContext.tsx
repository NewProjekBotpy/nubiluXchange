import { createContext, useContext, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Trash2, LogOut, XCircle } from 'lucide-react';

export interface ConfirmationOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  icon?: 'warning' | 'shield' | 'delete' | 'logout' | 'cancel';
  secondaryAction?: {
    text: string;
    variant?: 'default' | 'secondary';
  };
}

interface ConfirmationContextValue {
  confirm: (options: ConfirmationOptions) => Promise<boolean | 'secondary'>;
}

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined);

interface ConfirmationState extends ConfirmationOptions {
  open: boolean;
  resolve?: (value: boolean | 'secondary') => void;
}

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmationState>({
    open: false,
    title: '',
    description: '',
    confirmText: 'Konfirmasi',
    cancelText: 'Batal',
    variant: 'default',
  });

  const confirm = (options: ConfirmationOptions): Promise<boolean | 'secondary'> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        confirmText: options.confirmText || 'Konfirmasi',
        cancelText: options.cancelText || 'Batal',
        variant: options.variant || 'default',
        open: true,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState(prev => ({ ...prev, open: false, resolve: undefined }));
  };

  const handleSecondary = () => {
    if (state.resolve) {
      state.resolve('secondary');
    }
    setState(prev => ({ ...prev, open: false, resolve: undefined }));
  };

  const handleCancel = () => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState(prev => ({ ...prev, open: false, resolve: undefined }));
  };

  const getIcon = () => {
    switch (state.icon) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'shield':
        return <Shield className="h-6 w-6 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-6 w-6 text-red-500" />;
      case 'logout':
        return <LogOut className="h-6 w-6 text-orange-500" />;
      case 'cancel':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (state.variant) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      
      <Dialog open={state.open} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent 
          className="bg-gray-800 border-gray-700 text-white max-w-sm mx-auto rounded-2xl overflow-hidden p-6"
          style={{ backgroundColor: '#2a2a2a' }}
        >
          {/* Header with title only */}
          <DialogHeader className="text-center pb-6">
            <DialogTitle className="text-lg font-semibold text-white">
              {state.title}
            </DialogTitle>
          </DialogHeader>
          
          {/* Description in gray box */}
          <div className="mb-6">
            <div className="bg-gray-700 rounded-lg p-4 text-sm text-gray-300 leading-relaxed break-words" data-testid="text-description">
              {state.description}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary action button - styled like "Buka di browser" (red) */}
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <Button
                onClick={handleConfirm}
                variant="ghost"
                className={`w-full h-12 rounded-none text-base font-medium ${
                  state.variant === 'destructive' 
                    ? 'text-red-400 hover:bg-gray-600 hover:text-red-300' 
                    : 'text-white hover:bg-gray-600'
                }`}
                data-testid="button-confirm"
              >
                {state.confirmText}
              </Button>
            </div>
            
            {/* Secondary action button - styled like "Buka di aplikasi" (white) */}
            {state.secondaryAction && (
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <Button
                  onClick={handleSecondary}
                  variant="ghost"
                  className="w-full h-12 rounded-none text-base font-medium text-white hover:bg-gray-600"
                  data-testid="button-secondary"
                >
                  {state.secondaryAction.text}
                </Button>
              </div>
            )}
            
            {/* Cancel button - styled like "Batalkan" */}
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="w-full h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-base font-medium"
              data-testid="button-cancel"
            >
              {state.cancelText}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}