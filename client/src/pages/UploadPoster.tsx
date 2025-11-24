import { useState } from "react";
import { logError } from '@/lib/logger';
import { ArrowLeft, Camera, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function UploadPoster() {
  const [selectedSkins, setSelectedSkins] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [posterData, setPosterData] = useState({
    profileImage: null as File | null
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const sampleSkins = [
    "Alucard - Viscount", "Miya - Moonlight Archer", "Layla - Malefic Gunner",
    "Tigreal - Fallen Guard", "Akai - Panda Warrior", "Franco - Wild Boar",
    "Bane - Count Dracula", "Alice - Blood Moon", "Nana - Wind Fairy",
    "Saber - Regulus", "Gord - Conqueror", "Zilong - Eastern Warrior"
  ];

  const handleSkinToggle = (skin: string) => {
    if (selectedSkins.includes(skin)) {
      setSelectedSkins(selectedSkins.filter(s => s !== skin));
    } else if (selectedSkins.length < 54) {
      setSelectedSkins([...selectedSkins, skin]);
    } else {
      toast({
        title: "Batas maksimum tercapai",
        description: "Anda dapat memilih maksimal 54 skins",
        variant: "destructive",
      });
    }
  };

  const handlePosterGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Autentikasi diperlukan",
        description: "Silakan login untuk generate poster",
        variant: "destructive",
      });
      return;
    }

    if (!posterData.profileImage) {
      toast({
        title: "Gambar profile diperlukan",
        description: "Pilih gambar profile",
        variant: "destructive",
      });
      return;
    }

    if (selectedSkins.length === 0) {
      toast({
        title: "Skin diperlukan",
        description: "Pilih minimal satu skin",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      const imageFormData = new FormData();
      imageFormData.append('images', posterData.profileImage);
      
      const uploadResponse = await apiRequest('/api/upload/product-images', {
        method: 'POST',
        body: imageFormData
      });
      
      const profileImageUrl = uploadResponse.images[0].url;

      await apiRequest('/api/posters/generate', {
        method: 'POST',
        body: {
          profileImage: profileImageUrl,
          skins: selectedSkins,
          paymentMethod: 'wallet'
        }
      });

      toast({
        title: "Poster berhasil digenerate!",
        description: "Poster AI Anda telah dibuat.",
      });

      setPosterData({ profileImage: null });
      setSelectedSkins([]);
      
      setLocation('/');
    } catch (error: any) {
      logError('Poster generation error', error as Error);
      toast({
        title: "Gagal generate",
        description: error.message || "Gagal generate poster. Silakan coba lagi.",
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
            <h1 className="text-lg font-semibold text-white truncate" data-testid="text-page-title">Generate Poster AI</h1>
            <p className="text-sm text-gray-400 truncate" data-testid="text-page-description">Buat poster profesional dengan AI</p>
          </div>
        </div>
      </div>

      {/* Mobile Form Content */}
      <div className="px-4 pb-6">
        <div className="space-y-4">
          <div className="bg-nxe-accent/10 border border-nxe-accent/30 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-nxe-accent" />
              <span className="text-white font-semibold">AI Poster Premium</span>
              <Badge className="bg-nxe-accent text-white">Rp 5,000</Badge>
            </div>
            <p className="text-sm text-gray-300">
              AI akan membuat poster otomatis dari profile dan skin Anda
            </p>
          </div>

          <form id="poster-form" onSubmit={handlePosterGeneration} className="space-y-4 pb-20">
            <div className="space-y-2">
              <Label htmlFor="profile-image" className="text-white text-sm font-medium">Upload Foto Profile</Label>
              <div className="relative">
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPosterData(prev => ({ ...prev, profileImage: file }));
                    e.target.value = '';
                  }}
                  data-testid="input-profile-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-nxe-surface border-nxe-surface text-white border-dashed"
                  onClick={() => document.getElementById('profile-image')?.click()}
                  data-testid="button-upload-profile"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {posterData.profileImage ? `Dipilih: ${posterData.profileImage.name}` : 'Pilih Foto Profile'}
                </Button>
              </div>
              {posterData.profileImage && (
                <div className="text-sm text-gray-400">
                  Size: {(posterData.profileImage.size / 1024 / 1024).toFixed(1)}MB
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">
                Pilih Skins ({selectedSkins.length}/54)
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 bg-nxe-surface rounded-lg" data-testid="grid-skin-selection">
                {sampleSkins.map((skin) => (
                  <Button
                    key={skin}
                    type="button"
                    onClick={() => handleSkinToggle(skin)}
                    variant="outline"
                    className={`text-xs h-10 justify-start truncate w-full min-w-0 !bg-transparent hover:!bg-transparent ${selectedSkins.includes(skin) ? "text-green-700 border-green-700" : ""}`}
                    data-testid={`button-skin-${skin.replace(/\s+/g, '-')}`}
                  >
                    {skin}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-nxe-surface p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Preview Layout Poster</h4>
              <div className="text-gray-400 text-sm space-y-1">
                <p>• Foto profile di bagian atas</p>
                <p>• Skins tersusun dalam grid 9×6</p>
                <p>• Styling professional dengan tema game</p>
                <p>• Output resolusi tinggi (720×1280)</p>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-nxe-dark border-t border-nxe-surface p-4">
              <Button
                type="submit"
                form="poster-form"
                disabled={selectedSkins.length === 0 || !posterData.profileImage}
                className="w-full bg-nxe-accent hover:bg-nxe-accent/80 text-white h-12 text-base font-semibold disabled:opacity-50"
                data-testid="button-submit-poster"
              >
                Generate Poster - Rp 5,000
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
