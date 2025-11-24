import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Flame, TrendingUp } from "lucide-react";
import { type News } from "@shared/schema";

export function TrendingNews() {
  const [, setLocation] = useLocation();
  
  const { data: allNews = [] } = useQuery<News[]>({
    queryKey: ["/api/news/daily"],
  });

  // Get trending news (pinned or recent)
  const trendingNews = allNews
    .filter((news) => news.isPinned || news.isPublished)
    .slice(0, 5);

  if (trendingNews.length === 0) return null;

  const handleNewsClick = (id: number) => {
    setLocation(`/news/${id}`);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-gray-900/50 via-gray-800/50 to-gray-900/50 border-y border-gray-800">
      {/* Neon glow effects */}
      <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-nxe-primary/20 to-transparent blur-xl" />
      <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-cyan-500/20 to-transparent blur-xl" />
      
      <div className="relative flex items-center py-3 px-4">
        {/* Trending Icon */}
        <div className="flex-shrink-0 flex items-center gap-2 mr-4 px-4 py-2 bg-gradient-to-r from-nxe-primary/20 to-cyan-500/20 rounded-lg border border-nxe-primary/30">
          <Flame className="h-4 w-4 text-nxe-primary animate-pulse" />
          <span className="text-sm font-bold text-nxe-primary uppercase tracking-wider">
            Trending
          </span>
          <TrendingUp className="h-3 w-3 text-cyan-400" />
        </div>

        {/* Scrolling News Marquee */}
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-marquee hover:pause-animation">
            {/* Duplicate items for seamless loop */}
            {[...trendingNews, ...trendingNews].map((news, index) => (
              <div
                key={`${news.id}-${index}`}
                onClick={() => handleNewsClick(news.id)}
                className="flex-shrink-0 mx-4 cursor-pointer group"
                data-testid={`trending-news-${news.id}-${index}`}
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-nxe-primary/50 transition-all duration-300 group-hover:bg-gray-800/50">
                  {news.isPinned && (
                    <span className="text-xs">📌</span>
                  )}
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors whitespace-nowrap">
                    {news.title}
                  </span>
                  {news.category && (
                    <span className="text-xs px-2 py-0.5 bg-nxe-primary/20 text-nxe-primary rounded border border-nxe-primary/30">
                      {news.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated border glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nxe-primary/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
    </div>
  );
}
