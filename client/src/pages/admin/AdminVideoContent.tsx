import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Pin, 
  Trash2, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";
import { formatTikTokNumber } from "@/lib/utils";
import { format } from "date-fns";

interface VideoContentData {
  id: number;
  userId: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  contentType: string;
  musicName: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  isPinned: boolean;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    profilePicture: string;
  };
}

export default function AdminVideoContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "views" | "likes">("createdAt");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch video content
  const { data: videoData, isLoading } = useQuery<{ videos: VideoContentData[], total: number }>({
    queryKey: ['/api/admin/video-content', categoryFilter, sortBy, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('sortBy', sortBy);
      if (search) params.append('search', search);
      
      const response = await apiRequest(`/api/admin/video-content?${params.toString()}`);
      return response;
    }
  });

  // Pin/Unpin mutation (using admin endpoint to bypass ownership check)
  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: number; isPinned: boolean }) => {
      return apiRequest(`/api/admin/video-content/${id}`, {
        method: 'PUT',
        body: { isPinned: !isPinned }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/video-content'] });
      toast({
        title: "Berhasil!",
        description: "Status pin video berhasil diupdate",
      });
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal mengupdate status pin",
        variant: "destructive"
      });
    }
  });

  // Delete mutation (using admin endpoint to bypass ownership check)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/video-content/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/video-content'] });
      toast({
        title: "Berhasil!",
        description: "Video berhasil dihapus",
      });
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal menghapus video",
        variant: "destructive"
      });
    }
  });

  const categories = [
    { value: "all", label: "Semua Kategori" },
    { value: "mobile_legends", label: "Mobile Legends" },
    { value: "pubg_mobile", label: "PUBG Mobile" },
    { value: "free_fire", label: "Free Fire" },
    { value: "valorant", label: "Valorant" },
    { value: "genshin_impact", label: "Genshin Impact" },
    { value: "cod_mobile", label: "Call of Duty Mobile" },
  ];

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Yakin ingin menghapus video "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const videos = videoData?.videos || [];
  const total = videoData?.total || 0;
  
  // Pagination
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(search.toLowerCase()) ||
    video.user.username.toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
  const pinnedCount = videos.filter(v => v.isPinned).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/admin')}
          className="mb-4 text-gray-400 hover:text-white"
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Kembali ke Admin Panel
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent flex items-center" data-testid="text-page-title">
              <Video className="w-8 h-8 mr-3 text-green-500" />
              Kelola Video Content
            </h1>
            <p className="text-gray-400 mt-1">Manage semua video gaming content</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
              <Video className="w-4 h-4 mr-2" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-videos">{total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-views">{formatTikTokNumber(totalViews)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
              <Heart className="w-4 h-4 mr-2" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-likes">{formatTikTokNumber(totalLikes)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
              <Pin className="w-4 h-4 mr-2" />
              Pinned Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-pinned-count">{pinnedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700 mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari video atau username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
                data-testid="input-search"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white" data-testid="select-category">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-white">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white" data-testid="select-sort">
                <TrendingUp className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="createdAt" className="text-white">Terbaru</SelectItem>
                <SelectItem value="views" className="text-white">Paling Banyak Views</SelectItem>
                <SelectItem value="likes" className="text-white">Paling Banyak Likes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Video List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : paginatedVideos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Tidak ada video ditemukan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Video</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Creator</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Category</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Stats</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Date</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-900/30 transition-colors" data-testid={`row-video-${video.id}`}>
                      <td className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                            {video.thumbnailUrl ? (
                              <img 
                                src={video.thumbnailUrl} 
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                            {video.isPinned && (
                              <Pin className="absolute top-1 right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white line-clamp-2 text-sm">{video.title}</div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                              {video.musicName && (
                                <>
                                  <span>🎵 {video.musicName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                            {video.user.profilePicture ? (
                              <img src={video.user.profilePicture} alt={video.user.username} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                {video.user.username[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-white font-medium">{video.user.displayName}</div>
                            <div className="text-xs text-gray-500">@{video.user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {video.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center text-gray-400">
                            <Eye className="w-3 h-3 mr-1" />
                            {formatTikTokNumber(video.views)}
                          </div>
                          <div className="flex items-center text-gray-400">
                            <Heart className="w-3 h-3 mr-1" />
                            {formatTikTokNumber(video.likes)}
                          </div>
                          <div className="flex items-center text-gray-400">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {formatTikTokNumber(video.comments)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-xs text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(new Date(video.createdAt), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => pinMutation.mutate({ id: video.id, isPinned: video.isPinned })}
                            className={`${video.isPinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-white'}`}
                            data-testid={`button-pin-${video.id}`}
                            title={video.isPinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(video.videoUrl, '_blank')}
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`button-view-${video.id}`}
                            title="Lihat Video"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(video.id, video.title)}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`button-delete-${video.id}`}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-gray-900 border-gray-700"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-gray-900 border-gray-700"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
