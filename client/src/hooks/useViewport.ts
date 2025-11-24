import { useState, useEffect } from 'react'

interface ViewportState {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useViewport(): ViewportState {
  // Initialize with proper mobile detection using media queries
  const getInitialViewport = (): ViewportState => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      }
    }

    // Use matchMedia for accurate initial detection
    const isMobileQuery = window.matchMedia('(max-width: 767px)').matches
    const isTabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
    const width = window.innerWidth
    const height = window.innerHeight

    return {
      width,
      height,
      isMobile: isMobileQuery,
      isTablet: isTabletQuery,
      isDesktop: !isMobileQuery && !isTabletQuery
    }
  }

  const [viewport, setViewport] = useState<ViewportState>(getInitialViewport)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      })
    }

    // Update on resize
    window.addEventListener('resize', updateViewport)
    
    // Initial update
    updateViewport()

    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  return viewport
}