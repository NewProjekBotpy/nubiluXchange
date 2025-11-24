import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, Suspense, lazy, createContext, useContext, ReactNode } from "react";
import { PageLoadingFallback } from "@/components/ui/loading-fallback";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { VideoErrorBoundary } from "@/components/VideoErrorBoundary";

// Layout components
import TopNavbar from "@/components/layout/TopNavbar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import NotificationModal from "@/components/layout/NotificationModal";

// Lazy-loaded pages for better code splitting
const Home = lazy(() => import("@/pages/Home"));
const Video = lazy(() => import("@/pages/Video"));
const Sound = lazy(() => import("@/pages/Sound"));
const Upload = lazy(() => import("@/pages/Upload"));
const UploadProduct = lazy(() => import("@/pages/UploadProduct"));
const UploadPoster = lazy(() => import("@/pages/UploadPoster"));
const UploadVideo = lazy(() => import("@/pages/UploadVideo"));
const UploadStatus = lazy(() => import("@/pages/UploadStatus"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const Settings = lazy(() => import("@/pages/Settings"));
const Chat = lazy(() => import("@/pages/Chat"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const OwnerDashboard = lazy(() => import("@/pages/OwnerDashboard"));
const AIEscrowSystem = lazy(() => import("@/pages/AIEscrowSystem"));
const Auth = lazy(() => import("@/pages/Auth"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Categories = lazy(() => import("@/pages/Categories"));
const CategoryProducts = lazy(() => import("@/pages/CategoryProducts"));
const StatusUpdates = lazy(() => import("@/pages/StatusUpdates"));
const TransactionHistory = lazy(() => import("@/pages/TransactionHistory"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));
const SellerDashboard = lazy(() => import("@/pages/SellerDashboard"));
const Help = lazy(() => import("@/pages/Help"));
const AllProducts = lazy(() => import("@/pages/AllProducts"));
const QRCodePage = lazy(() => import("@/pages/QRCode"));
const EditAccount = lazy(() => import("@/pages/EditAccount"));
const NewsDetail = lazy(() => import("@/pages/NewsDetail"));
const AllNews = lazy(() => import("@/pages/AllNews"));
const AdminTemplates = lazy(() => import("@/pages/AdminTemplates"));
const AdminRules = lazy(() => import("@/pages/AdminRules"));
const AdminBlacklist = lazy(() => import("@/pages/AdminBlacklist"));
const AdminPhoneAlerts = lazy(() => import("@/pages/AdminPhoneAlerts"));
const AdminConnections = lazy(() => import("@/pages/AdminConnections"));

// New compact admin pages
const AdminUsersPage = lazy(() => import("@/pages/admin/Users"));
const AdminFraudPage = lazy(() => import("@/pages/admin/Fraud"));
const AdminActivityPage = lazy(() => import("@/pages/admin/Activity"));
const AdminExportPage = lazy(() => import("@/pages/admin/Export"));
const AdminVideoContent = lazy(() => import("@/pages/admin/AdminVideoContent"));
const ComingSoonFeature = lazy(() => import("@/pages/admin/ComingSoonFeature"));
const LiveInsightsPage = lazy(() => import("@/pages/admin/LiveInsights"));
const SalesDashboardPage = lazy(() => import("@/pages/admin/SalesDashboard"));
const DeviceTrackingPage = lazy(() => import("@/pages/admin/DeviceTracking"));
const UserReportsPage = lazy(() => import("@/pages/admin/UserReports"));
const FileUploadPage = lazy(() => import("@/pages/admin/FileUpload"));

// Lazy-loaded settings pages
const DataStorage = lazy(() => import("@/pages/settings/DataStorage"));
const ChatSettings = lazy(() => import("@/pages/settings/ChatSettings"));
const PaymentManagement = lazy(() => import("@/pages/settings/PaymentManagement"));
const EWalletSettings = lazy(() => import("@/pages/settings/EWalletSettings"));
const Feedback = lazy(() => import("@/pages/settings/Feedback"));
const UserRole = lazy(() => import("@/pages/settings/UserRole"));
const NotificationPreferences = lazy(() => import("@/pages/settings/NotificationPreferences"));
const Privacy = lazy(() => import("@/pages/settings/Privacy"));
const LanguageSettings = lazy(() => import("@/pages/settings/LanguageSettings"));
const ThemeSettings = lazy(() => import("@/pages/settings/ThemeSettings"));
const SecuritySettings = lazy(() => import("@/pages/settings/SecuritySettings"));
const PlatformManagement = lazy(() => import("@/pages/settings/PlatformManagement"));
const UserReporting = lazy(() => import("@/pages/UserReporting"));
const SeasonManagement = lazy(() => import("@/pages/SeasonManagement"));
const AdvancedDataReports = lazy(() => import("@/pages/AdvancedDataReports"));
const ContentManagement = lazy(() => import("@/pages/ContentManagement"));
const PaymentTransactionManagement = lazy(() => import("@/pages/PaymentTransactionManagement"));
const PlatformSettings = lazy(() => import("@/pages/PlatformSettings"));

// Auth components
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/ProtectedRoute";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import { LinkConfirmationProvider } from "@/contexts/LinkConfirmationContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { PageTransitionProvider } from "@/contexts/PageTransitionContext";
import { OfflineIndicators } from "@/components/layout/OfflineIndicators";
import { OfflineSyncStatus } from "@/components/OfflineSyncStatus";
import { AdminPanelProvider } from "@/features/admin";

// Theme context
interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto';
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>("dark");
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>("dark");

  // Function to get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Function to update effective theme based on current theme setting
  const updateEffectiveTheme = (currentTheme: 'light' | 'dark' | 'auto') => {
    const newEffectiveTheme = currentTheme === 'auto' ? getSystemTheme() : currentTheme;
    setEffectiveTheme(newEffectiveTheme);
    document.documentElement.classList.toggle("dark", newEffectiveTheme === "dark");
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as 'light' | 'dark' | 'auto') || "dark";
    setThemeState(savedTheme);
    updateEffectiveTheme(savedTheme);
  }, []);

  // Separate effect to handle system theme changes based on current theme state
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      updateEffectiveTheme('auto');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    updateEffectiveTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = effectiveTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const contextValue: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className={`min-h-screen transition-colors duration-300 ${
        effectiveTheme === 'dark' 
          ? 'bg-nxe-dark text-white' 
          : 'bg-white text-gray-900'
      }`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <RequireAuth requiredRole="admin">
      <AdminPanelProvider>
        <Suspense fallback={<PageLoadingFallback />}>
          {children}
        </Suspense>
      </AdminPanelProvider>
    </RequireAuth>
  );
}

function Router() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [location] = useLocation();

  // Hide TopNavbar on auth pages (login/register), upload/posting page, settings page, QR code page, search page, chat page, all products page, admin panel, owner dashboard, edit account page, video page, sound page, and admin features pages
  const hideTopNavbar = location === '/auth' || location === '/upload' || location.startsWith('/upload/') || location === '/settings' || location.startsWith('/settings/') || location === '/edit-account' || location === '/qrcode' || location.startsWith('/search') || location === '/chat' || location.startsWith('/chat/') || location === '/all-products' || location === '/all-products-v2' || location === '/video' || location === '/konten' || location.startsWith('/sound/') || location === '/admin' || location.startsWith('/admin/') || location === '/owner' || location.startsWith('/owner/');

  return (
    <div className="min-h-screen bg-white dark:bg-nxe-dark text-gray-900 dark:text-white">
      <OfflineIndicators />
      <OfflineSyncStatus />
      {!hideTopNavbar && (
        <TopNavbar 
          onShowNotifications={() => setShowNotifications(true)}
        />
      )}

      <main className={hideTopNavbar ? "min-h-screen md:pr-20" : "pb-20 md:pb-0 md:pr-20 min-h-screen"}>
        <Switch>
          {/* Public routes - Guest dapat akses */}
          <Route path="/">
            <Suspense fallback={<PageLoadingFallback />}>
              <Home />
            </Suspense>
          </Route>
          <Route path="/market">
            <Suspense fallback={<PageLoadingFallback />}>
              <Home />
            </Suspense>
          </Route>
          <Route path="/categories">
            <Suspense fallback={<PageLoadingFallback />}>
              <Categories />
            </Suspense>
          </Route>
          <Route path="/category/:categoryId">
            <Suspense fallback={<PageLoadingFallback />}>
              <CategoryProducts />
            </Suspense>
          </Route>
          <Route path="/search">
            <Suspense fallback={<PageLoadingFallback />}>
              <SearchResults />
            </Suspense>
          </Route>
          <Route path="/all-products">
            <Suspense fallback={<PageLoadingFallback />}>
              <AllProducts />
            </Suspense>
          </Route>
          <Route path="/help">
            <Suspense fallback={<PageLoadingFallback />}>
              <Help />
            </Suspense>
          </Route>
          <Route path="/report">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UserReporting />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/qrcode">
            <RequireAuth>
              <Suspense fallback={<PageLoadingFallback />}>
                <QRCodePage />
              </Suspense>
            </RequireAuth>
          </Route>
          <Route path="/auth">
            <Suspense fallback={<PageLoadingFallback />}>
              <Auth />
            </Suspense>
          </Route>
          <Route path="/unauthorized">
            <Suspense fallback={<PageLoadingFallback />}>
              <Unauthorized />
            </Suspense>
          </Route>
          <Route path="/product/:id">
            <Suspense fallback={<PageLoadingFallback />}>
              <ProductDetail />
            </Suspense>
          </Route>
          <Route path="/news">
            <Suspense fallback={<PageLoadingFallback />}>
              <AllNews />
            </Suspense>
          </Route>
          <Route path="/news/:id">
            <Suspense fallback={<PageLoadingFallback />}>
              <NewsDetail />
            </Suspense>
          </Route>

          {/* Protected routes - Memerlukan login */}
          <Route path="/video">
            <VideoErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <Video />
              </Suspense>
            </VideoErrorBoundary>
          </Route>
          <Route path="/konten">
            <VideoErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <Video />
              </Suspense>
            </VideoErrorBoundary>
          </Route>
          <Route path="/sound/:musicName">
            <VideoErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
                <Sound />
              </Suspense>
            </VideoErrorBoundary>
          </Route>
          <Route path="/upload">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Upload />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/upload/product">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UploadProduct />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/upload/poster">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UploadPoster />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/upload/video">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UploadVideo />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/upload/status">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UploadStatus />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/wallet">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Wallet />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Settings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/edit-account">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <EditAccount />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/chat">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Chat />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/chat/:id">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Chat />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          {/* Public profile route - accessible without login for QR code sharing */}
          <Route path="/profile/:id">
            <Suspense fallback={<PageLoadingFallback />}>
              <Profile />
            </Suspense>
          </Route>
          <Route path="/profile">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Profile />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/notifications">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Notifications />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/status">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <StatusUpdates />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/transactions">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <TransactionHistory />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/seller/dashboard">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <SellerDashboard />
                </Suspense>
              </RequireAuth>
            )}
          </Route>

          {/* Admin routes - Memerlukan role admin atau owner */}
          <Route path="/admin">
            {() => (
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/users">
            {() => (
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/templates">
            {() => (
              <AdminRoute>
                <AdminTemplates />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/rules">
            {() => (
              <AdminRoute>
                <AdminRules />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/blacklist">
            {() => (
              <AdminRoute>
                <AdminBlacklist />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/fraud">
            {() => (
              <AdminRoute>
                <AdminFraudPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/phone-alerts">
            {() => (
              <AdminRoute>
                <AdminPhoneAlerts />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/connections">
            {() => (
              <AdminRoute>
                <AdminConnections />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/export">
            {() => (
              <AdminRoute>
                <AdminExportPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/activity">
            {() => (
              <AdminRoute>
                <AdminActivityPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/video-content">
            {() => (
              <AdminRoute>
                <AdminVideoContent />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/escrow">
            {() => (
              <AdminRoute>
                <AIEscrowSystem />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/seasons">
            {() => (
              <AdminRoute>
                <SeasonManagement />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/reports">
            {() => (
              <AdminRoute>
                <AdvancedDataReports />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/content">
            {() => (
              <AdminRoute>
                <ContentManagement />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/payments">
            {() => (
              <AdminRoute>
                <PaymentTransactionManagement />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/platform-settings">
            {() => (
              <AdminRoute>
                <PlatformSettings />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/features/:featureId">
            {() => (
              <AdminRoute>
                <ComingSoonFeature />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/live-insights">
            {() => (
              <AdminRoute>
                <LiveInsightsPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/sales-dashboard">
            {() => (
              <AdminRoute>
                <SalesDashboardPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/device-tracking">
            {() => (
              <AdminRoute>
                <DeviceTrackingPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/user-reports-system">
            {() => (
              <AdminRoute>
                <UserReportsPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/admin/file-upload">
            {() => (
              <AdminRoute>
                <FileUploadPage />
              </AdminRoute>
            )}
          </Route>
          <Route path="/owner/reports">
            {() => (
              <RequireAuth requiredRole="owner">
                <Suspense fallback={<PageLoadingFallback />}>
                  <AdvancedDataReports />
                </Suspense>
              </RequireAuth>
            )}
          </Route>

          {/* Owner routes - Memerlukan role owner */}
          <Route path="/owner">
            {() => (
              <RequireAuth requiredRole="owner">
                <Suspense fallback={<PageLoadingFallback />}>
                  <OwnerDashboard />
                </Suspense>
              </RequireAuth>
            )}
          </Route>

          <Route path="/settings/user-role">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <UserRole />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/notifications">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <NotificationPreferences />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/privacy">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Privacy />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/theme">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <ThemeSettings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/language">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <LanguageSettings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/data-storage">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <DataStorage />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/chat">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <ChatSettings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/payment-management">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <PaymentManagement />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/ewallet">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <EWalletSettings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/feedback">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Feedback />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/security">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <SecuritySettings />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/settings/platform">
            {() => (
              <RequireAuth>
                <Suspense fallback={<PageLoadingFallback />}>
                  <PlatformManagement />
                </Suspense>
              </RequireAuth>
            )}
          </Route>
          <Route path="/admin/seasons">
            {() => (
              <AdminRoute>
                <SeasonManagement />
              </AdminRoute>
            )}
          </Route>
          <Route>
            <Suspense fallback={<PageLoadingFallback />}>
              <NotFound />
            </Suspense>
          </Route>
        </Switch>
      </main>

      {/* Hide BottomNavigation on admin and owner panels - they have their own navigation */}
      {!(location === '/admin' || location.startsWith('/admin/') || location === '/owner' || location.startsWith('/owner/')) && (
        <BottomNavigation />
      )}

      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineProvider>
          <AuthProvider>
            <ConfirmationProvider>
              <LinkConfirmationProvider>
                <PageTransitionProvider>
                  <TooltipProvider>
                    <ThemeProvider>
                      <Toaster />
                      <Router />
                    </ThemeProvider>
                  </TooltipProvider>
                </PageTransitionProvider>
              </LinkConfirmationProvider>
            </ConfirmationProvider>
          </AuthProvider>
        </OfflineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;