import { useState } from "react";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Product } from "@shared/schema";
import { formatIDR } from "@/lib/utils";
import { LazyImage, generateBlurDataURL } from "@/components/ui/lazy-image";

// Real-time relative time formatter
const getTimeAgo = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return "Baru saja";
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} detik yang lalu`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari yang lalu`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} minggu yang lalu`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} bulan yang lalu`;
};

interface ProductGridProps {
  category?: string;
}

export default function ProductGrid({ category }: ProductGridProps) {
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", { category: category !== "all" ? category : undefined }],
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Disable automatic refetching
  });

  const handleProductClick = (productId: number) => {
    if (selectedProduct === productId) {
      // If already selected, navigate to detail
      setLocation(`/product/${productId}`);
    } else {
      // First click: select the product (single selection)
      setSelectedProduct(productId);
    }
  };

  const isSelected = (productId: number) => selectedProduct === productId;

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">New Product</h2>
        <button 
          className="bg-nxe-surface/40 backdrop-blur-sm border border-nxe-primary/30 text-nxe-accent hover:bg-nxe-primary/20 hover:border-nxe-primary/50 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5"
          data-testid="button-view-all-products"
          onClick={() => setLocation('/all-products')}
        >
          <span>Lihat Semua</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {products.map((product) => {
          const selected = isSelected(product.id);
          
          return (
            <div 
              key={product.id}
              className="relative"
              onClick={() => handleProductClick(product.id)}
              data-testid={`product-card-${product.id}`}
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
              
              {/* Product Card */}
              <div 
                className={`
                  group relative bg-nxe-card rounded-lg overflow-hidden 
                  border ${selected ? 'border-transparent' : 'border-nxe-primary/10 hover:border-nxe-primary/40'}
                  transition-all duration-300 cursor-pointer
                  ${selected ? 'scale-[1.03] shadow-2xl shadow-emerald-500/20' : 'hover:scale-[1.02]'}
                `}
                style={{
                  willChange: selected ? 'transform' : 'auto',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-nxe-primary/0 via-nxe-primary/0 to-nxe-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
                
                <div className="aspect-square overflow-hidden relative">
                  <LazyImage 
                    src={product.thumbnail || '/api/placeholder/300/300'}
                    alt={product.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${selected ? 'scale-110' : 'group-hover:scale-110'}`}
                    placeholder={generateBlurDataURL('#134D37')}
                    sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-nxe-dark/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[10px] text-white font-medium">{getTimeAgo(product.createdAt)}</span>
                  </div>
                </div>
                
                <div className="p-2 relative z-20">
                  <h3 className={`font-semibold text-[11px] mb-0.5 line-clamp-1 transition-colors duration-300 ${selected ? 'text-emerald-300' : 'text-white group-hover:text-nxe-accent'}`}>
                    {product.title}
                  </h3>
                  <p className={`text-[9px] mb-1.5 line-clamp-1 transition-colors duration-300 ${selected ? 'text-emerald-200/70' : 'text-gray-400'}`}>
                    {product.description}
                  </p>
                  
                  <div className={`flex items-center transition-all duration-300 ${selected ? 'justify-between gap-1' : 'justify-start'}`}>
                    <span className={`font-bold transition-all duration-300 ${selected ? 'text-[9px] text-emerald-400' : 'text-[10px] text-nxe-accent'}`}>
                      {formatIDR(product.price)}
                    </span>
                    {selected && (
                      <span className="text-[8px] text-emerald-400/80 font-medium animate-pulse whitespace-nowrap">
                        Klik lagi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
    </section>
  );
}
