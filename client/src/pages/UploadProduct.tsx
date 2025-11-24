import { useState, useEffect, useRef } from "react";
import { logError } from '@/lib/logger';
import { Upload as UploadIcon, ArrowLeft, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function UploadProduct() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: ''
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const filePreviewURLsRef = useRef<Map<File, string>>(new Map());

  const categories = [
    { value: "mobile_legends", label: "Mobile Legends" },
    { value: "pubg_mobile", label: "PUBG Mobile" },
    { value: "free_fire", label: "Free Fire" },
    { value: "valorant", label: "Valorant" },
    { value: "genshin_impact", label: "Genshin Impact" },
  ];

  // Cleanup all object URLs when component unmounts
  useEffect(() => {
    const urlMap = filePreviewURLsRef.current;
    return () => {
      urlMap.forEach(url => URL.revokeObjectURL(url));
      urlMap.clear();
    };
  }, []);
  
  // Helper function to get or create object URL for a file (memoized)
  const getFilePreviewURL = (file: File): string => {
    const existing = filePreviewURLsRef.current.get(file);
    if (existing) {
      return existing;
    }
    const url = URL.createObjectURL(file);
    filePreviewURLsRef.current.set(file, url);
    return url;
  };
  
  // Helper function to revoke URL for a specific file
  const revokeFilePreviewURL = (file: File) => {
    const url = filePreviewURLsRef.current.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      filePreviewURLsRef.current.delete(file);
    }
  };

  // Handle file selection for multiple images
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > 5) {
      toast({
        title: "Terlalu banyak gambar",
        description: `Maksimal 5 gambar. Saat ini ${selectedFiles.length} terpilih.`,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File terlalu besar",
        description: "Setiap gambar harus di bawah 5MB",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  // Remove selected file
  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    if (fileToRemove) {
      revokeFilePreviewURL(fileToRemove);
    }
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  // Upload images to backend
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await apiRequest('/api/upload/product-images', {
        method: 'POST',
        body: formData
      });
      return response.images.map((img: any) => img.url);
    } catch (error) {
      logError('Upload error', error as Error);
      throw error;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Autentikasi diperlukan",
        description: "Silakan login untuk upload produk",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Gambar diperlukan",
        description: "Pilih minimal satu gambar",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      setIsUploading(true);
      const imageUrls = await uploadImages(selectedFiles);
      setUploadedImages(imageUrls);
      setIsUploading(false);

      const productData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        thumbnail: imageUrls[0],
        images: imageUrls
      };

      await apiRequest('/api/products', {
        method: 'POST',
        body: productData
      });

      toast({
        title: "Produk berhasil diupload!",
        description: "Produk Anda sekarang sudah live di marketplace.",
      });

      setFormData({ title: '', description: '', category: '', price: '' });
      setSelectedFiles([]);
      setUploadedImages([]);
      
      setLocation('/');
    } catch (error: any) {
      logError('Product creation error', error as Error);
      toast({
        title: "Upload gagal",
        description: error.message || "Gagal upload produk. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nxe-dark">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-nxe-dark border-b border-nxe-surface px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="p-2 text-white hover:bg-gray-800" 
            data-testid="button-back"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation('/upload');
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-white truncate" data-testid="text-page-title">Upload Akun Game</h1>
            <p className="text-sm text-gray-400 truncate" data-testid="text-page-description">Post akun game Anda secara gratis</p>
          </div>
        </div>
      </div>

      {/* Mobile Form Content */}
      <div className="px-4 pb-6">
        <div className="space-y-4">
          <form id="product-form" onSubmit={handleProductSubmit} className="space-y-4 pb-20">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white text-sm font-medium">Judul Akun</Label>
              <Input
                id="title"
                placeholder="Misal: Akun ML Epic - 54 Skins"
                className="bg-nxe-surface border-nxe-surface text-white h-12 text-base"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white text-sm font-medium">Kategori Game</Label>
              <Select required value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="bg-nxe-surface border-nxe-surface text-white h-12" data-testid="select-category">
                  <SelectValue placeholder="Pilih game" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-white text-sm font-medium">Harga (IDR)</Label>
              <Input
                id="price"
                type="number"
                placeholder="Misal: 2500000"
                className="bg-nxe-surface border-nxe-surface text-white h-12 text-base"
                required
                min="1"
                step="1"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (Number(value) > 0 && !value.includes('-'))) {
                    handleInputChange('price', value);
                  }
                }}
                data-testid="input-price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white text-sm font-medium">Deskripsi Detail</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail akun, rank, item..."
                className="bg-nxe-surface border-nxe-surface text-white min-h-[120px] text-base resize-none"
                required
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="images" className="text-white text-sm font-medium">Upload Screenshots (Max 5)</Label>
              <div className="relative">
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-images"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-nxe-surface border-nxe-surface text-white border-dashed"
                  onClick={() => document.getElementById('images')?.click()}
                  data-testid="button-upload-images"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {selectedFiles.length > 0 ? `${selectedFiles.length} gambar dipilih` : 'Pilih Gambar Screenshots'}
                </Button>
              </div>

              {/* Image Preview */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative bg-nxe-surface rounded-lg overflow-hidden">
                      <img
                        src={getFilePreviewURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-nxe-dark border-t border-nxe-surface p-4">
              <Button
                type="submit"
                form="product-form"
                disabled={isSubmitting || isUploading || selectedFiles.length === 0}
                className="w-full bg-nxe-primary hover:bg-nxe-primary/80 text-white h-12 text-base font-semibold disabled:opacity-50"
                data-testid="button-submit-product"
              >
                {isUploading ? (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2 animate-spin" />
                    Uploading Gambar...
                  </>
                ) : isSubmitting ? (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2 animate-spin" />
                    Membuat Produk...
                  </>
                ) : (
                  'Posting Akun Gratis'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
