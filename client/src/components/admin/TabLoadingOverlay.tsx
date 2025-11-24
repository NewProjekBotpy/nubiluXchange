import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabLoadingOverlayProps {
  isLoading: boolean;
  tabName?: string;
}

export default function TabLoadingOverlay({ 
  isLoading, 
  tabName 
}: TabLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "absolute inset-0 z-50",
            "bg-nxe-dark/80 backdrop-blur-sm",
            "flex items-center justify-center",
            "pointer-events-auto"
          )}
          data-testid="tab-loading-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 
              className="h-8 w-8 text-nxe-primary animate-spin" 
              strokeWidth={2.5}
            />
            {tabName && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-sm font-medium text-gray-300"
              >
                Loading {tabName}...
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
