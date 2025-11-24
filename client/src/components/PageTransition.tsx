import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { usePageTransition } from '@/contexts/PageTransitionContext';

interface PageTransitionProps {
  children: ReactNode;
}

// Map routes to their order for determining slide direction
const routeOrder: Record<string, number> = {
  '/video': 0,
  '/search': 1,
  '/all-products': 2,
};

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const { direction } = usePageTransition();

  // Determine animation direction based on context or route order
  const getVariants = () => {
    const slideDistance = 100;
    
    if (direction === 'left') {
      return {
        initial: { x: `${slideDistance}%`, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: `-${slideDistance}%`, opacity: 0 },
      };
    } else if (direction === 'right') {
      return {
        initial: { x: `-${slideDistance}%`, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: `${slideDistance}%`, opacity: 0 },
      };
    } else {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }
  };

  const variants = getVariants();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{
          type: 'tween',
          ease: [0.4, 0, 0.2, 1], // Smooth easing
          duration: 0.3,
        }}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
