import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Pin,
  PinOff,
  Calendar,
  User,
  Tag,
  ImageIcon,
  Video,
  MessageSquare,
  ShoppingBag,
  BookOpen,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Star,
  Flag,
  ArrowLeft,
  Upload,
  Download,
  BarChart3,
  Activity,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import ResponsiveDataList, { DataListItem } from "@/components/admin/ResponsiveDataList";

// Form schemas
const newsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().default("Admin"),
  category: z.enum(["general", "update", "event", "maintenance"]),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  thumbnail: z.string().optional(),
});

const productModerationSchema = z.object({
  status: z.enum(["active", "suspended", "under_review"]),
  moderationNote: z.string().optional(),
});

const statusModerationSchema = z.object({
  isPublic: z.boolean(),
  moderationNote: z.string().optional(),
});

type NewsForm = z.infer<typeof newsSchema>;
type ProductModerationForm = z.infer<typeof productModerationSchema>;
type StatusModerationForm = z.infer<typeof statusModerationSchema>;

interface ContentStats {
  totalNews: number;
  totalProducts: number;
  totalStatusUpdates: number;
  pendingReviews: number;
  flaggedContent: number;
  publishedToday: number;
}

export default function ContentManagement() {
  const { toast } = useToast();
  const queryClientInstance = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isNewsDialogOpen, setIsNewsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);

  // Pull to refresh
  usePullToRefresh({
    onRefresh: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "content"] });
    }
  });

  // Content statistics
  const { data: contentStats, isLoading: loadingStats } = useQuery<ContentStats>({
    queryKey: ["admin", "content", "stats"],
    queryFn: () => apiRequest("/api/admin/content/stats"),
    refetchInterval: 30000,
  });

  // News management queries
  const { data: newsList, isLoading: loadingNews } = useQuery({
    queryKey: ["admin", "content", "news", searchTerm, filterStatus],
    queryFn: () => apiRequest(`/api/admin/content/news?search=${searchTerm}&status=${filterStatus}`),
  });

  // Products management queries
  const { data: productsList, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin", "content", "products", searchTerm, filterStatus],
    queryFn: () => apiRequest(`/api/admin/content/products?search=${searchTerm}&status=${filterStatus}`),
  });

  // Status updates management queries
  const { data: statusList, isLoading: loadingStatus } = useQuery({
    queryKey: ["admin", "content", "status", searchTerm, filterStatus],
    queryFn: () => apiRequest(`/api/admin/content/status?search=${searchTerm}&status=${filterStatus}`),
  });

  // News form
  const newsForm = useForm<NewsForm>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: "",
      content: "",
      author: "Admin",
      category: "general",
      isPinned: false,
      isPublished: true,
    },
  });

  // Mutations
  const createNewsMutation = useMutation({
    mutationFn: (data: NewsForm) => apiRequest("/api/admin/content/news", { method: "POST", body: data as any }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "News article created successfully",
      });
      setIsNewsDialogOpen(false);
      newsForm.reset();
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create news article",
        variant: "destructive",
      });
    },
  });

  const updateNewsMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NewsForm> }) => 
      apiRequest(`/api/admin/content/news/${id}`, { method: "PATCH", body: data as any }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "News article updated successfully",
      });
      setEditingNews(null);
      setIsNewsDialogOpen(false);
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update news article",
        variant: "destructive",
      });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) => 
      apiRequest(`/api/admin/content/${type}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content deleted successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete content",
        variant: "destructive",
      });
    },
  });

  const moderateContentMutation = useMutation({
    mutationFn: ({ type, id, data }: { type: string; id: number; data: any }) => 
      apiRequest(`/api/admin/content/${type}/${id}/moderate`, { method: "PATCH", body: data }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Content moderated successfully",
      });
      queryClientInstance.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to moderate content",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmitNews = (data: NewsForm) => {
    if (editingNews) {
      updateNewsMutation.mutate({ id: editingNews.id, data });
    } else {
      createNewsMutation.mutate(data);
    }
  };

  const handleEditNews = useCallback((news: any) => {
    setEditingNews(news);
    newsForm.reset({
      title: news.title,
      content: news.content,
      author: news.author,
      category: news.category,
      isPinned: news.isPinned,
      isPublished: news.isPublished,
      thumbnail: news.thumbnail,
    });
    setIsNewsDialogOpen(true);
  }, [newsForm]);

  const handleDeleteContent = useCallback((type: string, id: number) => {
    deleteContentMutation.mutate({ type, id });
  }, [deleteContentMutation]);

  const handleTogglePin = useCallback((id: number, isPinned: boolean) => {
    updateNewsMutation.mutate({ id, data: { isPinned: !isPinned } });
  }, [updateNewsMutation]);

  const handleTogglePublish = useCallback((id: number, isPublished: boolean) => {
    updateNewsMutation.mutate({ id, data: { isPublished: !isPublished } });
  }, [updateNewsMutation]);

  // Data list items
  const newsItems: DataListItem[] = useMemo(() => newsList?.map((news: any) => ({
    id: news.id,
    title: news.title,
    subtitle: `By ${news.author} • ${new Date(news.createdAt).toLocaleDateString()}`,
    badge: {
      text: news.isPublished ? "Published" : "Draft",
      variant: news.isPublished ? "default" : "secondary",
    },
    metadata: [
      { label: "Category", value: news.category },
      { label: "Views", value: news.viewCount || 0 },
      { label: "Status", value: news.isPinned ? "Pinned" : "Normal", highlight: news.isPinned },
    ],
    actions: [
      {
        label: "Edit",
        onClick: () => handleEditNews(news),
        icon: Edit,
      },
      {
        label: news.isPinned ? "Unpin" : "Pin",
        onClick: () => handleTogglePin(news.id, news.isPinned),
        icon: news.isPinned ? PinOff : Pin,
      },
      {
        label: news.isPublished ? "Unpublish" : "Publish",
        onClick: () => handleTogglePublish(news.id, news.isPublished),
        icon: news.isPublished ? EyeOff : Eye,
      },
      {
        label: "Delete",
        onClick: () => handleDeleteContent("news", news.id),
        variant: "destructive" as const,
        icon: Trash2,
      },
    ],
  })) || [], [newsList, handleEditNews, handleTogglePin, handleTogglePublish, handleDeleteContent]);

  const productItems: DataListItem[] = useMemo(() => productsList?.map((product: any) => ({
    id: product.id,
    title: product.title,
    subtitle: `${product.category} • Rp ${product.price}`,
    badge: {
      text: product.status,
      variant: product.status === "active" ? "default" : 
               product.status === "suspended" ? "destructive" : "secondary",
    },
    metadata: [
      { label: "Seller", value: product.seller?.username || "Unknown" },
      { label: "Views", value: product.viewCount || 0 },
      { label: "Rating", value: `${product.rating}/5 (${product.reviewCount})` },
    ],
    actions: [
      {
        label: "View",
        onClick: () => window.open(`/product/${product.id}`, "_blank"),
        icon: Eye,
      },
      {
        label: product.status === "active" ? "Suspend" : "Activate",
        onClick: () => moderateContentMutation.mutate({
          type: "products",
          id: product.id,
          data: { status: product.status === "active" ? "suspended" : "active" }
        }),
        variant: product.status === "active" ? "destructive" as const : "default" as const,
        icon: product.status === "active" ? XCircle : CheckCircle,
      },
    ],
  })) || [], [productsList, moderateContentMutation]);

  const statusItems: DataListItem[] = useMemo(() => statusList?.map((status: any) => ({
    id: status.id,
    title: status.content || "Media Status",
    subtitle: `By ${status.user?.username} • ${new Date(status.createdAt).toLocaleDateString()}`,
    badge: {
      text: status.isPublic ? "Public" : "Private",
      variant: status.isPublic ? "default" : "secondary",
    },
    metadata: [
      { label: "Type", value: status.mediaType || "text" },
      { label: "Views", value: status.viewCount || 0 },
      { label: "Comments", value: status.commentCount || 0 },
    ],
    actions: [
      {
        label: "View",
        onClick: () => window.open(`/status/${status.id}`, "_blank"),
        icon: Eye,
      },
      {
        label: status.isPublic ? "Make Private" : "Make Public",
        onClick: () => moderateContentMutation.mutate({
          type: "status",
          id: status.id,
          data: { isPublic: !status.isPublic }
        }),
        icon: status.isPublic ? EyeOff : Eye,
      },
    ],
  })) || [], [statusList, moderateContentMutation]);

  // Stats cards
  const statsCards = [
    {
      title: "Total Content",
      value: (contentStats?.totalNews || 0) + (contentStats?.totalProducts || 0) + (contentStats?.totalStatusUpdates || 0),
      icon: FileText,
      trend: { value: "+12%", isPositive: true },
    },
    {
      title: "Pending Reviews",
      value: contentStats?.pendingReviews || 0,
      icon: Clock,
      trend: { value: "-5%", isPositive: true },
    },
    {
      title: "Flagged Content",
      value: contentStats?.flaggedContent || 0,
      icon: AlertTriangle,
      trend: { value: "+2%", isPositive: false },
    },
    {
      title: "Published Today",
      value: contentStats?.publishedToday || 0,
      icon: TrendingUp,
      trend: { value: "+8%", isPositive: true },
    },
  ];

  return (
    <div className="min-h-screen bg-nxe-dark">
      <AdminNavbar currentTab="content" />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" data-testid="text-page-title">
              Content Management
            </h1>
            <p className="text-gray-400">Manage all platform content from one place</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditingNews(null);
                newsForm.reset();
                setIsNewsDialogOpen(true);
              }}
              className="bg-nxe-primary hover:bg-nxe-primary/90"
              data-testid="button-create-news"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create News
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit bg-nxe-card">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="news" data-testid="tab-news">News</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">Status Updates</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((stat, index) => (
                <Card key={index} className="bg-nxe-card border-nxe-border" data-testid={`card-stat-${index}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        {stat.trend && (
                          <p className={`text-xs ${stat.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.trend.value} from last week
                          </p>
                        )}
                      </div>
                      <stat.icon className="h-8 w-8 text-nxe-accent" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="bg-nxe-card border-nxe-border">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-nxe-border hover:bg-nxe-primary/10"
                    onClick={() => setActiveTab("news")}
                    data-testid="button-manage-news"
                  >
                    <BookOpen className="h-6 w-6" />
                    <span>Manage News</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-nxe-border hover:bg-nxe-primary/10"
                    onClick={() => setActiveTab("products")}
                    data-testid="button-moderate-products"
                  >
                    <ShoppingBag className="h-6 w-6" />
                    <span>Moderate Products</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-nxe-border hover:bg-nxe-primary/10"
                    onClick={() => setActiveTab("status")}
                    data-testid="button-review-status"
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span>Review Status Updates</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search news..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-card border-nxe-border text-white"
                  data-testid="input-search-news"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pinned">Pinned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveDataList
              items={newsItems}
              title="News Articles"
              searchable={false}
              isLoading={loadingNews}
              emptyMessage="No news articles found"
            />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-card border-nxe-border text-white"
                  data-testid="input-search-products"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-filter-product-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveDataList
              items={productItems}
              title="Products"
              searchable={false}
              isLoading={loadingProducts}
              emptyMessage="No products found"
            />
          </TabsContent>

          {/* Status Updates Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search status updates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-nxe-card border-nxe-border text-white"
                  data-testid="input-search-status"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 bg-nxe-card border-nxe-border text-white" data-testid="select-filter-status-visibility">
                  <SelectValue placeholder="Filter by visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ResponsiveDataList
              items={statusItems}
              title="Status Updates"
              searchable={false}
              isLoading={loadingStatus}
              emptyMessage="No status updates found"
            />
          </TabsContent>
        </Tabs>

        {/* Create/Edit News Dialog */}
        <Dialog open={isNewsDialogOpen} onOpenChange={setIsNewsDialogOpen}>
          <DialogContent className="bg-nxe-card border-nxe-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNews ? "Edit News Article" : "Create News Article"}</DialogTitle>
              <DialogDescription>
                {editingNews ? "Update the news article details" : "Create a new news article for the platform"}
              </DialogDescription>
            </DialogHeader>

            <Form {...newsForm}>
              <form onSubmit={newsForm.handleSubmit(onSubmitNews)} className="space-y-4">
                <FormField
                  control={newsForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-nxe-dark border-nxe-border text-white" data-testid="input-news-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={newsForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={6}
                          className="bg-nxe-dark border-nxe-border text-white" 
                          data-testid="textarea-news-content" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={newsForm.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-nxe-dark border-nxe-border text-white" data-testid="input-news-author" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={newsForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-nxe-dark border-nxe-border text-white" data-testid="select-news-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={newsForm.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-nxe-dark border-nxe-border text-white" data-testid="input-news-thumbnail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-6">
                  <FormField
                    control={newsForm.control}
                    name="isPinned"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-news-pinned"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Pin to top</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={newsForm.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-news-published"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Publish immediately</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewsDialogOpen(false)}
                    data-testid="button-cancel-news"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-nxe-primary hover:bg-nxe-primary/90"
                    disabled={createNewsMutation.isPending || updateNewsMutation.isPending}
                    data-testid="button-save-news"
                  >
                    {(createNewsMutation.isPending || updateNewsMutation.isPending) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    )}
                    {editingNews ? "Update" : "Create"} Article
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}