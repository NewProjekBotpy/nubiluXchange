import { forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TouchButtonProps extends ButtonProps {
  /** Ensures minimum 44px touch area for mobile accessibility */
  touchOptimized?: boolean;
  /** Shows loading state with spinner */
  loading?: boolean;
  /** Icon to display before text */
  icon?: React.ComponentType<any>;
  /** Icon to display after text */
  iconAfter?: React.ComponentType<any>;
  /** Badge content to show */
  badge?: string | number;
  /** Make button full width on mobile */
  fullWidthMobile?: boolean;
  /** Enhanced haptic feedback on interaction */
  hapticFeedback?: boolean;
}

const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ 
    className,
    touchOptimized = true,
    loading = false,
    icon: Icon,
    iconAfter: IconAfter,
    badge,
    fullWidthMobile = false,
    hapticFeedback = true,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    const handleInteraction = () => {
      // Trigger haptic feedback on supported devices
      if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    };

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        onMouseDown={handleInteraction}
        onTouchStart={handleInteraction}
        className={cn(
          // Base responsive classes with enhanced animations
          "relative transition-all duration-200 ease-out",
          "hover:scale-105 active:scale-95 hover:shadow-lg",
          "transform-gpu will-change-transform",
          
          // Touch optimization - minimum 44px height for mobile accessibility
          touchOptimized && "min-h-[44px] min-w-[44px]",
          
          // Full width on mobile if requested
          fullWidthMobile && "w-full sm:w-auto",
          
          // Loading state
          loading && "cursor-not-allowed hover:scale-100 active:scale-100",
          
          className
        )}
        {...props}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-100" />
          </div>
        )}
        
        {/* Content Container */}
        <div className={cn(
          "flex items-center justify-center space-x-2",
          loading && "invisible"
        )}>
          {/* Leading Icon */}
          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
          
          {/* Button Text */}
          {children && <span className="truncate">{children}</span>}
          
          {/* Trailing Icon */}
          {IconAfter && <IconAfter className="h-4 w-4 flex-shrink-0" />}
          
          {/* Badge */}
          {badge && (
            <span className="badge-modern min-w-[16px] h-4 px-1 text-xs status-error">
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
      </Button>
    );
  }
);

TouchButton.displayName = "TouchButton";

export { TouchButton };

// Preset button variants for common admin actions
export const AdminActionButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (props, ref) => (
    <TouchButton
      ref={ref}
      variant="outline"
      size="sm"
      className="border-nxe-border text-nxe-text hover:text-white hover:border-nxe-primary/50 transition-modern hover-lift"
      {...props}
    />
  )
);

export const AdminPrimaryButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (props, ref) => (
    <TouchButton
      ref={ref}
      variant="default"
      className="modern-button text-white hover-glow"
      {...props}
    />
  )
);

export const AdminDangerButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (props, ref) => (
    <TouchButton
      ref={ref}
      variant="destructive"
      className="status-error text-white hover-lift transition-modern"
      {...props}
    />
  )
);

AdminActionButton.displayName = "AdminActionButton";
AdminPrimaryButton.displayName = "AdminPrimaryButton";
AdminDangerButton.displayName = "AdminDangerButton";