"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="relative group">
      {/* Persistent Neon Glow Background - Only visible on hover/focus */}
      <motion.div
        initial={false}
        animate={{ 
          opacity: (isHovered || isFocused) ? 0.4 : 0,
          scale: (isHovered || isFocused) ? 1 : 0.95,
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut"
        }}
        className="absolute -inset-1 rounded-xl bg-gradient-to-r from-nxe-primary via-nxe-accent to-nxe-primary blur-md pointer-events-none"
        style={{
          animation: (isHovered || isFocused) ? 'neon-pulse 2s ease-in-out infinite' : 'none'
        }}
      />

      <SelectPrimitive.Trigger
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "relative flex h-11 w-full items-center justify-between rounded-lg border-2 border-nxe-border bg-nxe-dark/90 backdrop-blur-md px-4 py-2 text-sm text-white transition-all duration-300 data-[placeholder]:text-gray-400 hover:border-nxe-primary/60 hover:bg-nxe-dark/95 hover:shadow-[0_0_20px_rgba(22,163,74,0.3)] focus:outline-none focus:border-nxe-primary focus:bg-nxe-dark focus:shadow-[0_0_30px_rgba(22,163,74,0.5)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Shimmer Effect - CSS animation, pointer-events-none */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-nxe-primary/10 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />
        
        <div className="relative z-10 flex items-center flex-1">
          {children}
        </div>
        
        <SelectPrimitive.Icon asChild>
          <motion.div
            animate={{ 
              rotate: isFocused ? 180 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-all duration-300",
              (isHovered || isFocused) ? "text-nxe-accent drop-shadow-[0_0_8px_rgba(38,212,95,0.8)]" : "text-nxe-primary"
            )} />
          </motion.div>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    </div>
  );
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-nxe-primary",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-nxe-primary",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      asChild
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-hidden rounded-xl",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative"
      >
        {/* Neon Glow Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-nxe-primary via-nxe-accent to-nxe-primary rounded-xl blur-sm opacity-50" />
        
        {/* Content Container */}
        <div className="relative border-2 border-nxe-primary/50 bg-nxe-dark/98 backdrop-blur-xl rounded-xl overflow-hidden shadow-[0_0_40px_rgba(22,163,74,0.4)]">
          {/* Animated Background Gradient */}
          <motion.div
            className="absolute inset-0 opacity-5"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, rgba(22,163,74,0.4) 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, rgba(38,212,95,0.4) 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, rgba(22,163,74,0.4) 0%, transparent 50%)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1.5 relative z-10",
              position === "popper" &&
                "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </div>
      </motion.div>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold text-nxe-primary", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-10 pr-3 text-sm text-gray-300 outline-none overflow-hidden group transition-all duration-200 hover:bg-nxe-primary/20 hover:text-white hover:shadow-[0_0_15px_rgba(22,163,74,0.4)] focus:bg-nxe-primary/20 focus:text-white data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-nxe-primary/30 data-[state=checked]:via-nxe-accent/20 data-[state=checked]:to-nxe-primary/10 data-[state=checked]:text-white data-[state=checked]:shadow-[0_0_20px_rgba(22,163,74,0.5)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    {/* CSS Shimmer Effect - optimized with pointer-events-none */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-nxe-accent/30 to-transparent -skew-x-12 pointer-events-none" 
         style={{ animation: 'shimmer-slide 0.8s ease-out' }} />

    {/* Neon Border Effect on Checked */}
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-nxe-primary via-nxe-accent to-nxe-primary rounded-r-full opacity-0 data-[state=checked]:opacity-100 transition-opacity duration-200 pointer-events-none" />

    <span className="absolute left-2 flex h-5 w-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-nxe-accent drop-shadow-[0_0_10px_rgba(38,212,95,1)] animate-in zoom-in-50 duration-200" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText className="relative z-10">
      {children}
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
