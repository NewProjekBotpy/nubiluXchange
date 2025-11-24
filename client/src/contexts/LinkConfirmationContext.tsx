import { createContext, useContext, useState, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface LinkConfirmationOptions {
  url: string;
  title?: string;
}

interface LinkConfirmationContextValue {
  confirmLink: (options: LinkConfirmationOptions) => Promise<'browser' | 'app' | 'cancel'>;
}

const LinkConfirmationContext = createContext<LinkConfirmationContextValue | undefined>(undefined);

interface LinkConfirmationState extends LinkConfirmationOptions {
  open: boolean;
}

export function LinkConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LinkConfirmationState>({
    open: false,
    url: '',
    title: 'Konfirmasi pembukaan tautan',
  });
  const resolverRef = useRef<((value: 'browser' | 'app' | 'cancel') => void) | null>(null);

  const confirmLink = (options: LinkConfirmationOptions): Promise<'browser' | 'app' | 'cancel'> => {
    return new Promise((resolve, reject) => {
      // Guard against concurrent calls
      if (resolverRef.current) {
        reject(new Error('Another link confirmation is already in progress'));
        return;
      }

      resolverRef.current = resolve;
      setState({
        ...options,
        title: options.title || 'Konfirmasi pembukaan tautan',
        open: true,
      });
    });
  };

  const handleChoice = (choice: 'browser' | 'app' | 'cancel') => {
    if (resolverRef.current) {
      resolverRef.current(choice);
      resolverRef.current = null;
    }
    setState(prev => ({ ...prev, open: false }));
  };

  return (
    <LinkConfirmationContext.Provider value={{ confirmLink }}>
      {children}
      
      <Drawer open={state.open} onOpenChange={(open) => { if (!open) handleChoice('cancel'); }}>
        <DrawerContent className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {/* iOS Action Sheet Header */}
          <DrawerHeader className="text-center pt-4 pb-2">
            <DrawerTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {state.title}
            </DrawerTitle>
            
            {/* URL Display - iOS style inline text */}
            <div className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed px-4" data-testid="text-link-url">
              {state.url}
            </div>
          </DrawerHeader>
          
          {/* iOS Action Sheet Buttons */}
          <div 
            className="px-4 pb-4"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            {/* Main action buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden mb-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => handleChoice('app')}
                variant="ghost"
                className="w-full h-14 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-none border-b border-gray-200 dark:border-gray-600 font-medium text-base"
                data-testid="button-open-app"
              >
                Buka di aplikasi
              </Button>
              
              <Button
                onClick={() => handleChoice('browser')}
                variant="ghost"
                className="w-full h-14 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-none font-normal text-base"
                data-testid="button-open-browser"
              >
                Buka di browser
              </Button>
            </div>
            
            {/* Cancel button - separated iOS style */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => handleChoice('cancel')}
                variant="ghost"
                className="w-full h-14 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-none font-semibold text-base"
                data-testid="button-cancel"
              >
                Batalkan
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </LinkConfirmationContext.Provider>
  );
}

export function useLinkConfirmation() {
  const context = useContext(LinkConfirmationContext);
  if (!context) {
    throw new Error('useLinkConfirmation must be used within a LinkConfirmationProvider');
  }
  return context;
}