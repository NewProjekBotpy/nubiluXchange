import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Calendar, ArrowRight, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LazyImage, generateBlurDataURL } from "@/components/ui/lazy-image";
import { type News } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "all", label: "Semua Kategori" },
  { value: "general", label: "General" },
  { value: "update", label: "Update" },
  { value: "event", label: "Event" },
  { value: "maintenance", label: "Maintenance" },
];

const categoryColors: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  update: "bg-green-500/20 text-green-400 border-green-500/30",
  event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  maintenance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const ITEMS_PER_PAGE = 9; // 3x3 grid on desktop

export default function AllNews() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allNews = [], isLoading } = useQuery<News[]>({
    queryKey: ["/api/news/daily"],
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(dateObj);
  };

  // Filter news based on search and category
  const filteredNews = allNews.filter((news) => {
    const matchesSearch =
      searchQuery === "" ||
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || news.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort by pinned first, then by date
  const sortedNews = [...filteredNews].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const handleNewsClick = (id: number) => {
    setLocation(`/news/${id}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(sortedNews.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNews = sortedNews.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] via-[#0d1117] to-[#0a0f1e]">
      {/* Header with neon glow */}
      <div className="relative overflow-hidden">
        {/* Neon gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-nxe-primary/10 via-cyan-500/10 to-nxe-primary/10 blur-3xl" />
        
        <div className="relative px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 
              className="text-3xl md:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-nxe-primary via-cyan-400 to-nxe-primary bg-clip-text text-transparent"
              data-testid="text-page-title"
            >
              Gaming News Hub
            </h1>
            <p className="text-center text-gray-400 text-sm md:text-base">
              Berita terbaru seputar game, event, dan update marketplace
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        {/* Search and Filters - Futuristic Design */}
        <div className="mb-6 space-y-3">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-nxe-primary/20 to-cyan-500/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
            <div className="relative flex items-center bg-gray-900/80 border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm">
              <Search className="ml-3 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Cari berita..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="mr-2 text-gray-400 hover:text-white"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Toggle Button - Mobile */}
          <div className="md:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800 hover:text-white"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter Kategori
            </Button>
          </div>

          {/* Category Filter */}
          <div className={`${showFilters || 'hidden md:block'}`}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-nxe-primary/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger 
                  className="relative w-full bg-gray-900/80 border-gray-700/50 text-white backdrop-blur-sm hover:bg-gray-800/80 transition-colors"
                  data-testid="select-category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {categories.map((cat) => (
                    <SelectItem 
                      key={cat.value} 
                      value={cat.value}
                      className="text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Menampilkan{" "}
            <span className="text-nxe-primary font-semibold">
              {sortedNews.length}
            </span>{" "}
            berita
          </p>
          {(searchQuery || selectedCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="text-xs text-gray-400 hover:text-white"
              data-testid="button-reset-filters"
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* News Grid - Futuristic Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-800/50 rounded-lg h-80" />
              </div>
            ))}
          </div>
        ) : sortedNews.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-12 text-center">
              <div className="text-gray-500 mb-2">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Tidak Ada Berita
              </h3>
              <p className="text-gray-400 text-sm">
                Tidak ada berita yang sesuai dengan filter Anda
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {paginatedNews.map((news) => (
              <Card
                key={news.id}
                onClick={() => handleNewsClick(news.id)}
                className={`group relative overflow-hidden cursor-pointer bg-gray-900/50 border-gray-800 hover:border-nxe-primary/50 transition-all duration-300 ${
                  news.isPinned ? "ring-2 ring-nxe-primary/30" : ""
                }`}
                data-testid={`card-news-${news.id}`}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-nxe-primary/0 via-nxe-primary/0 to-cyan-500/0 group-hover:from-nxe-primary/10 group-hover:via-cyan-500/5 group-hover:to-nxe-primary/10 transition-all duration-500" />
                
                <CardContent className="p-0 relative">
                  {/* Thumbnail */}
                  <div className="relative h-48 overflow-hidden bg-gray-800">
                    {news.thumbnail ? (
                      <LazyImage
                        src={news.thumbnail}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        placeholder={generateBlurDataURL("#134D37")}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <span className="text-4xl text-gray-700">📰</span>
                      </div>
                    )}
                    
                    {/* Neon overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {news.isPinned && (
                        <Badge className="bg-nxe-primary/90 text-white text-xs font-bold px-2 py-1 shadow-lg shadow-nxe-primary/50">
                          📌 Pinned
                        </Badge>
                      )}
                      {news.category && (
                        <Badge 
                          className={`text-xs font-medium px-2 py-1 border ${
                            categoryColors[news.category] || categoryColors.general
                          }`}
                        >
                          {news.category.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <h3 
                      className="text-lg font-bold text-white line-clamp-2 group-hover:text-nxe-primary transition-colors"
                      data-testid={`text-title-${news.id}`}
                    >
                      {news.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-sm text-gray-400 line-clamp-3">
                      {news.content.substring(0, 120)}...
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(news.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-nxe-primary text-xs font-medium group-hover:gap-2 transition-all">
                        <span>Baca</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nxe-primary to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                </div>
              </Card>
              ))}
            </div>

            {/* Pagination Controls - Futuristic Design */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={
                            currentPage === page
                              ? "bg-nxe-primary text-white hover:bg-nxe-primary/90 min-w-[36px]"
                              : "border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800 hover:text-white min-w-[36px]"
                          }
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-gray-600 px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-gray-700 bg-gray-900/50 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            {totalPages > 1 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
