import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from '@/lib/logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Centralized money formatting utilities for consistent IDR display
/**
 * Format money amount to Indonesian Rupiah (IDR) currency format
 * Uses proper number handling to avoid floating point precision issues
 */
export function formatIDR(amount: string | number | null | undefined): string {
  // Handle null, undefined, or empty values
  if (amount === null || amount === undefined || amount === '') {
    return 'Rp 0';
  }

  // Convert to number safely, avoiding parseFloat precision issues
  let numericAmount: number;
  if (typeof amount === 'string') {
    // Remove any existing currency symbols and whitespace
    const cleanedAmount = amount.replace(/[^\d.-]/g, '');
    numericAmount = Number(cleanedAmount);
  } else {
    numericAmount = Number(amount);
  }

  // Handle invalid numbers
  if (isNaN(numericAmount)) {
    return 'Rp 0';
  }

  // Format using Indonesian locale with no decimal places for cleaner display
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(numericAmount));
}

/**
 * Format money amount with decimal precision (for internal calculations)
 */
export function formatIDRWithDecimals(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Rp 0,00';
  }

  let numericAmount: number;
  if (typeof amount === 'string') {
    const cleanedAmount = amount.replace(/[^\d.-]/g, '');
    numericAmount = Number(cleanedAmount);
  } else {
    numericAmount = Number(amount);
  }

  if (isNaN(numericAmount)) {
    return 'Rp 0,00';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Parse formatted IDR string back to numeric value
 */
export function parseIDR(formattedAmount: string): number {
  if (!formattedAmount) return 0;
  
  // Remove currency symbol and thousands separators, replace comma decimal separator with dot
  const cleanedAmount = formattedAmount
    .replace(/[^\d.,-]/g, '') // Remove everything except digits, dots, commas, and minus
    .replace(/\./g, '') // Remove thousands separators (dots in Indonesian format)
    .replace(',', '.'); // Replace decimal separator (comma) with dot
  
  const numericValue = Number(cleanedAmount);
  return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * Format large numbers with K, M, B suffixes for compact display
 */
export function formatCompactIDR(amount: string | number | null | undefined): string {
  const numericAmount = typeof amount === 'string' ? parseIDR(amount) : Number(amount);
  
  if (isNaN(numericAmount) || numericAmount === 0) {
    return 'Rp 0';
  }

  const absAmount = Math.abs(numericAmount);
  const sign = numericAmount < 0 ? '-' : '';
  
  if (absAmount >= 1_000_000_000) {
    return `${sign}Rp ${(absAmount / 1_000_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000_000) {
    return `${sign}Rp ${(absAmount / 1_000_000).toFixed(1)}Jt`;
  } else if (absAmount >= 1_000) {
    return `${sign}Rp ${(absAmount / 1_000).toFixed(1)}K`;
  }
  
  return `${sign}Rp ${absAmount.toLocaleString('id-ID')}`;
}

/**
 * Format numbers like TikTok (1rb, 2jt, etc) for views, followers, likes
 * Does NOT include currency symbol - for non-money numbers only
 */
export function formatTikTokNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1_000_000_000) {
    return (absNum / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absNum >= 1_000_000) {
    return (absNum / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  }
  if (absNum >= 1_000) {
    return (absNum / 1_000).toFixed(1).replace(/\.0$/, '') + 'rb';
  }
  return num.toString();
}

/**
 * Sanitize and validate URLs to prevent XSS attacks
 * Returns a safe URL or a fallback default image URL
 */
export function sanitizeUrl(url: string | undefined | null, fallbackUrl: string = ''): string {
  if (!url) return fallbackUrl;
  
  // Allow relative paths (safe for same-origin)
  if (url.startsWith('/')) return url;
  
  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'data:'];
  
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const protocol = parsedUrl.protocol;
    
    if (!safeProtocols.includes(protocol)) {
      logger.warn('Blocked unsafe URL protocol', { component: 'utils', url, protocol });
      return fallbackUrl;
    }
    
    // Validate data URLs
    if (protocol === 'data:') {
      if (!url.startsWith('data:image/')) {
        logger.warn('Blocked non-image data URL', { component: 'utils', url });
        return fallbackUrl;
      }
    }
    
    return url;
  } catch (error) {
    logger.warn('Invalid URL', { component: 'utils', url, error });
    return fallbackUrl;
  }
}
