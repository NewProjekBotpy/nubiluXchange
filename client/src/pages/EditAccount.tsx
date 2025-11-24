import { useState, useRef } from "react";
import { logError } from '@/lib/logger';
import { ChevronRight, Camera, Save, Lock, Key, Monitor, HelpCircle, User, Image, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BolderAvatar } from "@/components/ui/bolder-avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ImageCropper from "@/components/ui/image-cropper";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userUpdateSchema, type UserUpdate } from "@shared/schema";

export default function EditAccount() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadedProfileUrl, setUploadedProfileUrl] = useState<string | null>(null);
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Image cropper states
  const [profileCropper, setProfileCropper] = useState<{ isOpen: boolean; file: File | null }>({ isOpen: false, file: null });
  const [bannerCropper, setBannerCropper] = useState<{ isOpen: boolean; file: File | null }>({ isOpen: false, file: null });

  // Form setup with validation
  const form = useForm<UserUpdate>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      avatarAuraColor: (user?.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple',
      avatarBorderStyle: (user?.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy',
    }
  });

  // Upload profile picture to Cloudinary
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: Blob) => {
      const formData = new FormData();
      formData.append('profilePicture', file, 'profile.jpg');
      
      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update preview to Cloudinary URL instead of base64
      setProfilePreview(data.profilePicture.url);
      setUploadedProfileUrl(data.profilePicture.url);
      toast({
        title: "Foto profil berhasil diupload",
        description: "Jangan lupa klik 'Simpan Perubahan' untuk menyimpan",
      });
    },
    onError: (error: any) => {
      logError('Profile picture upload error', error as Error);
      // Reset preview to previous image on error
      setProfilePreview(null);
      toast({
        title: "Gagal mengupload foto profil",
        description: error.message || "Terjadi kesalahan saat upload",
        variant: "destructive"
      });
    }
  });

  // Upload banner image to Cloudinary
  const uploadBannerMutation = useMutation({
    mutationFn: async (file: Blob) => {
      const formData = new FormData();
      formData.append('bannerImage', file, 'banner.jpg');
      
      const response = await fetch('/api/upload/banner-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update preview to Cloudinary URL instead of base64
      setBannerPreview(data.bannerImage.url);
      setUploadedBannerUrl(data.bannerImage.url);
      toast({
        title: "Banner berhasil diupload",
        description: "Jangan lupa klik 'Simpan Perubahan' untuk menyimpan",
      });
    },
    onError: (error: any) => {
      logError('Banner upload error', error as Error);
      // Reset preview to previous image on error
      setBannerPreview(null);
      toast({
        title: "Gagal mengupload banner",
        description: error.message || "Terjadi kesalahan saat upload",
        variant: "destructive"
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UserUpdate) => {
      const payload = { ...updates };
      
      // Add uploaded profile picture URL if changed
      if (uploadedProfileUrl) {
        payload.profilePicture = uploadedProfileUrl;
      }
      
      // Add uploaded banner URL if changed
      if (uploadedBannerUrl) {
        payload.bannerImage = uploadedBannerUrl;
      }
      
      return apiRequest('/api/users/profile', {
        method: 'PUT',
        body: payload
      });
    },
    onSuccess: (updatedUser) => {
      // Update AuthContext with fresh user data
      updateUser(updatedUser);
      
      // Invalidate user profile queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // Reset upload states
      setUploadedProfileUrl(null);
      setUploadedBannerUrl(null);
      setProfilePreview(null);
      setBannerPreview(null);
      
      toast({
        title: "Akun berhasil diperbarui",
        description: "Perubahan telah disimpan dengan aman.",
      });
    },
    onError: (error: any) => {
      logError('Profile update error', error as Error);
      toast({
        title: "Gagal memperbarui akun",
        description: error.message || "Terjadi kesalahan, silakan coba lagi.",
        variant: "destructive"
      });
    }
  });

  const handleProfileImageClick = () => {
    profileInputRef.current?.click();
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for source file
        toast({
          title: "File terlalu besar",
          description: "File gambar harus kurang dari 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Format file tidak valid",
          description: "Silakan pilih file gambar",
          variant: "destructive",
        });
        return;
      }

      // Open profile cropper
      setProfileCropper({ isOpen: true, file });
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleBannerImageClick = () => {
    bannerInputRef.current?.click();
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for source file
        toast({
          title: "File terlalu besar",
          description: "File gambar harus kurang dari 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Format file tidak valid",
          description: "Silakan pilih file gambar",
          variant: "destructive",
        });
        return;
      }

      // Open banner cropper with 4:1 aspect ratio (800:200)
      setBannerCropper({ isOpen: true, file });
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const onSubmit = async (data: UserUpdate) => {
    updateProfileMutation.mutate(data);
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/settings");
    }
  };

  const currentBioLength = form.watch('bio')?.length || 0;

  // Handle cropped images
  const handleProfileCropped = async (croppedImage: string) => {
    // Set preview immediately for UI feedback
    setProfilePreview(croppedImage);
    setProfileCropper({ isOpen: false, file: null });
    
    // Convert base64 to Blob and upload to Cloudinary
    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      await uploadProfilePictureMutation.mutateAsync(blob);
    } catch (error) {
      logError('Error uploading profile picture', error as Error);
    }
  };

  const handleBannerCropped = async (croppedImage: string) => {
    // Set preview immediately for UI feedback
    setBannerPreview(croppedImage);
    setBannerCropper({ isOpen: false, file: null });
    
    // Convert base64 to Blob and upload to Cloudinary
    try {
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      await uploadBannerMutation.mutateAsync(blob);
    } catch (error) {
      logError('Error uploading banner', error as Error);
    }
  };

  const handleProfileCropperClose = () => {
    setProfileCropper({ isOpen: false, file: null });
  };

  const handleBannerCropperClose = () => {
    setBannerCropper({ isOpen: false, file: null });
  };

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handleBackClick}
          className="text-nxe-text hover:text-nxe-primary transition-colors duration-200"
          data-testid="button-back"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </button>
        <h1 className="text-xl font-semibold text-white">Edit Akun</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </div>

      {/* Profile Navigation - TikTok Studio Style */}
      <div className="mb-6">
        <div className="flex items-center justify-center bg-nxe-card/50 backdrop-blur-sm rounded-2xl p-2 border border-nxe-border">
          <div className="flex space-x-0.5 w-full max-w-md">
            {/* Profile Settings - Active */}
            <button
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-gradient-to-r from-nxe-primary to-green-600 shadow-lg transition-all duration-300"
              data-testid="nav-profile-settings"
            >
              <User className="h-5 w-5 text-white mb-1" />
              <span className="text-xs text-white font-medium">Profil</span>
            </button>
            
            {/* Privacy & Security */}
            <button
              onClick={() => setLocation('/settings/privacy')}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl hover:bg-nxe-surface/50 transition-all duration-300 group"
              data-testid="nav-privacy"
            >
              <Lock className="h-5 w-5 text-nxe-text group-hover:text-white mb-1 transition-colors" />
              <span className="text-xs text-nxe-text group-hover:text-white font-medium transition-colors">Privasi</span>
            </button>
            
            {/* Security Settings */}
            <button
              onClick={() => setLocation('/settings/security')}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl hover:bg-nxe-surface/50 transition-all duration-300 group"
              data-testid="nav-security"
            >
              <Key className="h-5 w-5 text-nxe-text group-hover:text-white mb-1 transition-colors" />
              <span className="text-xs text-nxe-text group-hover:text-white font-medium transition-colors">Keamanan</span>
            </button>
            
            {/* Platform Management */}
            <button
              onClick={() => setLocation('/settings/platform')}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl hover:bg-nxe-surface/50 transition-all duration-300 group"
              data-testid="nav-platform"
            >
              <Monitor className="h-5 w-5 text-nxe-text group-hover:text-white mb-1 transition-colors" />
              <span className="text-xs text-nxe-text group-hover:text-white font-medium transition-colors">Platform</span>
            </button>
            
            {/* Help */}
            <button
              onClick={() => setLocation('/help')}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl hover:bg-nxe-surface/50 transition-all duration-300 group"
              data-testid="nav-help"
            >
              <HelpCircle className="h-5 w-5 text-nxe-text group-hover:text-white mb-1 transition-colors" />
              <span className="text-xs text-nxe-text group-hover:text-white font-medium transition-colors">Bantuan</span>
            </button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture Section */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Foto Profil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-nxe-surface">
                  <AvatarImage 
                    src={profilePreview || user?.profilePicture} 
                    alt="Profile"
                  />
                  <AvatarFallback className="text-2xl">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                {uploadProfilePictureMutation.isPending && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleProfileImageClick}
                  disabled={uploadProfilePictureMutation.isPending}
                  className="absolute -bottom-2 -right-2 bg-nxe-primary hover:bg-nxe-primary/90 rounded-full p-2 h-8 w-8 shadow-lg disabled:opacity-50"
                  data-testid="button-edit-profile-picture"
                >
                  <Camera className="h-4 w-4 text-white" />
                </Button>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="hidden"
                data-testid="input-profile-upload"
              />
              <p className="text-nxe-text text-sm text-center">
                {uploadProfilePictureMutation.isPending ? 'Mengupload...' : 'Klik tombol kamera untuk mengubah foto profil'}
              </p>
            </CardContent>
          </Card>

          {/* Banner Image Section */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Banner Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div 
                  className="h-32 w-full bg-nxe-surface/50 rounded-lg border-2 border-dashed border-nxe-border overflow-hidden cursor-pointer hover:border-nxe-primary transition-colors duration-200"
                  onClick={uploadBannerMutation.isPending ? undefined : handleBannerImageClick}
                  style={{
                    backgroundImage: bannerPreview || (user as any)?.bannerImage ? `url(${bannerPreview || (user as any)?.bannerImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                  data-testid="banner-upload-area"
                >
                  {!bannerPreview && !(user as any)?.bannerImage && (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Image className="h-8 w-8 text-nxe-text mb-2" />
                      <p className="text-nxe-text text-sm">Klik untuk mengubah banner</p>
                    </div>
                  )}
                  {(bannerPreview || (user as any)?.bannerImage) && !uploadBannerMutation.isPending && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {uploadBannerMutation.isPending && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                    </div>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageChange}
                  className="hidden"
                  data-testid="input-banner-upload"
                />
              </div>
              <p className="text-nxe-text text-sm">
                {uploadBannerMutation.isPending ? 'Mengupload banner...' : 'Ukuran optimal: 800x200 piksel. Maksimal 500KB.'}
              </p>
            </CardContent>
          </Card>

          {/* Avatar Customization Section */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Kustomisasi Avatar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {/* Avatar Preview */}
                <BolderAvatar
                  src={profilePreview || user?.profilePicture}
                  alt="Preview"
                  fallback={user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  size="lg"
                  auraColor={form.watch('avatarAuraColor') || 'purple'}
                  borderStyle={form.watch('avatarBorderStyle') || 'energy'}
                  className="shadow-xl"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Aura Color Selection */}
                  <FormField
                    control={form.control}
                    name="avatarAuraColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm font-medium">
                          Warna Aura
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-nxe-surface border-nxe-border text-white" data-testid="select-aura-color">
                              <SelectValue placeholder="Pilih warna aura" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-nxe-surface border-nxe-border">
                            <SelectItem value="purple">🟣 Purple</SelectItem>
                            <SelectItem value="green">🟢 Green</SelectItem>
                            <SelectItem value="blue">🔵 Blue</SelectItem>
                            <SelectItem value="orange">🟠 Orange</SelectItem>
                            <SelectItem value="red">🔴 Red</SelectItem>
                            <SelectItem value="pink">🩷 Pink</SelectItem>
                            <SelectItem value="cyan">🩵 Cyan</SelectItem>
                            <SelectItem value="gold">🟡 Gold</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Border Style Selection */}
                  <FormField
                    control={form.control}
                    name="avatarBorderStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm font-medium">
                          Gaya Border
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-nxe-surface border-nxe-border text-white" data-testid="select-border-style">
                              <SelectValue placeholder="Pilih gaya border" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-nxe-surface border-nxe-border">
                            <SelectItem value="energy">⚡ Energy</SelectItem>
                            <SelectItem value="geometric">📐 Geometric</SelectItem>
                            <SelectItem value="neon">✨ Neon</SelectItem>
                            <SelectItem value="crystal">💎 Crystal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-nxe-card border-nxe-surface/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Informasi Pribadi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      Nama Tampilan
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white"
                        placeholder="Masukkan nama tampilan"
                        data-testid="input-display-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label htmlFor="username" className="text-white text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  value={user?.username || ''}
                  disabled
                  className="mt-2 bg-nxe-surface/50 border-nxe-border text-nxe-secondary"
                  data-testid="input-username"
                />
                <p className="text-xs text-nxe-secondary mt-1">Username tidak dapat diubah</p>
              </div>


              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white text-sm font-medium">
                      Bio
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="mt-2 bg-nxe-surface border-nxe-border text-white resize-none"
                        placeholder="Ceritakan sedikit tentang diri Anda..."
                        rows={3}
                        maxLength={150}
                        data-testid="textarea-bio"
                      />
                    </FormControl>
                    <p className="text-xs text-nxe-secondary mt-1">
                      {currentBioLength}/150 karakter
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={
                updateProfileMutation.isPending || 
                uploadProfilePictureMutation.isPending || 
                uploadBannerMutation.isPending
              }
              className="bg-nxe-primary hover:bg-nxe-primary/90 text-white font-medium px-8 py-2 disabled:opacity-50"
              data-testid="button-save-changes"
            >
              {uploadProfilePictureMutation.isPending || uploadBannerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Mengupload...
                </>
              ) : updateProfileMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Image Croppers */}
      <ImageCropper
        isOpen={profileCropper.isOpen}
        onClose={handleProfileCropperClose}
        onCrop={handleProfileCropped}
        imageFile={profileCropper.file}
        aspectRatio={1} // Square for profile picture
        title="Edit Foto Profil"
      />

      <ImageCropper
        isOpen={bannerCropper.isOpen}
        onClose={handleBannerCropperClose}
        onCrop={handleBannerCropped}
        imageFile={bannerCropper.file}
        aspectRatio={4} // 4:1 for banner (800:200)
        title="Edit Banner Profil"
      />
    </div>
  );
}