import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loading } from "@/components/ui/loading";
import { 
  Search,
  Filter,
  SortAsc,
  Star,
  Eye,
  Clock,
  Users,
  Home,
  Gamepad2,
  ChevronDown,
  X
} from "lucide-react";
import { useLocation } from "wouter";
import { useSearchHeaderScroll } from "@/hooks/useSearchHeaderScroll";
import { UnifiedNavbar } from "@/components/UnifiedNavbar";
import { PageTransition } from "@/components/PageTransition";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  thumbnail: string;
  viewCount: number;
  category: string;
  isPremium: boolean;
  seller: {
    username: string;
    isVerified: boolean;
    sellerRating: number;
    sellerReviewCount: number;
  };
  gameData: {
    rank?: string;
    level?: number;
    skins?: number;
  };
  createdAt: string;
}

interface SearchFilters {
  category: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  isPremium: string;
}

export default function SearchResults() {
  const [, params] = useRoute("/search");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    category: "all",
    minPrice: "",
    maxPrice: "",
    sortBy: "relevance",
    isPremium: "all"
  });
  const filterSectionRef = useRef<HTMLDivElement>(null);

  // Get search query from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    setSearchQuery(q);
  }, []);

  // Use shared scroll animation hook for consistency with AllProducts page
  useSearchHeaderScroll({ 
    triggerRef: filterSectionRef,
    collapseDistance: 60,
    snapThreshold: 0.4,
    snapDuration: 200
  });

  // Swipe navigation between pages
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeNavigation({
    currentPage: 'cari',
  });

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

  // Fetch search results
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: [
      `/api/products/search?q=${encodeURIComponent(searchQuery)}&category=${filters.category}&minPrice=${filters.minPrice}&maxPrice=${filters.maxPrice}&sortBy=${filters.sortBy}&isPremium=${filters.isPremium}`
    ],
    enabled: !!searchQuery.trim()
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseInt(price));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari lalu`;
  };

  const results = searchResults as Product[];

  return (
    <PageTransition>
      <div 
        className="min-h-screen bg-nxe-dark"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Unified Navbar */}
        <UnifiedNavbar 
        activeTab="cari"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari akun game, rank, skin..."
        showSearchBar={true}
        showFilterButton={false}
        />

        {/* Results Header with "hasil ditemukan" text that moves up */}
        <div 
          className="relative"
          style={{
            transform: 'translateY(calc(var(--scroll-progress, 0) * -48px))', // Move up by 48px (search section height)
            zIndex: 30, // Below navbar
            willChange: 'transform'
          }}
        >
          {searchQuery && (
            <div className="px-4 py-3 bg-nxe-dark border-b border-nxe-border">
              <p className="text-sm text-nxe-text">
                Hasil untuk: <span className="text-white font-medium">"{searchQuery}"</span>
              </p>
            </div>
          )}

          {/* Collapsible Filters for Mobile */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent ref={filterSectionRef} className="bg-nxe-dark border-b border-nxe-border">
              <div className="p-4 space-y-4">
                {/* Primary Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-nxe-text mb-2 block font-medium">Kategori</label>
                    <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                      <SelectTrigger className="bg-nxe-surface border-nxe-border text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-nxe-surface border-nxe-border">
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        <SelectItem value="mobile_legends">Mobile Legends</SelectItem>
                        <SelectItem value="pubg_mobile">PUBG Mobile</SelectItem>
                        <SelectItem value="free_fire">Free Fire</SelectItem>
                        <SelectItem value="valorant">Valorant</SelectItem>
                        <SelectItem value="genshin_impact">Genshin Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-nxe-text mb-2 block font-medium">Urut berdasarkan</label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger className="bg-nxe-surface border-nxe-border text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-nxe-surface border-nxe-border">
                        <SelectItem value="relevance">Relevansi</SelectItem>
                        <SelectItem value="price_low">Harga Terendah</SelectItem>
                        <SelectItem value="price_high">Harga Tertinggi</SelectItem>
                        <SelectItem value="rating">Rating Tertinggi</SelectItem>
                        <SelectItem value="newest">Terbaru</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Range and Premium Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-nxe-text mb-2 block font-medium">Harga Minimum</label>
                    <Input
                      type="number"
                      placeholder="Rp 0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      className="bg-nxe-surface border-nxe-border text-white h-11"
                      data-testid="input-min-price"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-nxe-text mb-2 block font-medium">Harga Maksimum</label>
                    <Input
                      type="number"
                      placeholder="Rp 1.000.000"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      className="bg-nxe-surface border-nxe-border text-white h-11"
                      data-testid="input-max-price"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-nxe-text mb-2 block font-medium">Tipe Akun</label>
                    <Select value={filters.isPremium} onValueChange={(value) => setFilters({...filters, isPremium: value})}>
                      <SelectTrigger className="bg-nxe-surface border-nxe-border text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-nxe-surface border-nxe-border">
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    onClick={() => setFilters({
                      category: "all",
                      minPrice: "",
                      maxPrice: "",
                      sortBy: "relevance",
                      isPremium: "all"
                    })}
                    variant="outline"
                    size="sm"
                    className="border-nxe-border text-nxe-text hover:bg-nxe-surface"
                    data-testid="button-reset-filters"
                  >
                    Reset Filter
                  </Button>
                  
                  <Button 
                    onClick={() => setIsFiltersOpen(false)}
                    size="sm"
                    className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
                    data-testid="button-apply-filters"
                  >
                    Terapkan Filter
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Results */}
        <div className="px-3 sm:px-4 pb-6">
          {!searchQuery.trim() ? (
            <div className="text-center py-16 px-4">
              <div className="max-w-sm mx-auto">
                <Search className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-white mb-3">
                  Mulai pencarian Anda
                </h3>
                <p className="text-nxe-text text-sm leading-relaxed">
                  Masukkan kata kunci untuk mencari akun gaming yang Anda inginkan
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center min-h-96" data-testid="search-results-loading">
              <Loading variant="spinner" />
            </div>
          ) : (
            <div>
              {/* Results Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-1 gap-3">
                <p className="text-white font-medium">
                  Ditemukan <span className="font-bold text-nxe-primary">{results.length}</span> hasil
                </p>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-nxe-primary" />
                  <span className="text-sm text-nxe-text">
                    {results.filter(p => p.seller?.isVerified).length} penjual terverifikasi
                  </span>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="max-w-sm mx-auto">
                    <Gamepad2 className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Tidak ada hasil ditemukan
                    </h3>
                    <p className="text-nxe-text mb-6 text-sm leading-relaxed">
                      Coba ubah kata kunci atau filter pencarian Anda untuk menemukan akun gaming yang diinginkan
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Button 
                        onClick={() => setFilters({
                          category: "all",
                          minPrice: "",
                          maxPrice: "",
                          sortBy: "relevance",
                          isPremium: "all"
                        })}
                        variant="outline"
                        className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white w-full sm:w-auto"
                        data-testid="button-reset-filters-empty"
                      >
                        Reset Filter
                      </Button>
                      <Button 
                        onClick={() => setLocation("/categories")}
                        className="bg-nxe-primary hover:bg-nxe-primary/80 text-white w-full sm:w-auto"
                        data-testid="button-explore-categories"
                      >
                        Jelajahi Kategori
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
                  {results.map((product: Product) => {
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
                            className="absolute -inset-[2px] rounded-lg pointer-events-none"
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669, #047857)',
                              opacity: 0.6,
                              animation: 'pulse-glow 1.5s ease-in-out infinite',
                              willChange: 'opacity, transform',
                            }}
                          />
                          
                          {/* Inner Border Layer */}
                          <div 
                            className="absolute -inset-[1px] rounded-lg pointer-events-none"
                            style={{
                              background: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
                              animation: 'border-shimmer 3s linear infinite',
                              backgroundSize: '200% 200%',
                              willChange: 'background-position',
                            }}
                          />
                          
                          {/* Accent Corner Highlights */}
                          <div 
                            className="absolute top-0 left-0 w-3 h-3 rounded-tl-lg pointer-events-none"
                            style={{
                              background: 'linear-gradient(135deg, #6ee7b7, transparent)',
                              animation: 'fade-in-out 2s ease-in-out infinite',
                            }}
                          />
                          <div 
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-br-lg pointer-events-none"
                            style={{
                              background: 'linear-gradient(315deg, #6ee7b7, transparent)',
                              animation: 'fade-in-out 2s ease-in-out infinite 1s',
                            }}
                          />
                        </>
                      )}
                    
                    <div
                      className={`relative bg-nxe-surface border ${selected ? 'border-transparent' : 'border-nxe-border hover:border-nxe-primary/70'} transition-all duration-300 cursor-pointer overflow-hidden rounded-lg ${selected ? 'scale-[1.03] shadow-2xl shadow-emerald-500/20' : 'hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'} group`}
                      style={{
                        willChange: selected ? 'transform' : 'auto',
                      }}
                    >
                      {/* Product Image - Full Width */}
                      <div className="relative aspect-[4/5] sm:aspect-[3/4] md:aspect-[1/1] w-full">
                        <img
                          src={product.thumbnail || `/api/placeholder/300/200?text=${product.category}`}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {product.isPremium && (
                          <span className="absolute top-1 right-1 bg-yellow-600/90 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded">
                            ⭐
                          </span>
                        )}
                        <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatTimeAgo(product.createdAt)}</span>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-2 sm:p-2.5">
                        <h3 className={`font-medium mb-1 line-clamp-1 text-xs sm:text-[11px] md:text-xs leading-tight transition-colors duration-300 ${selected ? 'text-emerald-300' : 'text-white'}`}>
                          {product.title}
                        </h3>
                        
                        {/* Game Data */}
                        {product.gameData && (product.gameData.rank || product.gameData.level) && (
                          <div className="flex items-center gap-1 mb-1">
                            {product.gameData.rank && (
                              <span className="text-[9px] sm:text-[10px] border border-nxe-border/50 text-nxe-text px-1 py-0.5 rounded leading-tight">
                                {product.gameData.rank}
                              </span>
                            )}
                            {product.gameData.level && (
                              <span className="text-[9px] sm:text-[10px] border border-nxe-border/50 text-nxe-text px-1 py-0.5 rounded leading-tight">
                                Lv{product.gameData.level}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price & View Count */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs sm:text-[11px] md:text-xs font-bold transition-colors duration-300 ${selected ? 'text-emerald-400' : 'text-nxe-primary'}`}>
                            {formatPrice(product.price)}
                          </span>
                          <div className="flex items-center gap-0.5 text-nxe-text">
                            <Eye className="h-2.5 w-2.5" />
                            <span className="text-[9px] sm:text-[10px]">{product.viewCount || 0}</span>
                          </div>
                        </div>

                        {/* Seller Info with Rating */}
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-0.5 min-w-0 flex-1">
                            <span className="text-nxe-text truncate">@{product.seller?.username || 'Unknown'}</span>
                            {product.seller?.isVerified && (
                              <span className="text-blue-500 shrink-0">✓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                            {product.seller?.sellerReviewCount > 0 ? (
                              <>
                                <Star className="h-2.5 w-2.5 text-yellow-500 fill-current" />
                                <span className="text-white">{Number(product.seller.sellerRating).toFixed(1)}</span>
                              </>
                            ) : (
                              <span className="text-nxe-primary font-semibold">New</span>
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