import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft, Shield, Users, ShoppingBag } from 'lucide-react';
import { TwoFactorLogin } from '@/components/auth/TwoFactorLogin';
import { hasAdminAccess } from '@shared/auth-utils';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, verify2FA, updateUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use login function from AuthContext - this updates user state correctly
      const response = await login(loginData.email, loginData.password);

      // Check if 2FA is required
      if ('requiresTwoFactor' in response && response.requiresTwoFactor && response.userId) {
        setPendingUserId(response.userId);
        setShow2FADialog(true);
        toast({
          title: "2FA Required",
          description: "Please enter your two-factor authentication code",
        });
        setIsLoading(false);
        return;
      }

      // Normal login flow (no 2FA) - user state already updated by login()
      const user = 'id' in response ? response : null;
      
      // Check if user is admin or owner to show admin panel option
      const isAdminUser = hasAdminAccess(user);
      
      if (isAdminUser) {
        toast({
          title: "Welcome back, Admin!",
          description: "You have successfully logged in with admin privileges.",
          action: (
            <Button
              size="sm"
              onClick={() => setLocation('/admin')}
              className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
              data-testid="button-go-to-admin"
            >
              Go to Admin Panel
            </Button>
          ),
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }

      // Redirect to intended page or home
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      setLocation(redirectPath);
      
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASuccess = async (user: any) => {
    // User state is already updated by verify2FA() in AuthContext
    // No need to call updateUser() again
    
    // Check if user is admin or owner
    const isAdminUser = hasAdminAccess(user);
    
    if (isAdminUser) {
      toast({
        title: "Welcome back, Admin!",
        description: "2FA verification successful. You have admin privileges.",
        action: (
          <Button
            size="sm"
            onClick={() => setLocation('/admin')}
            className="bg-nxe-primary hover:bg-nxe-primary/80 text-white"
            data-testid="button-go-to-admin"
          >
            Go to Admin Panel
          </Button>
        ),
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "2FA verification successful.",
      });
    }

    // Close 2FA dialog
    setShow2FADialog(false);
    setPendingUserId(null);

    // Redirect to intended page or home
    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
    sessionStorage.removeItem('redirectAfterLogin');
    setLocation(redirectPath);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        displayName: registerData.displayName || registerData.username
      });
      
      toast({
        title: "Welcome to NubiluXchange!",
        description: "Your account has been created successfully.",
      });

      // Redirect to intended page or home
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      setLocation(redirectPath);
      
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-nxe-dark text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 nxe-glass border-b border-nxe-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-transparent"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white active:text-nxe-primary transition-colors" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-nxe-primary" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">NubiluXchange</h1>
          </div>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-nxe-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-nxe-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Join the Gaming Community</h2>
          <p className="text-gray-400">Secure marketplace for gaming accounts and items</p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="p-3 bg-nxe-card rounded-lg mb-2">
              <ShoppingBag className="h-6 w-6 text-nxe-accent mx-auto" />
            </div>
            <p className="text-xs text-gray-400">Buy & Sell Accounts</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-nxe-card rounded-lg mb-2">
              <Shield className="h-6 w-6 text-nxe-accent mx-auto" />
            </div>
            <p className="text-xs text-gray-400">AI-Powered Escrow</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-nxe-card rounded-lg mb-2">
              <Users className="h-6 w-6 text-nxe-accent mx-auto" />
            </div>
            <p className="text-xs text-gray-400">Safe Community</p>
          </div>
        </div>

        <Card className="bg-nxe-card border-nxe-surface">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 bg-nxe-surface mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-white">Welcome Back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-nxe-surface border-nxe-border text-white"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-nxe-surface border-nxe-border text-white pr-10"
                        required
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-white">Create Account</CardTitle>
                <CardDescription>Join our gaming marketplace community</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-white">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Choose a username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-nxe-surface border-nxe-border text-white"
                      required
                      data-testid="input-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-white">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-nxe-surface border-nxe-border text-white"
                      required
                      data-testid="input-register-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-display-name" className="text-white">Display Name (Optional)</Label>
                    <Input
                      id="register-display-name"
                      type="text"
                      placeholder="Your display name"
                      value={registerData.displayName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="bg-nxe-surface border-nxe-border text-white"
                      data-testid="input-register-display-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-nxe-surface border-nxe-border text-white pr-10"
                        required
                        data-testid="input-register-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-white">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="bg-nxe-surface border-nxe-border text-white"
                      required
                      data-testid="input-register-confirm-password"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Guest Mode Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Just browsing? You can{" "}
            <Button
              variant="link"
              className="text-nxe-accent p-0 h-auto"
              onClick={() => setLocation("/")}
            >
              explore as guest
            </Button>
          </p>
        </div>
      </div>

      {/* 2FA Login Dialog */}
      {pendingUserId && (
        <TwoFactorLogin
          open={show2FADialog}
          onOpenChange={setShow2FADialog}
          userId={pendingUserId}
          onSuccess={handle2FASuccess}
        />
      )}
    </div>
  );
}