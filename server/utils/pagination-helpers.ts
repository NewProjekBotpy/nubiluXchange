/**
 * Pagination and Response Optimization Helpers
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Configuration for pagination limits
 */
export const PAGINATION_LIMITS = {
  DEFAULT: 20,
  MAX: 100,
  MIN: 1
} as const;

/**
 * Parse and validate pagination parameters from request
 */
export function parsePaginationParams(query: any): {
  limit: number;
  offset: number;
  page: number;
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(
    PAGINATION_LIMITS.MAX,
    Math.max(PAGINATION_LIMITS.MIN, parseInt(query.limit as string) || PAGINATION_LIMITS.DEFAULT)
  );
  const offset = (page - 1) * limit;

  return { limit, offset, page };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Cursor-based pagination for high-performance infinite scrolling
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  cursor: {
    next: string | null;
    hasMore: boolean;
  };
}

/**
 * Create cursor-based paginated response
 */
export function createCursorPaginatedResponse<T extends { id: number | string }>(
  data: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasMore = data.length === limit;
  const nextCursor = hasMore && data.length > 0
    ? Buffer.from(String(data[data.length - 1].id)).toString('base64')
    : null;

  return {
    data,
    cursor: {
      next: nextCursor,
      hasMore
    }
  };
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return parseInt(decoded);
  } catch {
    return 0;
  }
}

/**
 * Response optimization: Strip sensitive fields
 */
export function sanitizeResponse<T extends Record<string, any>>(
  data: T | T[],
  fieldsToRemove: string[] = ['password', 'twoFactorSecret', 'backupCodes']
): T | T[] {
  const sanitizeObject = (obj: T): T => {
    const sanitized = { ...obj };
    fieldsToRemove.forEach(field => {
      delete sanitized[field];
    });
    return sanitized;
  };

  if (Array.isArray(data)) {
    return data.map(sanitizeObject);
  }

  return sanitizeObject(data);
}

/**
 * Field selection helper for optimized queries
 */
export function parseFieldSelection(fields?: string): string[] | null {
  if (!fields) return null;
  
  return fields
    .split(',')
    .map(f => f.trim())
    .filter(Boolean);
}

/**
 * Apply field selection to response
 */
export function selectFields<T extends Record<string, any>>(
  data: T | T[],
  fields: string[]
): Partial<T> | Partial<T>[] {
  const selectFromObject = (obj: T): Partial<T> => {
    const selected: Partial<T> = {};
    fields.forEach(field => {
      if (field in obj) {
        selected[field as keyof T] = obj[field];
      }
    });
    return selected;
  };

  if (Array.isArray(data)) {
    return data.map(selectFromObject);
  }

  return selectFromObject(data);
}

/**
 * Sort parameter parsing
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export function parseSortParams(sort?: string): SortParams {
  if (!sort) {
    return { field: 'createdAt', order: 'desc' };
  }

  const [field, order] = sort.split(':');
  return {
    field: field || 'createdAt',
    order: (order?.toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  };
}

/**
 * Response compression indicator
 */
export function shouldCompressResponse(size: number, threshold: number = 1024): boolean {
  return size > threshold; // Compress if larger than 1KB
}

/**
 * Batch request helper
 */
export interface BatchRequest {
  ids: number[];
  fields?: string[];
}

export function parseBatchRequest(body: any): BatchRequest {
  return {
    ids: Array.isArray(body.ids) ? body.ids.filter((id: any) => typeof id === 'number') : [],
    fields: body.fields ? parseFieldSelection(body.fields) || undefined : undefined
  };
}
