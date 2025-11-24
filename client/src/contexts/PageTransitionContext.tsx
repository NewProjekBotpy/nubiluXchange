import { createContext, useContext, useState, ReactNode } from 'react';

type TransitionDirection = 'left' | 'right' | 'none';

interface PageTransitionContextType {
  direction: TransitionDirection;
  setDirection: (direction: TransitionDirection) => void;
  isTransitioning: boolean;
  setIsTransitioning: (value: boolean) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<TransitionDirection>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);

  return (
    <PageTransitionContext.Provider 
      value={{ 
        direction, 
        setDirection, 
        isTransitioning, 
        setIsTransitioning 
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }
  return context;
}
