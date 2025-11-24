import { SQL } from "drizzle-orm";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface FilterOptions extends PaginationOptions {
  sortBy?: string;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function applyPagination<T>(query: any, options?: PaginationOptions): any {
  if (!options) return query;
  
  let paginatedQuery = query;
  
  if (options.limit !== undefined) {
    paginatedQuery = paginatedQuery.limit(options.limit);
  }
  
  if (options.offset !== undefined) {
    paginatedQuery = paginatedQuery.offset(options.offset);
  }
  
  return paginatedQuery;
}

export function buildSearchConditions(
  searchQuery: string | undefined,
  searchFields: SQL[]
): SQL | undefined {
  if (!searchQuery || !searchQuery.trim()) {
    return undefined;
  }
  
  const searchTerm = `%${searchQuery.toLowerCase().trim()}%`;
  return searchFields.length > 0 ? searchFields[0] : undefined;
}

export function getEffectiveLimit(limit: number | undefined, defaultLimit: number = 50): number {
  return limit !== undefined ? limit : defaultLimit;
}
