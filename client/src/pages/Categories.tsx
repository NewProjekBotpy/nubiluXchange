import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Users, 
  TrendingUp, 
  Star,
  Gamepad2,
  Sword,
  Target,
  Crown
} from "lucide-react";
import { useLocation } from "wouter";

// Game categories dengan data yang relevan
const gameCategories = [
  {
    id: "mobile_legends",
    name: "Mobile Legends",
    icon: Crown,
    color: "bg-nxe-primary",
    description: "Akun ML dengan rank tinggi, skin rare, emblem max",
    stats: { products: 145, avgPrice: "250000" }
  },
  {
    id: "pubg_mobile",
    name: "PUBG Mobile",
    icon: Target,
    color: "bg-nxe-accent/80", 
    description: "Account PUBGM dengan UC, outfit premium, tier Conqueror",
    stats: { products: 98, avgPrice: "300000" }
  },
  {
    id: "free_fire",
    name: "Free Fire",
    icon: Gamepad2,
    color: "bg-nxe-primary/70",
    description: "Akun FF dengan diamond, bundle rare, pet evolution",
    stats: { products: 203, avgPrice: "150000" }
  },
  {
    id: "valorant",
    name: "Valorant",
    icon: Sword,
    color: "bg-nxe-accent/60",
    description: "Account Valorant dengan skin bundle, rank Immortal+",
    stats: { products: 67, avgPrice: "500000" }
  },
  {
    id: "genshin_impact",
    name: "Genshin Impact",
    icon: Star,
    color: "bg-nxe-primary/50",
    description: "Account Genshin dengan 5* character, weapon, AR tinggi",
    stats: { products: 89, avgPrice: "400000" }
  },
  {
    id: "call_of_duty",
    name: "Call of Duty Mobile",
    icon: Target,
    color: "bg-nxe-accent/90",
    description: "Account CODM dengan Mythic weapon, Legendary skin",
    stats: { products: 56, avgPrice: "350000" }
  }
];

export default function Categories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Filter categories berdasarkan search
  const filteredCategories = gameCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    setLocation(`/category/${categoryId}`);
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseInt(price));
  };

  return (
    <div className="min-h-screen bg-nxe-dark p-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Kategori Game
        </h1>
        <p className="text-nxe-text">
          Pilih game favorit Anda dan temukan akun dengan harga terbaik
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Cari kategori game..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-nxe-surface border-nxe-border text-white placeholder-gray-400"
          data-testid="input-category-search"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card
              key={category.id}
              className="bg-nxe-surface border-nxe-border hover:border-nxe-primary/50 transition-all duration-200 cursor-pointer group"
              onClick={() => handleCategoryClick(category.id)}
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-nxe-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-nxe-text mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-nxe-primary" />
                      <span className="text-sm text-nxe-text">
                        {category.stats.products} produk
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-nxe-accent" />
                      <span className="text-sm text-nxe-text">
                        Rata-rata {formatPrice(category.stats.avgPrice)}
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-nxe-primary hover:bg-nxe-primary/10 group-hover:bg-nxe-primary group-hover:text-white"
                    data-testid={`button-browse-${category.id}`}
                  >
                    Jelajahi →
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Kategori tidak ditemukan
          </h3>
          <p className="text-nxe-text mb-4">
            Coba ubah kata kunci pencarian Anda
          </p>
          <Button 
            onClick={() => setSearchQuery("")}
            variant="outline"
            className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white"
          >
            Reset Pencarian
          </Button>
        </div>
      )}

      {/* Popular Categories Banner */}
      <div className="mt-8 p-4 bg-gradient-to-r from-nxe-primary/20 to-nxe-accent/20 rounded-lg border border-nxe-primary/30">
        <h3 className="font-semibold text-white mb-2 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-nxe-primary" />
          Kategori Populer Minggu Ini
        </h3>
        <div className="flex flex-wrap gap-2">
          {gameCategories.slice(0, 3).map((category) => (
            <Badge
              key={category.id}
              variant="secondary"
              className="bg-nxe-primary/10 text-nxe-primary hover:bg-nxe-primary hover:text-white cursor-pointer transition-colors"
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}