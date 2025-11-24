import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type AuraColor = "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold"
type BorderStyle = "energy" | "geometric" | "neon" | "crystal"

interface BolderAvatarProps {
  src?: string
  alt?: string
  fallback?: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  interactive?: boolean
  onClick?: () => void
  onHover?: (isHovered: boolean) => void
  auraColor?: AuraColor
  borderStyle?: BorderStyle
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16", 
  lg: "w-24 h-24",
  xl: "w-32 h-32"
}

const auraColorClasses: Record<AuraColor, string> = {
  purple: "shadow-[0_0_20px_rgba(168,85,247,0.6)] ring-4 ring-purple-500/50",
  green: "shadow-[0_0_20px_rgba(34,197,94,0.6)] ring-4 ring-green-500/50",
  blue: "shadow-[0_0_20px_rgba(59,130,246,0.6)] ring-4 ring-blue-500/50",
  orange: "shadow-[0_0_20px_rgba(249,115,22,0.6)] ring-4 ring-orange-500/50",
  red: "shadow-[0_0_20px_rgba(239,68,68,0.6)] ring-4 ring-red-500/50",
  pink: "shadow-[0_0_20px_rgba(236,72,153,0.6)] ring-4 ring-pink-500/50",
  cyan: "shadow-[0_0_20px_rgba(6,182,212,0.6)] ring-4 ring-cyan-500/50",
  gold: "shadow-[0_0_20px_rgba(234,179,8,0.6)] ring-4 ring-yellow-500/50"
}

const borderStyleClasses: Record<BorderStyle, string> = {
  energy: "ring-offset-2 ring-offset-nxe-dark animate-pulse",
  geometric: "ring-offset-4 ring-offset-nxe-dark",
  neon: "ring-offset-2 ring-offset-nxe-dark brightness-110",
  crystal: "ring-offset-3 ring-offset-nxe-dark opacity-90"
}

export const BolderAvatar = React.forwardRef<
  HTMLDivElement,
  BolderAvatarProps
>(({ 
  src, 
  alt, 
  fallback, 
  className, 
  size = "lg", 
  interactive = false,
  onClick,
  onHover,
  auraColor = "purple",
  borderStyle = "energy",
  ...props 
}, ref) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)
  
  const handleMouseEnter = () => {
    if (!interactive) return
    setIsHovered(true)
    onHover?.(true)
  }
  
  const handleMouseLeave = () => {
    if (!interactive) return
    setIsHovered(false)
    onHover?.(false)
  }
  
  const handleMouseDown = () => {
    if (!interactive) return
    setIsActive(true)
  }
  
  const handleMouseUp = () => {
    if (!interactive) return
    setIsActive(false)
  }
  
  const handleClick = () => {
    if (!interactive) return
    onClick?.()
  }

  return (
    <div 
      ref={ref}
      className={cn(
        "relative inline-block transition-transform duration-200",
        interactive && "cursor-pointer",
        interactive && isHovered && "scale-105",
        interactive && isActive && "scale-95",
        className
      )}
      data-testid="bolder-avatar-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      {...props}
    >
      <div className={cn(
        "relative rounded-full transition-all duration-300",
        sizeClasses[size],
        auraColorClasses[auraColor],
        borderStyleClasses[borderStyle]
      )}>
        <Avatar className={cn("w-full h-full")} data-testid="bolder-avatar-image">
          <AvatarImage src={src} alt={alt} />
          <AvatarFallback className="text-lg font-bold text-white bg-nxe-surface" data-testid="bolder-avatar-fallback">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
})

BolderAvatar.displayName = "BolderAvatar"
