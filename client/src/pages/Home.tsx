import { useState } from "react";
import StatusBanner from "@/components/home/StatusBanner";
import AdminQuickAccess from "@/components/home/AdminQuickAccess";
import CategoryFilter from "@/components/home/CategoryFilter";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import ProductGrid from "@/components/home/ProductGrid";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="min-h-screen bg-nxe-dark">
      <StatusBanner />
      <AdminQuickAccess />
      <CategoryFilter 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <FeaturedProducts />
      <ProductGrid category={selectedCategory} />
    </div>
  );
}
