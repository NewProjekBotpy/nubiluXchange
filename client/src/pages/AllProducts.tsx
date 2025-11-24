import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, SlidersHorizontal, Home, Star, Eye } from "lucide-react";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/components/ui/lazy-image";
import { useLocation } from "wouter";
import { useSearchHeaderScroll } from "@/hooks/useSearchHeaderScroll";
import type { Product } from "@shared/schema";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";
import { PageTransition } from "@/components/PageTransition";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

// Extended Product type with seller information
type ProductWithSeller = Product & {
  seller: {
    username: string;
    displayName: string | null;
    profilePicture: string | null;
    isVerified: boolean | null;
    sellerRating: string | null;
    sellerReviewCount: number | null;
  };
};

export default function AllProducts() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showNavbarFilters, setShowNavbarFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navbarFilterRef = useRef<HTMLDivElement>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [centerCategoryId, setCenterCategoryId] = useState<string>("all");
  const [selectedCategoryWidth, setSelectedCategoryWidth] = useState<number>(120); // Default width
  const [isMagneting, setIsMagneting] = useState(false); // Magnet effect state
  const [isScrolling, setIsScrolling] = useState(false); // Track scrolling state
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Game categories
  const gameCategories = [
    { id: "all", label: "Semua Game" },
    { id: "mobile_legends", label: "Mobile Legends" },
    { id: "pubg_mobile", label: "PUBG Mobile" },
    { id: "free_fire", label: "Free Fire" },
    { id: "valorant", label: "Valorant" },
    { id: "genshin_impact", label: "Genshin Impact" },
    { id: "roblox", label: "Roblox" },
  ];

  // Swipe navigation
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigation({ currentPage: 'all_product' });

  // Use shared scroll animation hook for consistency
  useSearchHeaderScroll({ 
    triggerRef: filterSectionRef,
    collapseDistance: 60,
    snapThreshold: 0.4,
    snapDuration: 200
  });

  // Navigation function for category scroll (defined early for use in useEffect)
  const scrollToNextCategory = useCallback(() => {
    if (!categoryScrollRef.current) return;

    const currentIndex = gameCategories.findIndex(cat => cat.id === centerCategoryId);
    const nextIndex = currentIndex < gameCategories.length - 1 ? currentIndex + 1 : 0;

    // Find the closest element with this category in the middle loop (loop 5)
    const container = categoryScrollRef.current;
    const targetElementIndex = 5 * gameCategories.length + nextIndex;
    const targetElement = container.children[targetElementIndex] as HTMLElement;

    if (targetElement) {
      const scrollLeft = targetElement.offsetLeft - (container.offsetWidth / 2) + (targetElement.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      playFeedback();
    }
  }, [centerCategoryId, gameCategories]);

  // Fast scroll back to "Semua Game" (all category)
  const scrollBackToAll = useCallback(() => {
    if (!categoryScrollRef.current) return;

    const container = categoryScrollRef.current;
    // Find "all" category (index 0) in middle loop (loop 5)
    const allCategoryIndex = 5 * gameCategories.length; // First category in loop 5
    const targetElement = container.children[allCategoryIndex] as HTMLElement;

    if (targetElement) {
      const scrollLeft = targetElement.offsetLeft - (container.offsetWidth / 2) + (targetElement.offsetWidth / 2);

      // Use custom fast scroll with 500ms duration
      const startScroll = container.scrollLeft;
      const distance = scrollLeft - startScroll;
      const duration = 500; // 0.5 seconds
      const startTime = performance.now();

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);

        container.scrollLeft = startScroll + (distance * easedProgress);

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          playFeedback();
        }
      };

      requestAnimationFrame(animateScroll);
    }
  }, [gameCategories]);

  // Close navbar filter popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNavbarFilters && navbarFilterRef.current && !navbarFilterRef.current.contains(event.target as Node)) {
        setShowNavbarFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNavbarFilters]);

  // Measure initial category width on mount and auto-scroll to next category (once only)
  useEffect(() => {
    if (categoryScrollRef.current) {
      const firstCategory = categoryScrollRef.current.children[0] as HTMLElement;
      if (firstCategory) {
        setSelectedCategoryWidth(firstCategory.offsetWidth);
      }

      // Auto-scroll to next category immediately on mount (visual hint)
      scrollToNextCategory();

      // After first animation completes (~300ms for smooth scroll), scroll back to "Semua Game"
      // No delay between animations - starts immediately when first animation ends
      const scrollBackTimer = setTimeout(() => {
        scrollBackToAll();
      }, 600); // Wait for first smooth scroll animation to complete

      return () => clearTimeout(scrollBackTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures this runs only once on mount

  // Auto-snap function: Force category to center after idle
  const snapToCenter = useCallback(() => {
    if (!categoryScrollRef.current) return;

    const container = categoryScrollRef.current;
    const scrollLeft = container.scrollLeft;
    const containerCenter = container.offsetWidth / 2;

    // Find closest category to center
    let closestElement: HTMLElement | null = null;
    let minDistance = Infinity;
    const totalCategories = gameCategories.length * 10;

    for (let i = 0; i < totalCategories; i++) {
      const categoryElement = container.children[i] as HTMLElement;
      if (categoryElement) {
        const categoryCenter = categoryElement.offsetLeft + categoryElement.offsetWidth / 2 - scrollLeft;
        const distance = Math.abs(categoryCenter - containerCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestElement = categoryElement;
        }
      }
    }

    // Snap to center with magnet effect
    if (closestElement) {
      setIsMagneting(true);
      const targetScrollLeft = closestElement.offsetLeft - (container.offsetWidth / 2) + (closestElement.offsetWidth / 2);

      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });

      // Remove magnet effect after animation
      setTimeout(() => setIsMagneting(false), 500);
    }
  }, [gameCategories]);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Product selection handler
  const handleProductClick = (productId: number) => {
    if (selectedProduct === productId) {
      // If already selected, navigate to detail page
      setLocation(`/product/${productId}`);
    } else {
      // If not selected, select it first
      setSelectedProduct(productId);
    }
  };

  const isSelected = (productId: number) => selectedProduct === productId;

  // Fetch all products from all users - specify high limit to get all products
  const { data: products = [], isLoading } = useQuery<ProductWithSeller[]>({
    queryKey: ['/api/products', 'limit=100'],
    queryFn: () => fetch('/api/products?limit=100').then(res => res.json()),
  });

  // Use centralized money formatting utility
  // (formatCurrency function replaced with formatIDR from utils)

  // Get account type label based on sort type
  const getAccountTypeLabel = () => {
    switch (sortBy) {
      case "price_high":
        return "High Account";
      case "price_low":
        return "Low Account";
      case "rating":
        return "Seller Famous";
      case "newest":
      default:
        return "Semua Account";
    }
  };

  // Get account type description based on sort type
  const getAccountTypeDescription = () => {
    switch (sortBy) {
      case "price_high":
        return "Menampilkan akun dengan harga tertinggi";
      case "price_low":
        return "Menampilkan akun dengan harga terendah";
      case "rating":
        return "Menampilkan produk dari seller dengan rating tertinggi";
      case "newest":
      default:
        return "Menampilkan semua produk yang baru di posting dalam 1 bulan";
    }
  };

  // Get dynamic product count text with description
  const getProductCountText = () => {
    const count = filteredProducts.length;
    switch (sortBy) {
      case "price_high":
        return `${count} produk dengan harga tertinggi ditemukan`;
      case "price_low":
        return `${count} produk dengan harga terendah ditemukan`;
      case "rating":
        return `${count} produk dari seller famous ditemukan`;
      case "newest":
      default:
        return `${count} produk terbaru dalam bulan ini ditemukan`;
    }
  };

  // Filter products based on search query, category, price range, and sort - memoized for performance
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search filter
        const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory = selectedCategory === "all" || 
          product.category.toLowerCase() === selectedCategory.toLowerCase();

        // Price range filter
        const price = parseInt(product.price || "0");
        let matchesPrice = true;

        if (priceRange !== "all") {
          switch (priceRange) {
            case "under_100k":
              matchesPrice = price < 100000;
              break;
            case "100k_500k":
              matchesPrice = price >= 100000 && price < 500000;
              break;
            case "500k_1m":
              matchesPrice = price >= 500000 && price < 1000000;
              break;
            case "above_1m":
              matchesPrice = price >= 1000000;
              break;
          }
        }

        // Filter for products posted within last 1 month (for "Semua Account")
        let matchesTimeRange = true;
        if (sortBy === "newest") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const productDate = product.createdAt ? new Date(product.createdAt) : new Date(0);
          matchesTimeRange = productDate >= oneMonthAgo;
        }

        return matchesSearch && matchesCategory && matchesPrice && matchesTimeRange;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price_low":
            return parseInt(a.price || "0") - parseInt(b.price || "0");
          case "price_high":
            return parseInt(b.price || "0") - parseInt(a.price || "0");
          case "rating":
            // Sort by seller rating (highest to lowest)
            const ratingA = parseFloat(a.seller?.sellerRating || "0");
            const ratingB = parseFloat(b.seller?.sellerRating || "0");
            return ratingB - ratingA;
          case "newest":
          default:
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
      });
  }, [products, searchQuery, selectedCategory, sortBy, priceRange]);

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

  // Filter content for navbar
  const filterContent = (
    <>
      {/* Category filters */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs mb-3 font-medium">Kategori</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("all");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "all" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Semua</span>
            {selectedCategory === "all" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("mobile_legends");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "mobile_legends" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Mobile Legends</span>
            {selectedCategory === "mobile_legends" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("pubg_mobile");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "pubg_mobile" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">PUBG Mobile</span>
            {selectedCategory === "pubg_mobile" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("free_fire");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "free_fire" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Free Fire</span>
            {selectedCategory === "free_fire" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("valorant");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "valorant" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Valorant</span>
            {selectedCategory === "valorant" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("genshin_impact");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "genshin_impact" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Genshin Impact</span>
            {selectedCategory === "genshin_impact" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              playFeedback();
              setSelectedCategory("roblox");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "roblox" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Roblox</span>
            {selectedCategory === "roblox" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="mb-4 border-t border-white/10 pt-3">
        <p className="text-gray-400 text-xs mb-3 font-medium">Filter Harga</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPriceRange("all");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              priceRange === "all" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Semua Harga</span>
            {priceRange === "all" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setPriceRange("under_100k");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              priceRange === "under_100k" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Di bawah 100k</span>
            {priceRange === "under_100k" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setPriceRange("100k_500k");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              priceRange === "100k_500k" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">100k - 500k</span>
            {priceRange === "100k_500k" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setPriceRange("500k_1m");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              priceRange === "500k_1m" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">500k - 1 juta</span>
            {priceRange === "500k_1m" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setPriceRange("above_1m");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              priceRange === "above_1m" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Di atas 1 juta</span>
            {priceRange === "above_1m" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Sort options */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-gray-400 text-xs mb-3 font-medium">Urutkan</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSortBy("newest");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              sortBy === "newest" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Terbaru</span>
            {sortBy === "newest" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setSortBy("price_low");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              sortBy === "price_low" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Harga Terendah</span>
            {sortBy === "price_low" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setSortBy("price_high");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              sortBy === "price_high" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Harga Tertinggi</span>
            {sortBy === "price_high" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setSortBy("rating");
              setShowNavbarFilters(false);
            }}
            className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              sortBy === "rating" 
                ? "text-white" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className="relative z-10">Seller Famous</span>
            {sortBy === "rating" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <PageTransition>
      <div 
        className="min-h-screen bg-nxe-dark text-white"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* Unified Navbar */}
      <UnifiedNavbar
        activeTab="all_product"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tanya AI atau Cari produk, kategori..."
        showSearchBar={true}
        showFilterButton={true}
        onFilterClick={() => setShowNavbarFilters(!showNavbarFilters)}
        showNavbarFilters={showNavbarFilters}
        filterContent={filterContent}
      />

      {/* Category Selector Section - Wheel Picker Style */}
      <div ref={filterSectionRef} className="relative bg-nxe-surface/20 border-b border-white/5">
        {/* Horizontal Scrolling Category Selector */}
        <div className="relative overflow-hidden">
          {/* Fade effect left - Black gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />

          {/* Fade effect right - Black gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none" />

          {/* Fixed Center Selector (Patung Polisi) - with Magnet Effect */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center">
            {/* Left Bracket - Dynamically positioned with magnet effect */}
            <span className="text-green-500 font-bold text-base sm:text-lg transition-all duration-300"
              style={{
                transform: `translateX(${-selectedCategoryWidth / 2 - 12}px) scale(${isMagneting ? 1.2 : 1})`,
                textShadow: isMagneting 
                  ? '0 0 20px rgba(34, 197, 94, 0.9), 0 0 30px rgba(34, 197, 94, 0.6)' 
                  : '0 0 10px rgba(34, 197, 94, 0.5)',
              }}
            >
              {'{'}
            </span>

            {/* Center highlight area with dynamic width lines and magnet effect */}
            <div className="relative py-3 flex items-center justify-center" style={{ width: `${selectedCategoryWidth}px` }}>
              {/* Top line - matches category width with magnet effect */}
              <div 
                className="absolute -top-1 bg-green-500 transition-all overflow-hidden"
                style={{
                  width: `${selectedCategoryWidth + 16}px`,
                  left: '50%',
                  height: isMagneting ? '3px' : '2px',
                  transform: `translateX(-50%) skewX(-10deg) scaleX(${isMagneting ? 1.1 : 1})`,
                  boxShadow: isMagneting 
                    ? '0 0 20px rgba(34, 197, 94, 0.9), 0 0 40px rgba(34, 197, 94, 0.6)' 
                    : '0 0 8px rgba(34, 197, 94, 0.6)',
                  transitionDuration: isScrolling ? '150ms' : '300ms',
                }}
              >
                {/* Extending animation when scrolling - left side */}
                {isScrolling && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-green-500 animate-extend-left"
                    style={{
                      width: '50%',
                      transformOrigin: 'right',
                      animation: 'extendLeft 200ms ease-out',
                      boxShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 50px rgba(34, 197, 94, 0.8)',
                    }}
                  />
                )}
                {/* Extending animation when scrolling - right side */}
                {isScrolling && (
                  <div 
                    className="absolute top-0 right-0 h-full bg-green-500 animate-extend-right"
                    style={{
                      width: '50%',
                      transformOrigin: 'left',
                      animation: 'extendRight 200ms ease-out',
                      boxShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 50px rgba(34, 197, 94, 0.8)',
                    }}
                  />
                )}
              </div>

              {/* Bottom line - matches category width with magnet effect */}
              <div 
                className="absolute -bottom-1 bg-green-500 transition-all overflow-hidden"
                style={{
                  width: `${selectedCategoryWidth + 16}px`,
                  left: '50%',
                  height: isMagneting ? '3px' : '2px',
                  transform: `translateX(-50%) skewX(-10deg) scaleX(${isMagneting ? 1.1 : 1})`,
                  boxShadow: isMagneting 
                    ? '0 0 20px rgba(34, 197, 94, 0.9), 0 0 40px rgba(34, 197, 94, 0.6)' 
                    : '0 0 8px rgba(34, 197, 94, 0.6)',
                  transitionDuration: isScrolling ? '150ms' : '300ms',
                }}
              >
                {/* Extending animation when scrolling - left side */}
                {isScrolling && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-green-500 animate-extend-left"
                    style={{
                      width: '50%',
                      transformOrigin: 'right',
                      animation: 'extendLeft 200ms ease-out',
                      boxShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 50px rgba(34, 197, 94, 0.8)',
                    }}
                  />
                )}
                {/* Extending animation when scrolling - right side */}
                {isScrolling && (
                  <div 
                    className="absolute top-0 right-0 h-full bg-green-500 animate-extend-right"
                    style={{
                      width: '50%',
                      transformOrigin: 'left',
                      animation: 'extendRight 200ms ease-out',
                      boxShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 50px rgba(34, 197, 94, 0.8)',
                    }}
                  />
                )}
              </div>

              {/* Magnet pulse effect - only show when magneting */}
              {isMagneting && (
                <>
                  <div 
                    className="absolute -top-1 bg-green-500/30 animate-pulse"
                    style={{
                      width: `${selectedCategoryWidth + 40}px`,
                      left: '50%',
                      height: '6px',
                      transform: 'translateX(-50%) skewX(-10deg)',
                      filter: 'blur(4px)',
                    }}
                  />
                  <div 
                    className="absolute -bottom-1 bg-green-500/30 animate-pulse"
                    style={{
                      width: `${selectedCategoryWidth + 40}px`,
                      left: '50%',
                      height: '6px',
                      transform: 'translateX(-50%) skewX(-10deg)',
                      filter: 'blur(4px)',
                    }}
                  />
                </>
              )}
            </div>

            {/* Right Bracket - Dynamically positioned with magnet effect */}
            <span className="text-green-500 font-bold text-base sm:text-lg transition-all duration-300"
              style={{
                transform: `translateX(${selectedCategoryWidth / 2 + 12}px) scale(${isMagneting ? 1.2 : 1})`,
                textShadow: isMagneting 
                  ? '0 0 20px rgba(34, 197, 94, 0.9), 0 0 30px rgba(34, 197, 94, 0.6)' 
                  : '0 0 10px rgba(34, 197, 94, 0.5)',
              }}
            >
              {'}'}
            </span>
          </div>

          {/* Scrollable categories */}
          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-hide py-3"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              paddingLeft: '50%',
              paddingRight: '50%',
            }}
            onTouchStart={(e) => {
              // Store initial touch position to detect horizontal scroll
              const touch = e.touches[0];
              categoryScrollRef.current?.setAttribute('data-touch-start-x', touch.clientX.toString());
              categoryScrollRef.current?.setAttribute('data-touch-start-y', touch.clientY.toString());
            }}
            onTouchMove={(e) => {
              // Prevent page swipe if scrolling horizontally in category selector
              const touch = e.touches[0];
              const startX = parseFloat(categoryScrollRef.current?.getAttribute('data-touch-start-x') || '0');
              const startY = parseFloat(categoryScrollRef.current?.getAttribute('data-touch-start-y') || '0');

              const deltaX = Math.abs(touch.clientX - startX);
              const deltaY = Math.abs(touch.clientY - startY);

              // If horizontal movement is greater than vertical, block page swipe
              if (deltaX > deltaY && deltaX > 5) {
                e.stopPropagation();
              }
            }}
            onScroll={(e) => {
              const container = e.currentTarget;
              const scrollLeft = container.scrollLeft;
              const containerCenter = container.offsetWidth / 2;

              // Set scrolling state to true when scrolling
              setIsScrolling(true);

              // Clear previous scrolling timeout
              if (scrollingTimeoutRef.current) {
                clearTimeout(scrollingTimeoutRef.current);
              }

              // Reset scrolling state after scrolling stops
              scrollingTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
              }, 150);

              // Clear previous auto-snap timer
              if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }

              // Calculate scroll progress (0 to 1)
              const maxScroll = container.scrollWidth - container.offsetWidth;
              const progress = Math.min(maxScroll > 0 ? scrollLeft / maxScroll : 0, 1);
              setScrollProgress(progress);

              // Find which category is at center (considering 10x loop)
              let closestCategory = gameCategories[0];
              let closestElement: HTMLElement | null = null;
              const totalCategories = gameCategories.length * 10; // 10x loop
              let minDistance = Infinity;

              for (let i = 0; i < totalCategories; i++) {
                const categoryElement = container.children[i] as HTMLElement;
                if (categoryElement) {
                  const categoryCenter = categoryElement.offsetLeft + categoryElement.offsetWidth / 2 - scrollLeft;
                  const distance = Math.abs(categoryCenter - containerCenter);

                  if (distance < minDistance) {
                    minDistance = distance;
                    closestElement = categoryElement;
                    // Get actual category from looped index
                    closestCategory = gameCategories[i % gameCategories.length];
                  }
                }
              }

              // Update center category, selected category, and width
              if (closestCategory.id !== centerCategoryId) {
                setCenterCategoryId(closestCategory.id);
                setSelectedCategory(closestCategory.id);

                // Measure the width of the selected category element
                if (closestElement) {
                  const textWidth = closestElement.offsetWidth;
                  setSelectedCategoryWidth(textWidth);
                }

                playFeedback();
              }

              // Set timer for auto-snap to center after 0.5 seconds idle
              scrollTimeoutRef.current = setTimeout(() => {
                snapToCenter();
              }, 500);
            }}
          >
            {/* Infinite loop: Repeat categories 10 times */}
            {Array.from({ length: 10 }).flatMap((_, loopIndex) => 
              gameCategories.map((category, catIndex) => {
                const isCenter = centerCategoryId === category.id;
                const uniqueKey = `${category.id}-loop-${loopIndex}`;

                return (
                  <button
                    key={uniqueKey}
                    onClick={() => {
                      // Scroll this category to center
                      if (categoryScrollRef.current) {
                        const elementIndex = loopIndex * gameCategories.length + catIndex;
                        const categoryElement = categoryScrollRef.current.children[elementIndex] as HTMLElement;
                        if (categoryElement) {
                          const scrollLeft = categoryElement.offsetLeft - (categoryScrollRef.current.offsetWidth / 2) + (categoryElement.offsetWidth / 2);
                          categoryScrollRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                        }
                      }
                    }}
                    className="relative px-3 sm:px-4 py-1 transition-all duration-300 ease-out whitespace-nowrap flex-shrink-0"
                    style={{
                      fontFamily: isCenter ? '"Open Sans", sans-serif' : 'inherit',
                      fontSize: isCenter ? '1rem' : '0.875rem',
                      fontWeight: isCenter ? 800 : 600,
                      color: isCenter ? '#ffffff' : 'rgba(156, 163, 175, 0.8)',
                      letterSpacing: isCenter ? '-0.02em' : 'normal',
                      transform: `scale(${isCenter ? 1.2 : 0.9}) skewX(${isCenter ? '-3deg' : '0deg'})`,
                      opacity: isCenter ? 1 : 0.6,
                    }}
                    data-testid={`category-${category.id}-${loopIndex}`}
                  >
                    {category.label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Account Type Label & Filter Toggle */}
        <div className="flex items-center justify-between gap-2 px-2 sm:px-4 pb-2">
          {/* Account Type Information */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {getAccountTypeLabel()}
            </h2>
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1 sm:p-2 transition-all duration-200 flex-shrink-0"
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className={`h-4 w-4 sm:h-5 sm:w-5 ${
              showFilters ? "text-green-500" : "text-gray-400/80 hover:text-gray-300"
            }`} />
          </button>
        </div>

        {/* Expandable Sort Options */}
        {showFilters && (
          <div className="border-t border-white/10 pt-1.5 sm:pt-3 mt-1 sm:mt-2">
            <p className="text-gray-400 text-[10px] sm:text-xs mb-1 sm:mb-2">Urutkan berdasarkan:</p>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setSortBy("newest")}
                className={`relative px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                  sortBy === "newest" 
                    ? "text-white" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
                data-testid="sort-newest"
              >
                <span className="relative z-10">Terbaru</span>
                {sortBy === "newest" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setSortBy("price_low")}
                className={`relative px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                  sortBy === "price_low" 
                    ? "text-white" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
                data-testid="sort-price-low"
              >
                <span className="relative z-10">Harga Terendah</span>
                {sortBy === "price_low" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setSortBy("price_high")}
                className={`relative px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                  sortBy === "price_high" 
                    ? "text-white" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
                data-testid="sort-price-high"
              >
                <span className="relative z-10">Harga Tertinggi</span>
                {sortBy === "price_high" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setSortBy("rating")}
                className={`relative px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                  sortBy === "rating" 
                    ? "text-white" 
                    : "text-gray-400 hover:text-gray-200"
                }`}
                data-testid="sort-rating"
              >
                <span className="relative z-10">Seller Famous</span>
                {sortBy === "rating" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] sm:h-0.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {/* Product count info with dynamic description */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            {getProductCountText()}
          </p>
        </div>

        {/* Products Grid - Responsive layout: 4 cols (mobile), 3 cols (sm), 4 cols (tablet), 5 cols (desktop) */}
        {isLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3 md:gap-3">
            {Array.from({ length: 20 }).map((_, index) => (
              <Card key={index} className="w-full bg-gradient-to-br from-nxe-card to-nxe-surface/50 border border-white/10 overflow-hidden">
                <div className="aspect-[1/1] sm:aspect-[3/4] bg-gradient-to-br from-gray-600 to-gray-700 animate-pulse" />
                <div className="p-1 sm:p-2 space-y-0.5 sm:space-y-1">
                  <div className="h-2.5 sm:h-3.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded animate-pulse" />
                  <div className="h-2 sm:h-2.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded animate-pulse w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-2">Tidak ada produk ditemukan</div>
            <p className="text-gray-500 text-sm">Coba ubah kata kunci pencarian Anda</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-3 lg:gap-4">
            {filteredProducts.map((product) => {
              const selected = isSelected(product.id);
              
              return (
              <div
                key={product.id}
                className="relative"
                onClick={() => handleProductClick(product.id)}
                data-testid={`card-product-${product.id}`}
              >
                {/* Premium Selection Border with Elegant Glow */}
                {selected && (
                  <>
                    {/* Outer Glow Layer */}
                    <div 
                      className="absolute -inset-[2px] rounded-sm pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669, #047857)',
                        opacity: 0.6,
                        animation: 'pulse-glow 1.5s ease-in-out infinite',
                        willChange: 'opacity, transform',
                      }}
                    />
                    
                    {/* Inner Border Layer */}
                    <div 
                      className="absolute -inset-[1px] rounded-sm pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
                        animation: 'border-shimmer 3s linear infinite',
                        backgroundSize: '200% 200%',
                        willChange: 'background-position',
                      }}
                    />
                    
                    {/* Accent Corner Highlights */}
                    <div 
                      className="absolute top-0 left-0 w-3 h-3 rounded-tl-sm pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, #6ee7b7, transparent)',
                        animation: 'fade-in-out 2s ease-in-out infinite',
                      }}
                    />
                    <div 
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-br-sm pointer-events-none"
                      style={{
                        background: 'linear-gradient(315deg, #6ee7b7, transparent)',
                        animation: 'fade-in-out 2s ease-in-out infinite 1s',
                      }}
                    />
                  </>
                )}
              
              <div
                className={`relative bg-nxe-surface border ${selected ? 'border-transparent' : 'border-nxe-border hover:border-nxe-primary/70'} transition-all duration-300 cursor-pointer overflow-hidden rounded-sm ${selected ? 'scale-[1.03] shadow-2xl shadow-emerald-500/20' : 'hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'} group`}
                style={{
                  willChange: selected ? 'transform' : 'auto',
                }}
              >
                {/* Product Image - Full Width */}
                <div className="relative aspect-[1/1] sm:aspect-[3/4] md:aspect-[1/1] w-full">
                  <LazyImage
                    src={product.thumbnail || `https://images.unsplash.com/photo-${1400 + product.id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300`}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  {product.isPremium && (
                    <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-yellow-600/90 backdrop-blur-sm text-white text-[8px] sm:text-[10px] px-0.5 py-0.5 sm:px-1.5 sm:py-0.5 rounded-sm sm:rounded">
                      ⭐
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-1 sm:p-2.5">
                  <h3 className={`font-medium mb-0.5 sm:mb-1 line-clamp-1 text-[9px] sm:text-[11px] md:text-xs leading-tight overflow-hidden transition-colors duration-300 ${selected ? 'text-emerald-300' : 'text-white'}`}>
                    {product.title}
                  </h3>

                  {/* Description */}
                  <div className={`text-[7px] sm:text-[10px] truncate leading-tight mb-0.5 sm:mb-1 overflow-hidden transition-colors duration-300 ${selected ? 'text-emerald-200/70' : 'text-gray-400'}`}>
                    {product.description}
                  </div>

                  {/* Price & View Count */}
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-0.5">
                    <span className={`text-[8px] sm:text-xs font-bold truncate transition-colors duration-300 ${selected ? 'text-emerald-400' : 'text-nxe-primary'}`}>
                      {formatIDR(product.price)}
                    </span>
                    <div className="flex items-center gap-0.5 text-nxe-text shrink-0">
                      <Eye className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5" />
                      <span className="text-[7px] sm:text-[10px]">{product.viewCount || 0}</span>
                    </div>
                  </div>

                  {/* Seller Info with Rating */}
                  <div className="flex items-center justify-between text-[7px] sm:text-[10px] gap-0.5">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
                      <span className="text-nxe-text truncate">@{product.seller?.username || 'Unknown'}</span>
                      {product.seller?.isVerified && (
                        <span className="text-blue-500 shrink-0 text-[8px]">✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {product.seller?.sellerReviewCount && product.seller.sellerReviewCount > 0 ? (
                        <>
                          <Star className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 text-yellow-500 fill-current" />
                          <span className="text-white">{Number(product.seller.sellerRating).toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-nxe-primary font-semibold text-[7px] sm:text-[10px]">New</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
      </div>
      
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.01);
          }
        }
        
        @keyframes border-shimmer {
          0% { 
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% { 
            background-position: 0% 50%;
          }
        }
        
        @keyframes fade-in-out {
          0%, 100% { 
            opacity: 0.3;
          }
          50% { 
            opacity: 0.8;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </PageTransition>
  );
}