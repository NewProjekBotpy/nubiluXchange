import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  active: boolean;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onChange: (filterId: string) => void;
  onClear?: (filterId: string) => void;
  mode?: "single" | "multiple";
  className?: string;
}

export default function FilterChips({
  filters,
  onChange,
  onClear,
  mode = "multiple",
  className
}: FilterChipsProps) {
  const handleChipClick = (filterId: string) => {
    onChange(filterId);
  };

  const handleClearClick = (e: React.MouseEvent, filterId: string) => {
    e.stopPropagation();
    if (onClear) {
      onClear(filterId);
    } else {
      onChange(filterId);
    }
  };

  return (
    <div 
      className={cn("relative", className)}
      data-testid="filter-chips-container"
    >
      <div 
        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory touch-pan-x scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {filters.map((filter) => (
          <motion.button
            key={filter.id}
            onClick={() => handleChipClick(filter.id)}
            data-testid={`filter-chip-${filter.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            transition={{
              duration: 0.2,
              ease: "easeOut"
            }}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2",
              "rounded-full border text-xs sm:text-sm font-medium",
              "whitespace-nowrap transition-all duration-300",
              "touch-manipulation snap-start flex-shrink-0",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              filter.active
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-100"
                : "bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80 hover:border-muted-foreground/40 hover:scale-105"
            )}
          >
            <AnimatePresence mode="wait">
              {filter.active && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>

            <span className="select-none">{filter.label}</span>

            {filter.active && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                onClick={(e) => handleClearClick(e, filter.id)}
                className={cn(
                  "ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20",
                  "transition-colors focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"
                )}
                data-testid={`filter-chip-clear-${filter.id}`}
                aria-label={`Clear ${filter.label} filter`}
              >
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </motion.button>
            )}

            {filter.active && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 0] }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute inset-0 rounded-full border-2 border-primary opacity-50 pointer-events-none"
              />
            )}
          </motion.button>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      }} />
    </div>
  );
}
