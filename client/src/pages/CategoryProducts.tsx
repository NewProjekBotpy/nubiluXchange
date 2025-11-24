import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Filter,
  SortAsc,
  Star,
  Eye,
  Clock,
  Crown,
  Target,
  Gamepad2,
  Sword
} from "lucide-react";
import { useLocation } from "wouter";
import { Loading, LoadingSkeleton } from "@/components/ui/loading";
import { formatIDR } from "@/lib/utils";

interface Product {
  id: number;
  title: string;
  price: string;
  thumbnail: string;
  rating: number;
  reviewCount: number;
  category: string;
  isPremium: boolean;
  seller: {
    username: string;
    isVerified: boolean;
  };
  gameData: {
    rank?: string;
    level?: number;
    skins?: number;
  };
  createdAt: string;
}

// Game category info
const categoryInfo = {
  mobile_legends: {
    name: "Mobile Legends",
    icon: Crown,
    color: "bg-blue-600",
    description: "Akun Mobile Legends dengan rank dan skin terbaik"
  },
  pubg_mobile: {
    name: "PUBG Mobile", 
    icon: Target,
    color: "bg-orange-600",
    description: "Account PUBG Mobile tier tinggi dengan outfit premium"
  },
  free_fire: {
    name: "Free Fire",
    icon: Gamepad2, 
    color: "bg-red-600",
    description: "Akun Free Fire dengan diamond dan bundle lengkap"
  },
  valorant: {
    name: "Valorant",
    icon: Sword,
    color: "bg-purple-600", 
    description: "Account Valorant rank tinggi dengan skin collection"
  }
};

export default function CategoryProducts() {
  const [, params] = useRoute("/category/:categoryId");
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState("all");
  
  const categoryId = params?.categoryId || "";
  const category = categoryInfo[categoryId as keyof typeof categoryInfo];

  // Fetch products by category
  const { data: products = [], isLoading } = useQuery({
    queryKey: [`/api/products/category/${categoryId}`, sortBy, priceRange],
    enabled: !!categoryId
  });

  if (!category) {
    return (
      <div className="min-h-screen bg-nxe-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Kategori tidak ditemukan</h2>
          <Button onClick={() => setLocation("/categories")} variant="outline">
            Kembali ke Kategori
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = category.icon;

  // Use centralized money formatting utility
  // (formatPrice function replaced with formatIDR from utils)

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Baru saja';
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari lalu`;
  };

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Header */}
      <div className="p-4 border-b border-nxe-border">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/categories")}
            className="text-nxe-primary hover:bg-nxe-primary/10"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Kembali
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${category.color}`}>
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {category.name}
            </h1>
            <p className="text-nxe-text">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-nxe-border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <SortAsc className="h-4 w-4 text-nxe-primary" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-nxe-surface border-nxe-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-nxe-surface border-nxe-border">
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="price_low">Harga Terendah</SelectItem>
                <SelectItem value="price_high">Harga Tertinggi</SelectItem>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-nxe-primary" />
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-40 bg-nxe-surface border-nxe-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-nxe-surface border-nxe-border">
                <SelectItem value="all">Semua Harga</SelectItem>
                <SelectItem value="under_200k">Di bawah 200k</SelectItem>
                <SelectItem value="200k_500k">200k - 500k</SelectItem>
                <SelectItem value="above_500k">Di atas 500k</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-nxe-surface border-nxe-border" data-testid={`product-skeleton-${i}`}>
                <CardContent className="p-4">
                  <div className="w-full h-48 bg-nxe-card rounded mb-4 flex items-center justify-center">
                    <Loading variant="pulse" />
                  </div>
                  <LoadingSkeleton lines={3} />
                  <div className="flex justify-between items-center mt-3">
                    <LoadingSkeleton lines={1} className="w-20" />
                    <LoadingSkeleton lines={1} className="w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (products as Product[]).length === 0 ? (
          <div className="text-center py-12">
            <IconComponent className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Belum ada produk
            </h3>
            <p className="text-nxe-text mb-4">
              Belum ada produk {category.name} yang tersedia saat ini
            </p>
            <Button 
              onClick={() => setLocation("/upload")}
              className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
            >
              Jual Akun Anda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(products as Product[]).map((product: Product) => (
              <Card
                key={product.id}
                className="bg-nxe-surface border-nxe-border hover:border-nxe-primary/50 transition-all duration-200 cursor-pointer group"
                onClick={() => setLocation(`/product/${product.id}`)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative">
                    <img
                      src={product.thumbnail || `/api/placeholder/300/200?text=${category.name}`}
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {product.isPremium && (
                      <Badge className="absolute top-2 right-2 bg-yellow-600 text-white">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-black/70 text-white text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(product.createdAt)}
                      </Badge>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-nxe-primary transition-colors">
                      {product.title}
                    </h3>
                    
                    {/* Game Data */}
                    {product.gameData && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.gameData.rank && (
                          <Badge variant="outline" className="text-xs">
                            {product.gameData.rank}
                          </Badge>
                        )}
                        {product.gameData.level && (
                          <Badge variant="outline" className="text-xs">
                            Level {product.gameData.level}
                          </Badge>
                        )}
                        {product.gameData.skins && (
                          <Badge variant="outline" className="text-xs">
                            {product.gameData.skins} Skin
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Price & Rating */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-nxe-primary">
                        {formatIDR(product.price)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-white">
                          {product.rating} ({product.reviewCount})
                        </span>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center justify-between text-sm text-nxe-text">
                      <div className="flex items-center space-x-1">
                        <span>@{product.seller?.username || 'Unknown'}</span>
                        {product.seller?.isVerified && (
                          <Badge className="bg-blue-600 text-white text-xs px-1 py-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{Math.floor(Math.random() * 100) + 10} views</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}