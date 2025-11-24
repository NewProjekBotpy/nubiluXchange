import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-8 sm:py-12 md:py-16",
        className
      )}
      data-testid="empty-state"
    >
      {illustration ? (
        <div className="mb-6 sm:mb-8" data-testid="empty-state-illustration">
          {illustration}
        </div>
      ) : Icon ? (
        <div 
          className="mb-6 sm:mb-8 text-muted-foreground/40" 
          data-testid="empty-state-icon"
        >
          <Icon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" strokeWidth={1.5} />
        </div>
      ) : null}

      <div className="max-w-md space-y-2 sm:space-y-3">
        <h3 
          className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground"
          data-testid="empty-state-title"
        >
          {title}
        </h3>
        <p 
          className="text-sm sm:text-base text-muted-foreground"
          data-testid="empty-state-description"
        >
          {description}
        </p>
      </div>

      {action && (
        <div className="mt-6 sm:mt-8">
          <Button
            onClick={action.onClick}
            variant="default"
            size="default"
            className="min-w-[140px]"
            data-testid="empty-state-action"
          >
            {action.label}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
