import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getFallbackResponse } from "./api-fallback";
import { logger } from '@/lib/logger';

// API base URL - server already includes /api prefix in routes
const API_BASE_URL = '';

// Cookie-based authentication - tokens are now stored in httpOnly cookies
// These functions are kept for backward compatibility but no longer needed

export function getAuthToken(): string | null {
  // Tokens are now in httpOnly cookies, not accessible via JavaScript
  // This function is deprecated but kept for compatibility
  return null;
}

export function setAuthToken(token: string) {
  // Tokens are now managed via httpOnly cookies set by the server
  // This function is deprecated but kept for compatibility
  logger.warn('setAuthToken is deprecated - tokens are now managed via httpOnly cookies', { component: 'QueryClient' });
}

export function removeAuthToken() {
  // Logout is now handled by server clearing cookies
  // This function is deprecated but kept for compatibility  
  logger.warn('removeAuthToken is deprecated - logout is now handled by server clearing cookies', { component: 'QueryClient' });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      // No need to clear tokens - cookies are httpOnly and managed by server
      throw new Error("Unauthorized");
    }
    
    let errorMessage = "Request failed";
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = await res.text() || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Automatically stringify body if it's a plain object
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof ReadableStream) && !(body instanceof ArrayBuffer)) {
      body = JSON.stringify(body);
    }

    // Only set Content-Type: application/json if body is not FormData
    // Let browser set the correct Content-Type with boundary for FormData
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // No Authorization header needed - using httpOnly cookies
    const res = await fetch(fullUrl, {
      ...options,
      body,
      headers,
      credentials: 'include', // Important: include cookies in requests
    });
    
    await throwIfResNotOk(res);
    
    return res.json();
  } catch (error: any) {
    // Don't log 401 errors from /api/auth/me as errors - they're expected when not logged in
    const is401AuthCheck = error?.message === 'Unauthorized' && url.includes('/api/auth/me');
    
    if (is401AuthCheck) {
      logger.debug('Auth check: Not authenticated', {
        component: 'QueryClient',
        url: fullUrl
      });
    } else {
      logger.error('API Request Error', {
        component: 'QueryClient',
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        url: fullUrl,
        method: options?.method || 'GET',
        error
      });
    }
    
    // If backend is not available, return fallback data only in development
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
      if (isDev) {
        logger.warn('Backend not available, using fallback data', { component: 'QueryClient', url });
        return getFallbackResponse(url, options?.method || 'GET', options?.body);
      } else {
        logger.error('Backend connection failed in production', { component: 'QueryClient', url });
        throw new Error('Backend service unavailable');
      }
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      let url = queryKey[0] as string;
      
      // Handle hierarchical query keys like ['/api/videos', videoId, 'comments']
      // Build URL by joining non-object query key parts
      const urlParts = [];
      let queryParams: Record<string, any> = {};
      
      for (let i = 0; i < queryKey.length; i++) {
        const part = queryKey[i];
        
        // If it's an object, treat it as query parameters
        if (typeof part === 'object' && part !== null && !Array.isArray(part)) {
          queryParams = { ...queryParams, ...(part as Record<string, any>) };
        } else {
          // Otherwise, add to URL path
          urlParts.push(String(part));
        }
      }
      
      // Join URL parts, handling leading slashes properly
      url = urlParts.join('/').replace(/\/+/g, '/'); // Replace multiple slashes with single slash
      if (!url.startsWith('/')) {
        url = '/' + url;
      }
      
      // Handle query parameters
      if (Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        
        for (const [key, value] of Object.entries(queryParams)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        }
        
        const queryString = params.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }
      
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // No Authorization header needed - using httpOnly cookies
      const res = await fetch(fullUrl, {
        headers,
        credentials: 'include', // Important: include cookies in requests
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        // No need to clear tokens - cookies are httpOnly and managed by server
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      if (error.message === "Unauthorized" && unauthorizedBehavior === "returnNull") {
        // Don't log expected 401 responses
        return null;
      }
      
      // Don't log 401 errors from /api/auth/me as errors - they're expected
      const is401AuthCheck = error?.message === 'Unauthorized' && String(queryKey[0]).includes('/api/auth/me');
      if (is401AuthCheck) {
        logger.debug('Auth check: Not authenticated', {
          component: 'QueryClient',
          endpoint: queryKey[0] as string
        });
        throw error;
      }
      
      // If backend is not available, return fallback data only in development
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';
        if (isDev) {
          logger.warn('Backend not available, using fallback data', { component: 'QueryClient', endpoint: queryKey[0] as string });
          const endpoint = queryKey[0] as string;
          return getFallbackResponse(endpoint, 'GET');
        } else {
          logger.error('Backend connection failed in production', { component: 'QueryClient', endpoint: queryKey[0] as string });
          throw new Error('Backend service unavailable');
        }
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Disable auto-refetch on window focus/clicks
      refetchOnMount: true, // Keep refetch on mount
      refetchOnReconnect: false, // Disable refetch on reconnect to reduce network noise
      refetchInterval: false, // Disable automatic polling by default
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.message === "Unauthorized" || error?.message?.includes("401")) {
          return false;
        }
        
        // Don't retry on client errors (4xx except rate limits)
        if (error?.message?.includes("400") || error?.message?.includes("403") || error?.message?.includes("404")) {
          return false;
        }
        
        // Retry on rate limit errors with exponential backoff
        if (error?.message?.includes("429") || error?.message?.includes("Too many requests")) {
          return failureCount < 3;
        }
        
        // Retry on server errors and network issues
        if (error?.message?.includes("500") || error?.message?.includes("503") || 
            error?.message?.includes("Backend service unavailable") || 
            error?.name === "TypeError") {
          return failureCount < 3;
        }
        
        // Default: retry up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s, 8s with max 30s
        return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Retry mutations on network errors and rate limits only
        if (error?.message?.includes("429") || error?.message?.includes("Too many requests")) {
          return failureCount < 2;
        }
        
        if (error?.message?.includes("503") || error?.name === "TypeError") {
          return failureCount < 1;
        }
        
        return false;
      },
      retryDelay: (attemptIndex) => {
        // Shorter retry delay for mutations: 500ms, 1s, 2s with max 10s
        return Math.min(500 * Math.pow(2, attemptIndex), 10000);
      },
    },
  },
});
