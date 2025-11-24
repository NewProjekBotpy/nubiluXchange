import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyImage, generateBlurDataURL } from "@/components/ui/lazy-image";
import { type News } from "@shared/schema";

const categoryColors: Record<string, string> = {
  general: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  update: "bg-green-500/20 text-green-400 border-green-500/30",
  event: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  maintenance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { data: newsItem, isLoading, error } = useQuery<News>({
    queryKey: ["/api/news", id],
    enabled: !!id
  });

  // Fetch all news for related news section
  const { data: allNews = [] } = useQuery<News[]>({
    queryKey: ["/api/news/daily"],
    enabled: !!newsItem
  });

  // Get related news (same category, exclude current, limit 3)
  const relatedNews = allNews
    .filter((news) => news.id !== newsItem?.id && news.category === newsItem?.category)
    .slice(0, 3);

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const formatShortDate = (date: Date | string | null) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dateObj);
  };

  const handleBack = () => {
    setLocation('/news');
  };

  const handleNewsClick = (newsId: number) => {
    setLocation(`/news/${newsId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Combine thumbnail and images array
  const allImages = newsItem ? [
    ...(newsItem.thumbnail ? [newsItem.thumbnail] : []),
    ...(newsItem.images || [])
  ] : [];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] via-[#0d1117] to-[#0a0f1e]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-24 bg-gray-800 rounded"></div>
            <div className="h-8 bg-gray-800 rounded"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded"></div>
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] via-[#0d1117] to-[#0a0f1e]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mb-4 text-gray-300 hover:bg-gray-800 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Berita Tidak Ditemukan</h2>
              <p className="text-gray-400">Berita yang Anda cari tidak dapat ditemukan atau telah dihapus.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] via-[#0d1117] to-[#0a0f1e]">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {/* News Article - Futuristic Design */}
        <article className="space-y-6">
          {/* Mobile: no card, just borders. Desktop: Card wrapper */}
          <div className="relative overflow-hidden md:bg-gray-900/50 md:border md:border-gray-800 md:rounded-lg">
            {/* Neon glow effect - desktop only */}
            <div className="absolute inset-0 bg-gradient-to-br from-nxe-primary/5 via-transparent to-cyan-500/5 pointer-events-none hidden md:block" />
            
            <div className="relative">
              {/* Hero image carousel with futuristic navigation */}
              {allImages.length > 0 && (
                <div className="relative w-full h-64 md:h-96 overflow-hidden border-t border-b border-gray-700 md:border-0 group">
                  <LazyImage 
                    src={allImages[currentImageIndex]}
                    alt={newsItem.title}
                    className="w-full h-full object-cover transition-all duration-500"
                    placeholder={generateBlurDataURL('#134D37')}
                    sizes="(max-width: 768px) 100vw, 896px"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                  
                  {/* Badges on image */}
                  <div className="absolute top-4 left-4 flex gap-2 z-10">
                    {newsItem.isPinned && (
                      <Badge className="bg-nxe-primary text-white shadow-lg shadow-nxe-primary/50 text-xs md:text-sm">
                        📌 Pinned
                      </Badge>
                    )}
                    {newsItem.category && (
                      <Badge 
                        className={`border text-xs md:text-sm ${
                          categoryColors[newsItem.category] || categoryColors.general
                        }`}
                      >
                        {newsItem.category.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Futuristic Navigation Controls - Only show if more than 1 image */}
                  {allImages.length > 1 && (
                    <>
                      {/* Previous Button - Left */}
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 bg-gray-900/80 hover:bg-nxe-primary/20 border border-nxe-primary/30 hover:border-nxe-primary/60 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 group/btn opacity-0 group-hover:opacity-100"
                        data-testid="button-prev-image"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-nxe-primary group-hover/btn:text-white transition-colors" />
                      </button>

                      {/* Next Button - Right */}
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 bg-gray-900/80 hover:bg-nxe-primary/20 border border-nxe-primary/30 hover:border-nxe-primary/60 rounded-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 group/btn opacity-0 group-hover:opacity-100"
                        data-testid="button-next-image"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-nxe-primary group-hover/btn:text-white transition-colors" />
                      </button>

                      {/* Dot Indicators - Center Bottom */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-gray-900/80 backdrop-blur-sm border border-nxe-primary/30 rounded-full">
                        {allImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`transition-all duration-300 rounded-full ${
                              index === currentImageIndex
                                ? 'w-8 h-2 bg-nxe-primary shadow-lg shadow-nxe-primary/50'
                                : 'w-2 h-2 bg-gray-500 hover:bg-gray-300'
                            }`}
                            data-testid={`dot-indicator-${index}`}
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Article content */}
              <div className="py-4 md:p-8 space-y-4 md:space-y-6 border-b border-gray-700 md:border-0">
                {/* Title */}
                <h1 
                  className="font-mono text-lg md:text-4xl font-bold text-white leading-tight md:leading-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent"
                  data-testid="text-title"
                >
                  {newsItem.title}
                </h1>

                {/* Meta information with neon accents */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4 pb-4 md:pb-6 border-b border-gray-700 md:border-gray-800">
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <div className="p-1.5 md:p-2 bg-nxe-primary/10 rounded md:rounded-lg border border-nxe-primary/30">
                      <User className="h-3 w-3 md:h-4 md:w-4 text-nxe-primary" />
                    </div>
                    <div className="font-mono">
                      <p className="text-[10px] md:text-xs text-gray-500">Ditulis oleh</p>
                      <p className="text-white font-medium text-xs md:text-sm" data-testid="text-author">{newsItem.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm">
                    <div className="p-1.5 md:p-2 bg-cyan-500/10 rounded md:rounded-lg border border-cyan-500/30">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 text-cyan-400" />
                    </div>
                    <div className="font-mono">
                      <p className="text-[10px] md:text-xs text-gray-500">Dipublikasikan</p>
                      <p className="text-white font-medium text-xs md:text-sm" data-testid="text-date">{formatShortDate(newsItem.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Article content with better typography */}
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="font-mono text-gray-300 leading-relaxed text-xs md:text-lg whitespace-pre-wrap"
                    style={{ lineHeight: '1.6' }}
                    data-testid="text-content"
                  >
                    {newsItem.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related News Section */}
        {relatedNews.length > 0 && (
          <div className="mt-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="h-1 w-12 bg-gradient-to-r from-nxe-primary to-cyan-500 rounded-full"></span>
                Berita Terkait
              </h2>
              <p className="text-gray-400 text-sm">
                Artikel lain dalam kategori {newsItem.category}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedNews.map((news) => (
                <Card
                  key={news.id}
                  onClick={() => handleNewsClick(news.id)}
                  className="group cursor-pointer bg-gray-900/50 border-gray-800 hover:border-nxe-primary/50 transition-all duration-300"
                  data-testid={`card-related-news-${news.id}`}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative h-32 overflow-hidden bg-gray-800">
                      {news.thumbnail ? (
                        <LazyImage
                          src={news.thumbnail}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          placeholder={generateBlurDataURL("#134D37")}
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <span className="text-2xl text-gray-700">📰</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-nxe-primary transition-colors">
                        {news.title}
                      </h3>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatShortDate(news.createdAt)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-nxe-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Baca</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
