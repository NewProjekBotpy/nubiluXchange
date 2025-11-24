import { useParams } from "wouter";
import { logDebug } from '@/lib/logger';
import { Edit3, Settings, Star, ShoppingBag, MessageCircle, Shield, Camera, Heart, UserPlus, Sparkles, Repeat2, Lock, Repeat, Bookmark, Headphones, Menu, Eye, Copy, Video, Layers, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, History, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BolderAvatar } from "@/components/ui/bolder-avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Product, Transaction } from "@shared/schema";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  bannerImage?: string;
  avatarAuraColor?: string;
  avatarBorderStyle?: string;
  role: 'buyer' | 'seller';
  isVerified: boolean;
  walletBalance: string;
  createdAt: string;
}

interface Repost {
  id: number;
  userId: number;
  productId?: number;
  statusId?: number;
  comment?: string;
  createdAt: string;
  // Populated data from relations
  product?: Product;
  status?: {
    id: number;
    content: string;
    username: string;
    createdAt: string;
  };
}

interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  category: string;
  details: Record<string, any>;
  createdAt: string;
}

export default function Profile() {
  const { id: profileId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUserId = user?.id || 0;

  // Determine effective profile ID
  const effectiveProfileId = profileId || String(currentUserId);
  const isOwnProfile = parseInt(effectiveProfileId) === currentUserId;
  
  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: [`/api/users/profile/${effectiveProfileId}`],
    enabled: Boolean(effectiveProfileId),
  });

  // Fetch user's products with pagination
  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products`, { sellerId: Number(effectiveProfileId), limit: 12, offset: 0 }],
    enabled: Boolean(effectiveProfileId),
  });

  // Fetch user's reposts
  const { data: reposts = [], isLoading: isRepostsLoading } = useQuery<Repost[]>({
    queryKey: [`/api/reposts/user/${effectiveProfileId}`],
    enabled: Boolean(effectiveProfileId) && !isNaN(Number(effectiveProfileId)),
  });

  // Fetch user's transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions`],
    enabled: Boolean(currentUserId) && isOwnProfile,
  });

  // Fetch user's activity logs
  const { data: activityLogs = [], isLoading: isActivityLogsLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/activity-logs/user/${effectiveProfileId}`],
    enabled: Boolean(effectiveProfileId) && isOwnProfile,
  });


  const handleStartChat = () => {
    // Create a new chat with this user
    setLocation("/chat");
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(parseInt(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Calculate financial statistics
  const calculateFinancials = () => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    
    // Revenue: transactions where user is the seller
    const revenueTransactions = completedTransactions.filter(t => t.sellerId === currentUserId);
    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalCommission = revenueTransactions.reduce((sum, t) => sum + parseFloat(t.commission), 0);
    const netRevenue = totalRevenue - totalCommission;
    
    // Expenses: transactions where user is the buyer
    const expenseTransactions = completedTransactions.filter(t => t.buyerId === currentUserId);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
      totalRevenue,
      totalCommission,
      netRevenue,
      totalExpenses,
      revenueTransactions,
      expenseTransactions,
      totalTransactions: completedTransactions.length,
    };
  };

  const financials = calculateFinancials();

  // Generate chart data for revenue and expenses over time
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // If we have real transactions, aggregate by month
    if (transactions.length > 0) {
      const monthlyData = months.map((month, index) => {
        const monthTransactions = transactions.filter(t => {
          if (!t.createdAt || t.status !== 'completed') return false;
          const txMonth = new Date(t.createdAt).getMonth();
          return txMonth === index;
        });
        
        const revenue = monthTransactions
          .filter(t => t.sellerId === currentUserId)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
          
        const expenses = monthTransactions
          .filter(t => t.buyerId === currentUserId)
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        return {
          month,
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
        };
      });
      
      return monthlyData;
    }
    
    // Placeholder data showing potential/example trends
    return [
      { month: 'Jan', revenue: 0, expenses: 0 },
      { month: 'Feb', revenue: 0, expenses: 0 },
      { month: 'Mar', revenue: 0, expenses: 0 },
      { month: 'Apr', revenue: 0, expenses: 0 },
      { month: 'May', revenue: 0, expenses: 0 },
      { month: 'Jun', revenue: 0, expenses: 0 },
    ];
  };

  const chartData = generateChartData();

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-nxe-dark flex items-center justify-center">
        <div className="text-nxe-text">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="mobile-viewport-fix keyboard-smooth bg-nxe-dark pb-24">
      {/* Profile Header */}
      <div className="relative">
        {/* Banner - Enhanced with dynamic patterns */}
        <div 
          className="h-40 md:h-56 relative overflow-hidden"
          style={{
            backgroundImage: profile.bannerImage ? `url(${profile.bannerImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Dynamic background patterns when no banner image */}
          {!profile.bannerImage && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-green-800" />
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-4 left-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
                <div className="absolute top-12 right-8 w-16 h-16 bg-nxe-primary/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-8 left-12 w-12 h-12 bg-nxe-accent/20 rounded-full blur-md animate-ping" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/3 w-32 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45" />
                <div className="absolute top-1/3 right-1/4 w-24 h-1 bg-gradient-to-r from-transparent via-nxe-primary/30 to-transparent -rotate-45" />
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-nxe-dark/80 via-transparent to-black/20" />
        </div>

        {/* Profile Info - Mobile optimized with extended background */}
        <div className="relative px-4 md:px-6 pb-6 md:pb-8 bg-gradient-to-b from-nxe-dark/80 via-nxe-dark to-nxe-dark">
          <div className="flex flex-col items-center -mt-16 md:-mt-20">
            <div className="relative flex-shrink-0 mb-4">
              <BolderAvatar
                src={profile.profilePicture || `https://images.unsplash.com/photo-${1500 + profile.id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200`}
                alt={profile.username}
                fallback={profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
                size="xl"
                auraColor={(profile?.avatarAuraColor as "purple" | "green" | "blue" | "orange" | "red" | "pink" | "cyan" | "gold") || 'purple'}
                borderStyle={(profile?.avatarBorderStyle as "energy" | "geometric" | "neon" | "crystal") || 'energy'}
                interactive={isOwnProfile}
                onClick={isOwnProfile ? () => setLocation('/edit-account') : undefined}
                onHover={(isHovered) => logDebug('Avatar hovered', { isHovered })}
                className="shadow-2xl"
              />
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/edit-account')}
                  className="absolute -bottom-1 -right-1 bg-nxe-primary hover:bg-nxe-primary/90 rounded-full p-2 h-8 w-8 shadow-lg border-2 border-nxe-dark z-20"
                  data-testid="button-edit-avatar"
                >
                  <Camera className="h-4 w-4 text-white" />
                </Button>
              )}
            </div>

            {/* Centered Profile Information */}
            <div className="text-center w-full max-w-md">
              {/* Name and Verification */}
              <div className="flex items-center justify-center space-x-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  {profile.displayName || profile.username}
                </h1>
                {profile.isVerified && (
                  <div className="relative">
                    <Shield className="h-6 w-6 md:h-7 md:w-7 text-nxe-accent flex-shrink-0 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-nxe-accent/20 rounded-full blur-sm animate-pulse" />
                  </div>
                )}
              </div>
              
              {/* Username */}
              <p className="text-nxe-text mb-4 text-sm md:text-base drop-shadow-sm">@{profile.username}</p>
              
              {/* Role Badge and Join Date */}
              <div className="flex items-center justify-center space-x-3 mb-4 flex-wrap gap-2">
                <Badge 
                  variant={profile.role === 'seller' ? 'default' : 'secondary'}
                  className={`${profile.role === 'seller' ? 'bg-gradient-to-r from-nxe-primary to-green-600 border-0 shadow-lg' : 'bg-gradient-to-r from-nxe-surface to-nxe-card border-0'} text-xs font-medium px-3 py-1`}
                >
                  {profile.role === 'seller' ? (
                    <><Sparkles className="h-3 w-3 mr-1" /> Seller</>
                  ) : (
                    <><UserPlus className="h-3 w-3 mr-1" /> Buyer</>
                  )}
                </Badge>
                <span className="text-nxe-text text-xs md:text-sm bg-nxe-surface/50 px-3 py-1 rounded-full">
                  Joined {formatDate(profile.createdAt)}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-nxe-text text-sm md:text-base mb-4 leading-relaxed drop-shadow-sm max-w-sm mx-auto">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

            {/* Action buttons - centered */}
            <div className="mt-6 w-full max-w-sm mx-auto px-2">
            {isOwnProfile ? (
              <Button
                onClick={() => setLocation('/edit-account')}
                className="w-full bg-gradient-to-r from-nxe-primary to-green-600 hover:from-nxe-primary/90 hover:to-green-600/90 text-white font-semibold py-3 rounded-2xl shadow-lg border-0 transition-all duration-300 hover:scale-105 active:scale-95"
                data-testid="button-edit-profile"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={handleStartChat}
                  className="flex-1 bg-gradient-to-r from-nxe-primary to-blue-600 hover:from-nxe-primary/90 hover:to-blue-600/90 text-white font-semibold py-3 rounded-2xl shadow-lg border-0 transition-all duration-300 hover:scale-105 active:scale-95"
                  data-testid="button-message-user"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button 
                  className="px-6 py-3 bg-nxe-surface/40 hover:bg-nxe-surface/60 backdrop-blur-sm text-white font-medium rounded-2xl border border-nxe-border shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                  data-testid="button-follow-user"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Follow
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content - Mobile optimized */}
      <div className="px-3 md:px-4 pb-20">
        {isOwnProfile && (
          <Card className="bg-gradient-to-r from-nxe-primary/10 via-green-600/10 to-blue-600/10 border border-nxe-border backdrop-blur-sm shadow-lg mb-6 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-nxe-text font-medium text-sm mb-1">Wallet Balance</p>
                  <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                    {formatCurrency(profile.walletBalance)}
                  </p>
                </div>
                <Button
                  onClick={() => setLocation('/wallet')}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                  data-testid="button-manage-wallet"
                >
                  Manage Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="starred" className="w-full">
          {/* Clean Tab Navigation with green underline */}
          <div className="mb-6">
            <TabsList className="w-full h-auto bg-transparent gap-0 p-0 justify-start">
              <TabsTrigger 
                value="starred" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-starred"
              >
                <ShoppingBag className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Products</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-activity"
              >
                <Video className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Konten</span>
              </TabsTrigger>
              <TabsTrigger 
                value="repost" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-repost"
              >
                <Repeat className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Repost</span>
              </TabsTrigger>
              <TabsTrigger 
                value="bookmarks" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-bookmarks"
              >
                <Bookmark className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Saved</span>
              </TabsTrigger>
              <TabsTrigger 
                value="finance" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-finance"
              >
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Finance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex-1 flex flex-col items-center justify-center p-1.5 pb-1 md:p-3 md:pb-2 transition-all duration-300 group border-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-green-700 rounded-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none"
                data-testid="tab-history"
              >
                <History className="h-3.5 w-3.5 md:h-4 md:w-4 text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 mb-0.5 md:mb-1" />
                <span className="text-[10px] md:text-xs text-nxe-text group-hover:text-white group-data-[state=active]:text-green-500 font-medium">Riwayat</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="starred" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            {isProductsLoading ? (
              // Instagram-style loading skeleton
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div key={index} className="aspect-square bg-nxe-surface/50 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-pulse" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-nxe-primary/20 to-green-600/20 rounded-full animate-pulse" />
                  <ShoppingBag className="h-20 w-20 mx-auto text-nxe-primary/60 relative z-10" />
                  <div className="absolute inset-0 bg-nxe-primary/10 rounded-full blur-xl" />
                </div>
                <p className="text-nxe-text text-lg font-medium mb-2">No products listed yet</p>
                <p className="text-nxe-secondary text-sm mb-6">{isOwnProfile ? 'Start selling by listing your first product' : 'This seller hasn\'t listed any products yet'}</p>
                {isOwnProfile && (
                  <Button
                    onClick={() => setLocation('/upload')}
                    className="bg-gradient-to-r from-nxe-primary to-green-600 hover:from-nxe-primary/90 hover:to-green-600/90 text-white font-semibold py-3 px-8 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105"
                    data-testid="button-list-first-product"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    List Your First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="aspect-square relative overflow-hidden cursor-pointer group bg-nxe-surface/30"
                    onClick={() => setLocation(`/product/${product.id}`)}
                    data-testid={`card-product-${product.id}`}
                  >
                    <img
                      src={product.thumbnail || `https://images.unsplash.com/photo-${1400 + product.id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400`}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Multi-photo indicator - Instagram style */}
                    {product.images && product.images.length > 1 && (
                      <div className="absolute top-2 right-2 z-10">
                        <Layers className="h-5 w-5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                      </div>
                    )}

                    {/* Instagram-style hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="text-white text-center px-3">
                        <div className="flex items-center justify-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-white" />
                            <span className="font-semibold text-sm">{product.rating}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-5 w-5" />
                            <span className="font-semibold text-sm">{product.status === 'available' ? 'Available' : 'Sold'}</span>
                          </div>
                        </div>
                        <p className="text-xs font-medium line-clamp-1">{product.title}</p>
                        <p className="text-sm font-bold mt-1">{formatCurrency(product.price)}</p>
                      </div>
                    </div>

                    {/* Status badge - only visible if sold */}
                    {product.status !== 'available' && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-red-500/90 text-white text-xs font-medium backdrop-blur-sm">
                          Sold
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>


          <TabsContent value="activity" className="space-y-4 mt-6">
            <div className="text-center py-12">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-600/20 rounded-full animate-pulse" />
                <Video className="h-16 w-16 mx-auto text-purple-400/60 relative z-10" />
                <div className="absolute inset-0 bg-purple-400/10 rounded-full blur-xl" />
              </div>
              <p className="text-nxe-text text-base font-medium mb-2">Belum ada konten video</p>
              <p className="text-nxe-secondary text-sm">{isOwnProfile ? 'Konten video akan muncul di sini' : 'Pengguna ini belum memiliki konten video'}</p>
            </div>
          </TabsContent>

          <TabsContent value="repost" className="space-y-3 md:space-y-4 mt-4 md:mt-6">
            {isRepostsLoading ? (
              // Instagram-style loading skeleton
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {Array.from({ length: 15 }).map((_, index) => (
                  <div key={index} className="aspect-square bg-nxe-surface/50 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-pulse" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                  </div>
                ))}
              </div>
            ) : reposts.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-600/20 rounded-full animate-pulse" />
                  <Repeat2 className="h-20 w-20 mx-auto text-orange-400/60 relative z-10" />
                  <div className="absolute inset-0 bg-orange-400/10 rounded-full blur-xl" />
                </div>
                <p className="text-nxe-text text-lg font-medium mb-2">Belum ada repost</p>
                <p className="text-nxe-secondary text-sm mb-6">{isOwnProfile ? 'Repost akan muncul disini ketika Anda melakukan repost' : 'Pengguna ini belum melakukan repost apapun'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {reposts.map((repost) => (
                  <div
                    key={repost.id}
                    className="aspect-square relative overflow-hidden cursor-pointer group bg-nxe-surface/30"
                    onClick={() => {
                      if (repost.productId) {
                        setLocation(`/product/${repost.productId}`);
                      }
                    }}
                    data-testid={`card-repost-${repost.id}`}
                  >
                    {repost.product ? (
                      <img
                        src={repost.product.thumbnail || `https://images.unsplash.com/photo-${1400 + repost.product.id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400`}
                        alt={repost.product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : repost.status ? (
                      <div className="w-full h-full bg-gradient-to-br from-nxe-primary/20 to-blue-600/20 flex items-center justify-center">
                        <div className="text-center p-4">
                          <MessageCircle className="h-8 w-8 mx-auto text-white/80 mb-2" />
                          <p className="text-white/80 text-sm font-medium truncate">{repost.status.content}</p>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Multi-photo indicator - Instagram style */}
                    {repost.product?.images && repost.product.images.length > 1 && (
                      <div className="absolute top-2 right-2 z-20">
                        <Layers className="h-5 w-5 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                      </div>
                    )}

                    {/* Repost badge indicator */}
                    <div className="absolute top-2 left-2 z-20">
                      <Repeat2 className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>

                    {/* Instagram-style hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="text-white text-center px-3">
                        {repost.product && (
                          <>
                            <div className="flex items-center justify-center gap-4 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-5 w-5 fill-white" />
                                <span className="font-semibold text-sm">{repost.product.rating}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Repeat2 className="h-5 w-5" />
                                <span className="font-semibold text-sm">Repost</span>
                              </div>
                            </div>
                            <p className="text-xs font-medium line-clamp-1">{repost.product.title}</p>
                            <p className="text-sm font-bold mt-1">{formatCurrency(repost.product.price)}</p>
                          </>
                        )}
                        {repost.status && (
                          <>
                            <Repeat2 className="h-6 w-6 mx-auto mb-2" />
                            <p className="text-xs font-medium line-clamp-2">{repost.status.content}</p>
                          </>
                        )}
                        {repost.comment && (
                          <p className="text-xs italic mt-2 line-clamp-1">"{repost.comment}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-4 mt-6">
            <div className="text-center py-12">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full animate-pulse" />
                <Bookmark className="h-16 w-16 mx-auto text-blue-400/60 relative z-10" />
                <div className="absolute inset-0 bg-blue-400/10 rounded-full blur-xl" />
              </div>
              <p className="text-nxe-text text-base font-medium mb-2">No saved items</p>
              <p className="text-nxe-secondary text-sm">Items you bookmark will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-4 mt-6">
            {!isOwnProfile ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-full animate-pulse" />
                  <Lock className="h-16 w-16 mx-auto text-gray-400/60 relative z-10" />
                  <div className="absolute inset-0 bg-gray-400/10 rounded-full blur-xl" />
                </div>
                <p className="text-nxe-text text-base font-medium mb-2">Private Information</p>
                <p className="text-nxe-secondary text-sm">Financial data is only visible to the account owner</p>
              </div>
            ) : isTransactionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-nxe-surface/50 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-nxe-border rounded w-3/4 mb-2" />
                    <div className="h-3 bg-nxe-border rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chart Section - 2 Cards Horizontal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Revenue Chart Card */}
                  <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/30 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="text-xs font-medium text-green-300">Revenue</CardTitle>
                            <p className="text-lg font-bold text-white mt-0.5">
                              {formatCurrency(financials.totalRevenue.toString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 pt-1">
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="month" 
                              stroke="#6b7280" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis hide={true} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: number) => formatCurrency(value.toString())}
                              labelStyle={{ color: '#9ca3af' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              fill="url(#colorRevenue)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-green-400 font-medium">
                          {financials.revenueTransactions.length} transaksi
                        </span>
                        {financials.netRevenue > 0 && (
                          <span className="text-nxe-secondary">
                            Net: {formatCurrency(financials.netRevenue.toString())}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expenses Chart Card */}
                  <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-700/30 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-orange-500/10 rounded-lg">
                            <TrendingDown className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <CardTitle className="text-xs font-medium text-orange-300">Pengeluaran</CardTitle>
                            <p className="text-lg font-bold text-white mt-0.5">
                              {formatCurrency(financials.totalExpenses.toString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 pt-1">
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <XAxis 
                              dataKey="month" 
                              stroke="#6b7280" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis hide={true} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value: number) => formatCurrency(value.toString())}
                              labelStyle={{ color: '#9ca3af' }}
                            />
                            <Bar 
                              dataKey="expenses" 
                              fill="#f97316" 
                              radius={[4, 4, 0, 0]}
                              opacity={0.8}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-orange-400 font-medium">
                          {financials.expenseTransactions.length} pembelian
                        </span>
                        {financials.totalTransactions === 0 && (
                          <span className="text-nxe-secondary">
                            Belum ada data
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Info Banner */}
                {financials.totalTransactions === 0 && (
                  <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-300 mb-1">Grafik Probabilitas</h4>
                        <p className="text-xs text-nxe-secondary leading-relaxed">
                          Grafik ini menampilkan potensi revenue dan pengeluaran Anda. 
                          Mulai bertransaksi untuk melihat data finansial yang sebenarnya!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                {financials.totalTransactions > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-white">Riwayat Transaksi</h3>
                      <Badge variant="secondary" className="bg-nxe-surface text-nxe-text">
                        {financials.totalTransactions} total
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {transactions
                        .filter(t => t.status === 'completed')
                        .slice(0, 10)
                        .map((transaction) => {
                          const isSeller = transaction.sellerId === currentUserId;
                          return (
                            <div
                              key={transaction.id}
                              className="bg-nxe-surface/50 rounded-lg p-3 border border-nxe-border hover:bg-nxe-surface/70 transition-colors"
                              data-testid={`transaction-${transaction.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isSeller ? (
                                      <TrendingUp className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <TrendingDown className="h-4 w-4 text-orange-500" />
                                    )}
                                    <span className="text-sm font-medium text-white">
                                      {isSeller ? 'Penjualan' : 'Pembelian'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-nxe-secondary mt-1">
                                    {new Date(transaction.createdAt!).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${isSeller ? 'text-green-400' : 'text-orange-400'}`}>
                                    {isSeller ? '+' : '-'}{formatCurrency(transaction.amount)}
                                  </p>
                                  {isSeller && (
                                    <p className="text-xs text-nxe-secondary">
                                      Komisi: {formatCurrency(transaction.commission)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            {!isOwnProfile ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-full animate-pulse" />
                  <Lock className="h-16 w-16 mx-auto text-gray-400/60 relative z-10" />
                  <div className="absolute inset-0 bg-gray-400/10 rounded-full blur-xl" />
                </div>
                <p className="text-nxe-text text-base font-medium mb-2">Private Information</p>
                <p className="text-nxe-secondary text-sm">Activity history is only visible to the account owner</p>
              </div>
            ) : isActivityLogsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="bg-nxe-surface/50 rounded-lg p-3 animate-pulse">
                    <div className="h-3 bg-nxe-border rounded w-3/4 mb-2" />
                    <div className="h-2 bg-nxe-border rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-600/20 rounded-full animate-pulse" />
                  <History className="h-16 w-16 mx-auto text-purple-400/60 relative z-10" />
                  <div className="absolute inset-0 bg-purple-400/10 rounded-full blur-xl" />
                </div>
                <p className="text-nxe-text text-base font-medium mb-2">Belum ada riwayat aktivitas</p>
                <p className="text-nxe-secondary text-sm">Aktivitas Anda akan tercatat di sini</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activityLogs.map((log, index) => {
                  const getActionLabel = (action: string, category: string) => {
                    const labels: Record<string, string> = {
                      'login': 'Masuk ke akun',
                      'logout': 'Keluar dari akun',
                      'posting': 'Membuat postingan',
                      'transaction': 'Melakukan transaksi',
                      'chat': 'Mengirim pesan',
                      'qris_payment': 'Pembayaran QRIS',
                      'product_view': 'Melihat produk',
                      'product_create': 'Membuat produk',
                      'product_update': 'Mengupdate produk',
                      'product_delete': 'Menghapus produk',
                      'profile_update': 'Mengupdate profil',
                      'wallet_topup': 'Top-up wallet',
                      'wallet_withdrawal': 'Penarikan dana',
                    };
                    return labels[action] || action;
                  };

                  const getCategoryColor = (category: string) => {
                    const colors: Record<string, string> = {
                      'user_action': 'text-blue-400',
                      'admin_action': 'text-red-400',
                      'system_action': 'text-gray-400',
                      'ai_action': 'text-purple-400',
                    };
                    return colors[category] || 'text-nxe-text';
                  };

                  const formatTimestamp = (timestamp: string) => {
                    const date = new Date(timestamp);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Baru saja';
                    if (diffMins < 60) return `${diffMins} menit lalu`;
                    if (diffHours < 24) return `${diffHours} jam lalu`;
                    if (diffDays < 7) return `${diffDays} hari lalu`;
                    
                    return date.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                    });
                  };

                  return (
                    <div key={log.id} data-testid={`activity-log-${log.id}`}>
                      <div className="py-3 px-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="p-1.5 bg-nxe-surface/50 rounded-full">
                              <Clock className="h-3.5 w-3.5 text-nxe-secondary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white">
                                {getActionLabel(log.action, log.category)}
                              </p>
                              <span className="text-xs text-nxe-secondary whitespace-nowrap">
                                {formatTimestamp(log.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              <p className={`text-xs font-medium ${getCategoryColor(log.category)}`}>
                                {log.category.replace('_', ' ')}
                              </p>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div className="text-xs text-nxe-secondary space-y-0.5">
                                  {log.details.productId && (
                                    <p>Product ID: {log.details.productId}</p>
                                  )}
                                  {log.details.amount && (
                                    <p>Amount: {formatCurrency(log.details.amount)}</p>
                                  )}
                                  {log.details.status && (
                                    <p>Status: {log.details.status}</p>
                                  )}
                                  {log.details.page && (
                                    <p>Halaman: {log.details.page}</p>
                                  )}
                                  {log.details.ipAddress && (
                                    <p>IP: {log.details.ipAddress}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < activityLogs.length - 1 && (
                        <div className="border-b border-nxe-border/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
