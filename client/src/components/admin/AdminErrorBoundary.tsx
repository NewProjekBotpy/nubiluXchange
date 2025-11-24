import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error captured by error boundary and displayed to user
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="admin-glass border-nxe-error/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-nxe-error">
              <AlertTriangle className="h-5 w-5" />
              <span>Admin Panel Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-nxe-secondary">
              An error occurred while loading this section of the admin panel.
            </p>
            
            {this.state.error && (
              <details className="text-xs text-nxe-secondary">
                <summary className="cursor-pointer hover:text-white">Error Details</summary>
                <pre className="mt-2 p-2 bg-nxe-surface rounded text-red-400 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-nxe-secondary hover:text-white"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useAdminErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);

  const handleError = React.useCallback((error: Error) => {
    // Error will be thrown to parent error boundary
    setError(error);
  }, []);

  if (error) {
    throw error; // Let parent error boundary catch it
  }

  return { handleError, resetError };
}

// Query error fallback component
export function QueryErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void; 
}) {
  return (
    <div className="p-4 bg-nxe-surface/50 rounded-lg border border-nxe-error/50">
      <div className="flex items-center space-x-2 text-nxe-error mb-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Data Loading Error</span>
      </div>
      
      <p className="text-sm text-nxe-secondary mb-3">
        Unable to load data from server. Please check your connection and try again.
      </p>
      
      <Button
        variant="outline"
        size="sm"
        onClick={resetErrorBoundary}
        className="border-nxe-primary text-nxe-primary hover:bg-nxe-primary hover:text-white"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}