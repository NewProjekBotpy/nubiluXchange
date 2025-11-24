import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedProgressRingProps {
  totalSegments: number
  viewedSegments: number
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  mobileStrokeWidth?: number
  desktopStrokeWidth?: number
  reverse?: boolean
}

const sizeMap = {
  sm: 56,
  md: 72,
  lg: 104,
  xl: 136,
}

export const SegmentedProgressRing = React.forwardRef<
  HTMLDivElement,
  SegmentedProgressRingProps
>(
  (
    {
      totalSegments,
      viewedSegments,
      size = "lg",
      className,
      mobileStrokeWidth = 2,
      desktopStrokeWidth = 2,
      reverse = false,
    },
    ref
  ) => {
    if (totalSegments === 0) {
      return null
    }

    const cappedViewedSegments = Math.min(viewedSegments, totalSegments)
    const diameter = sizeMap[size]
    
    // WhatsApp-style colors
    const viewedColor = "#A8A8A8"
    const unviewedColor = "#25D366"

    // Generate SVG paths for ring segments with symmetrical gaps
    const generateSegments = (strokeWidth: number) => {
      const radius = (diameter - strokeWidth) / 2
      const centerX = diameter / 2
      const centerY = diameter / 2

      // Single segment - full circle
      if (totalSegments === 1) {
        const color = cappedViewedSegments === 1 ? viewedColor : unviewedColor
        return [
          <circle
            key="full-ring"
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ]
      }

      // Multi-segment with symmetrical gaps
      // Gap size based on segment count
      let gapDegrees: number
      if (totalSegments === 2) {
        gapDegrees = 10
      } else if (totalSegments <= 5) {
        gapDegrees = 8
      } else if (totalSegments <= 10) {
        gapDegrees = 6
      } else if (totalSegments <= 20) {
        gapDegrees = 4
      } else {
        gapDegrees = Math.max(2, 240 / totalSegments)
      }

      // Safe clamp to prevent negative segment widths
      const maxSafeGap = 358 / totalSegments
      gapDegrees = Math.min(gapDegrees, maxSafeGap)

      // Each segment occupies equal angular space
      const segmentAngle = 360 / totalSegments
      const arcAngle = segmentAngle - gapDegrees

      const segments = []

      for (let i = 0; i < totalSegments; i++) {
        const isViewed = reverse
          ? i >= totalSegments - cappedViewedSegments
          : i < cappedViewedSegments
        
        const color = isViewed ? viewedColor : unviewedColor
        
        // Start angle for this segment (rotate to start from top, -90deg offset)
        // Symmetrical placement: center arc in slot with gap/2 offset on each side
        const startAngle = (segmentAngle * i - 90 + gapDegrees / 2) * (Math.PI / 180)
        const endAngle = (startAngle * (180 / Math.PI) + arcAngle) * (Math.PI / 180)

        // Calculate start and end points
        const startX = centerX + radius * Math.cos(startAngle)
        const startY = centerY + radius * Math.sin(startAngle)
        const endX = centerX + radius * Math.cos(endAngle)
        const endY = centerY + radius * Math.sin(endAngle)

        // Determine if arc is large (> 180 degrees)
        const largeArcFlag = arcAngle > 180 ? 1 : 0

        // Create arc path
        const pathData = `
          M ${startX} ${startY}
          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
        `

        segments.push(
          <path
            key={`segment-${i}`}
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )
      }

      return segments
    }

    const mobileSegments = generateSegments(mobileStrokeWidth)
    const desktopSegments = generateSegments(desktopStrokeWidth)

    return (
      <>
        {/* Mobile version */}
        <div
          ref={ref}
          className={cn("md:hidden", className)}
          style={{
            width: `${diameter}px`,
            height: `${diameter}px`,
          }}
          data-testid="segmented-progress-ring-mobile"
        >
          <svg
            width={diameter}
            height={diameter}
            viewBox={`0 0 ${diameter} ${diameter}`}
            style={{
              transform: 'translateZ(0)',
              shapeRendering: 'geometricPrecision',
            }}
          >
            {mobileSegments}
          </svg>
        </div>

        {/* Desktop version */}
        <div
          className={cn("hidden md:block", className)}
          style={{
            width: `${diameter}px`,
            height: `${diameter}px`,
          }}
          data-testid="segmented-progress-ring-desktop"
        >
          <svg
            width={diameter}
            height={diameter}
            viewBox={`0 0 ${diameter} ${diameter}`}
            style={{
              transform: 'translateZ(0)',
              shapeRendering: 'geometricPrecision',
            }}
          >
            {desktopSegments}
          </svg>
        </div>
      </>
    )
  }
)

SegmentedProgressRing.displayName = "SegmentedProgressRing"
