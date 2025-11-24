import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-nxe-dark flex items-center justify-center px-4">
      <Card className="bg-nxe-card border-nxe-surface max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-white">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              This area requires specific permissions that your account doesn't have.
            </p>
          </div>
          
          <Button 
            onClick={() => setLocation("/")}
            className="w-full bg-nxe-primary hover:bg-nxe-primary/80"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}