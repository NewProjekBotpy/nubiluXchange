import { useState, useRef, useEffect, useCallback } from "react";
import { Home, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { usePageTransition } from "@/contexts/PageTransitionContext";

interface UnifiedNavbarProps {
  activeTab: "konten" | "cari" | "all_product";
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearchBar?: boolean;
  showFilterButton?: boolean;
  onFilterClick?: () => void;
  showNavbarFilters?: boolean;
  filterContent?: React.ReactNode;
  transparent?: boolean;
  hideLogo?: boolean;
}

export function UnifiedNavbar({
  activeTab,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Tanya AI atau Cari produk, kategori...",
  showSearchBar = true,
  showFilterButton = false,
  onFilterClick,
  showNavbarFilters = false,
  filterContent,
  transparent = false,
  hideLogo = false,
}: UnifiedNavbarProps) {
  const [, setLocation] = useLocation();
  const { setDirection, setIsTransitioning: setPageTransitioning } = usePageTransition();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [releaseTimer, setReleaseTimer] = useState<NodeJS.Timeout | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navbarFilterRef = useRef<HTMLDivElement>(null);

  // Tab order for determining direction
  const tabOrder = ["konten", "cari", "all_product"];

  const getDirection = (fromTab: string, toTab: string): 'left' | 'right' | 'none' => {
    const fromIndex = tabOrder.indexOf(fromTab);
    const toIndex = tabOrder.indexOf(toTab);
    if (toIndex > fromIndex) return 'left';
    if (toIndex < fromIndex) return 'right';
    return 'none';
  };

  // Haptic feedback and sound effect function
  const playFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // Cleanup function
  const cleanupTabState = useCallback(() => {
    setPressedTab(null);
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      setReleaseTimer(null);
    }
  }, [releaseTimer]);

  // Track scroll position for filter button animation
  useEffect(() => {
    if (!showFilterButton) return;

    const handleScroll = () => {
      // Button hidden when at top (scrollY < 50), visible when scrolled down
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showFilterButton]);

  // Auto-cleanup if stuck
  useEffect(() => {
    if (pressedTab && !releaseTimer) {
      const timer = setTimeout(cleanupTabState, 2000);
      setReleaseTimer(timer);
    }
    return () => {
      if (releaseTimer) {
        clearTimeout(releaseTimer);
      }
    };
  }, [pressedTab, releaseTimer, cleanupTabState]);

  const handleTabPress = (tab: string) => {
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      setReleaseTimer(null);
    }
    setPressedTab(tab);
  };

  const handleTabRelease = (tab: string) => {
    if (pressedTab === tab && !isTransitioning) {
      if (tab !== activeTab) {
        setIsTransitioning(true);
        setPageTransitioning(true);
        playFeedback();

        // Set direction based on tab transition
        const direction = getDirection(activeTab, tab);
        setDirection(direction);

        let targetRoute = "";
        if (tab === "cari") {
          targetRoute = "/search";
          // Special logic for search page transition
          // Smoothly fade and center the content during transition
          document.documentElement.style.setProperty('--transition-to-search', '1');
        } else if (tab === "konten") {
          targetRoute = "/video";
        } else if (tab === "all_product") {
          targetRoute = "/all-products";
        }

        setTimeout(() => {
          setLocation(targetRoute);
          setTimeout(() => {
            setIsTransitioning(false);
            setPageTransitioning(false);
            setDirection('none');
            // Reset search transition flag
            document.documentElement.style.setProperty('--transition-to-search', '0');
          }, 300);
        }, 50);
      }
    }
    cleanupTabState();
  };

  const handleTabCancel = () => {
    cleanupTabState();
  };

  return (
    <div 
      className="sticky top-0 z-[60]" 
      style={{ 
        height: showSearchBar ? 'calc(56px + (1 - var(--scroll-progress, 0)) * 48px)' : '56px',
        willChange: 'height'
      }}
    >
      {/* Navbar with adaptive layout */}
      <div className={`relative ${transparent ? 'bg-transparent' : 'nxe-glass'} ${transparent ? '' : 'border-b border-nxe-surface'}`} style={{ height: '56px' }}>
        <div className="h-full px-4 flex items-center justify-between">
          {/* Home Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-gray-400 hover:text-white hover:bg-white/5 p-2 flex-shrink-0 z-10"
            data-testid="button-home"
          >
            <Home className="h-5 w-5" />
          </Button>

          {/* Center area - Tab Navigation (Absolutely Centered) */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full flex items-center pointer-events-none" style={{height: '56px'}}>
            {/* Tab Navigation Layer - Slides up with logo when scrolling */}
            <div 
              className="flex items-center justify-center space-x-3 sm:space-x-4 pointer-events-auto transition-all duration-300"
              style={{
                opacity: showSearchBar 
                  ? (transparent ? 'calc(1 - var(--scroll-progress, 0))' : '1')
                  : '1',
                transform: showSearchBar 
                  ? 'translateY(calc(var(--scroll-progress, 0) * -40px))' 
                  : 'none',
                willChange: 'transform, opacity'
              }}
            >
              <button
                onMouseDown={() => handleTabPress("konten")}
                onMouseUp={() => handleTabRelease("konten")}
                onMouseLeave={handleTabCancel}
                onTouchStart={() => handleTabPress("konten")}
                onTouchEnd={() => handleTabRelease("konten")}
                onTouchCancel={handleTabCancel}
                className={`relative px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ease-out select-none whitespace-nowrap ${
                  activeTab === "konten" 
                    ? "text-white" 
                    : pressedTab === "konten"
                    ? "text-green-300 transform scale-95"
                    : "text-gray-400 hover:text-gray-200"
                } ${isTransitioning ? "opacity-80" : ""}`}
                data-testid="tab-content"
              >
                <span className="relative z-10">konten</span>
                {activeTab === "konten" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full shadow-sm" />
                )}
                {pressedTab === "konten" && (
                  <div className="absolute inset-0 bg-white/5 rounded-lg animate-pulse" />
                )}
              </button>

              <button
                onMouseDown={() => handleTabPress("cari")}
                onMouseUp={() => handleTabRelease("cari")}
                onMouseLeave={handleTabCancel}
                onTouchStart={() => handleTabPress("cari")}
                onTouchEnd={() => handleTabRelease("cari")}
                onTouchCancel={handleTabCancel}
                className={`relative px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ease-out select-none whitespace-nowrap ${
                  activeTab === "cari" 
                    ? "text-white" 
                    : pressedTab === "cari"
                    ? "text-green-300 transform scale-95"
                    : "text-gray-400 hover:text-gray-200"
                } ${isTransitioning ? "opacity-80" : ""}`}
                data-testid="tab-search"
              >
                <span className="relative z-10">cari</span>
                {activeTab === "cari" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full shadow-sm" />
                )}
                {pressedTab === "cari" && (
                  <div className="absolute inset-0 bg-white/5 rounded-lg animate-pulse" />
                )}
              </button>

              <button
                onMouseDown={() => handleTabPress("all_product")}
                onMouseUp={() => handleTabRelease("all_product")}
                onMouseLeave={handleTabCancel}
                onTouchStart={() => handleTabPress("all_product")}
                onTouchEnd={() => handleTabRelease("all_product")}
                onTouchCancel={handleTabCancel}
                className={`relative px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ease-out select-none whitespace-nowrap ${
                  activeTab === "all_product" 
                    ? "text-white" 
                    : pressedTab === "all_product"
                    ? "text-green-300 transform scale-95"
                    : "text-gray-400 hover:text-gray-200"
                } ${isTransitioning ? "opacity-80" : ""}`}
                data-testid="tab-all-products"
              >
                <span className="relative z-10">all account</span>
                {activeTab === "all_product" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full shadow-sm" />
                )}
                {pressedTab === "all_product" && (
                  <div className="absolute inset-0 bg-white/5 rounded-lg animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Right side - Spacer for balance */}
          <div className="flex-shrink-0 w-10"></div>
        </div>

        {/* NXE Logo - Fades out and slides up when scrolling */}
        {!hideLogo && (
          <div 
            className="absolute right-4 top-0 h-full flex items-center pointer-events-none"
            style={{
              opacity: showSearchBar 
                ? 'calc(1 - var(--scroll-progress, 0))' 
                : '1',
              transform: showSearchBar
                ? 'translateY(calc(var(--scroll-progress, 0) * -20px))'
                : 'translateY(0)',
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform, opacity',
              zIndex: 20
            }}
          >
            <span className="text-xl font-bold">
              <span className="text-white">N</span>
              <span className="text-green-500">X</span>
              <span className="text-white">E</span>
            </span>
          </div>
        )}

        {/* Filter Button - Hidden at top, fades in from bottom when scrolling */}
        {showFilterButton && (
          <div
            className="absolute right-4 top-0 h-full flex items-center transition-all duration-300 ease-out"
            style={{
              opacity: isScrolled ? 1 : 0,
              transform: isScrolled ? 'translateY(0)' : 'translateY(20px)',
              pointerEvents: isScrolled ? 'auto' : 'none',
              zIndex: 30,
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilterClick}
              className={`p-2 transition-colors ${
                showNavbarFilters 
                  ? "text-green-500 hover:text-green-400" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              data-testid="button-filters"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Collapsing Background Panel for Search Bar */}
      {showSearchBar && !transparent && (
        <div 
          className="nxe-glass border-b border-nxe-surface"
          style={{ 
            height: 'calc((1 - var(--scroll-progress, 0)) * 48px)',
            zIndex: 10,
            willChange: 'height'
          }}
        />
      )}

      {/* Search Form Layer - Positioned within sticky header */}
      {showSearchBar && (
        <div 
          className="absolute inset-x-0 px-4 pointer-events-none"
          style={{
            top: 'calc(12px + (1 - var(--scroll-progress, 0)) * 48px)',
            zIndex: 60,
            willChange: 'top'
          }}
        >
          <div className="relative flex justify-center pointer-events-none">
            <div 
              className="relative flex items-center pointer-events-auto"
              style={{
                width: 'min(calc(70% + (1 - var(--scroll-progress, 0)) * 25%), 600px)',
                willChange: 'width'
              }}
            >
              <Search className="absolute left-3 h-4 w-4 text-gray-400 z-10" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-9 pr-4 bg-gray-700/90 border-0 rounded-full text-white placeholder-gray-400 focus:outline-none focus:bg-gray-600/90 focus:ring-2 focus:ring-green-500/50 focus:shadow-lg focus:shadow-green-500/25 text-sm"
                style={{
                  height: 'calc(32px + (1 - var(--scroll-progress, 0)) * 8px)',
                  borderRadius: '9999px',
                  willChange: 'height'
                }}
                data-testid="input-search-products"
                autoComplete="off"
                spellCheck="false"
                aria-label="Search"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Popup Content */}
      {showNavbarFilters && filterContent && (
        <div 
          ref={navbarFilterRef}
          className="absolute right-4 top-full mt-2 bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-xl p-4 shadow-2xl z-50 min-w-[280px]"
        >
          {filterContent}
        </div>
      )}
    </div>
  );
}