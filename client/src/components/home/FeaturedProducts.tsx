import { useState } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LazyImage, generateBlurDataURL } from "@/components/ui/lazy-image";
import { type News } from "@shared/schema";

export default function FeaturedProducts() {
  const [, setLocation] = useLocation();
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null);
  
  const { data: newsItems = [], isLoading, error } = useQuery<News[]>({
    queryKey: ["/api/news/daily"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const handleNewsClick = (newsId: number) => {
    setSelectedNewsId(newsId);
    setTimeout(() => {
      setLocation(`/news/${newsId}`);
    }, 300); // Delay untuk menampilkan efek divider sebelum navigate
  };

  const handleViewAll = () => {
    setLocation('/news');
  };

  // Show only top 4 news items for preview
  const previewNews = newsItems.slice(0, 4);

  return (
    <section className="px-4 py-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-nxe-primary to-cyan-500 rounded-full"></span>
            Gaming News
          </h2>
          <p className="text-xs text-gray-500 ml-3">Berita terbaru gaming</p>
        </div>
        
        {newsItems.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-nxe-primary hover:text-nxe-primary hover:bg-nxe-primary/10 text-xs group"
            data-testid="button-view-all-news"
          >
            Lihat Semua
            <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>
      
      <div className="space-y-0">
        {previewNews.map((news, index) => {
          const isSelected = selectedNewsId === news.id;
          
          return (
            <div key={news.id} style={{ contain: 'layout style paint' }}>
              <Card 
                className={`${news.isPinned ? 'animate-pulse-glow' : ''} cursor-pointer transition-colors duration-200 group overflow-hidden border-0 rounded-none bg-transparent`}
                data-testid={`news-card-${news.id}`}
                onClick={() => handleNewsClick(news.id)}
              >
                <CardContent className="p-0 relative h-16 overflow-hidden">
                  {/* Background Image */}
                  <div className="absolute inset-0" style={{ willChange: 'transform' }}>
                    <LazyImage 
                      src={news.thumbnail || 'https://via.placeholder.com/300x300/134D37/ffffff?text=NXE+News'}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                      placeholder={generateBlurDataURL('#134D37')}
                      sizes="400px"
                    />
                  </div>
                  
                  {/* Simplified Gradient Overlay - dikurangi dari 2 layer menjadi 1 */}
                  <div className={`absolute inset-0 transition-colors duration-200 ${isSelected ? 'bg-gradient-to-r from-nxe-primary/90 via-nxe-primary/60 to-transparent' : 'bg-gradient-to-r from-black/90 via-black/70 to-transparent group-hover:from-nxe-primary/80 group-hover:via-nxe-primary/50'}`}></div>
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-between p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-white font-semibold text-xs leading-tight line-clamp-2 transition-colors duration-200 drop-shadow-lg flex-1 ${isSelected ? 'text-cyan-300' : 'group-hover:text-cyan-300'}`}>
                        {news.title}
                      </h3>
                      
                      {news.isPinned && (
                        <Badge className="bg-nxe-primary/90 text-white text-[10px] px-1.5 py-0.5 shadow-lg shadow-nxe-primary/50 flex-shrink-0 rounded">
                          📌
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-300 flex-shrink-0" />
                        <span className="text-gray-300 text-[10px] drop-shadow whitespace-nowrap">
                          {formatDate(news.createdAt)}
                        </span>
                      </div>
                      
                      {news.category && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 border-cyan-400/50 text-cyan-400 bg-black/40 rounded whitespace-nowrap"
                        >
                          {news.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Simplified Divider - tanpa blur yang berat */}
              {isSelected && (
                <div className="relative h-[2px] my-2 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nxe-primary/70 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
                </div>
              )}
              
              {/* Default divider - tanpa blur */}
              {!isSelected && index < previewNews.length - 1 && (
                <div className="relative h-[1px] my-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {newsItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Belum ada berita tersedia
        </div>
      )}
    </section>
  );
}
