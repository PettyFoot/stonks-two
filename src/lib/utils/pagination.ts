"use client";

import { useState, useCallback } from 'react';

/**
 * Pagination Utilities for Large Dataset Handling
 * 
 * Provides optimized pagination, cursor-based navigation, and virtual scrolling
 * utilities for handling large trading datasets efficiently.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

/**
 * Default pagination settings optimized for trading data
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
  MIN_LIMIT: 10,
  DEFAULT_SORT_ORDER: 'desc' as const,
} as const;

/**
 * Validate and normalize pagination parameters
 */
export function normalizePaginationParams(params: PaginationParams): Required<Omit<PaginationParams, 'cursor'>> & { cursor?: string } {
  return {
    page: Math.max(1, params.page || 1),
    limit: Math.min(
      PAGINATION_DEFAULTS.MAX_LIMIT,
      Math.max(PAGINATION_DEFAULTS.MIN_LIMIT, params.limit || PAGINATION_DEFAULTS.DEFAULT_LIMIT)
    ),
    cursor: params.cursor,
    sortBy: params.sortBy || 'date',
    sortOrder: params.sortOrder || PAGINATION_DEFAULTS.DEFAULT_SORT_ORDER,
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number,
  hasNext: boolean = false,
  hasPrevious: boolean = false
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: hasNext || page < totalPages,
    hasPrevious: hasPrevious || page > 1,
  };
}

/**
 * Generate cursor for cursor-based pagination
 * Uses base64 encoding of timestamp + id for reliable ordering
 */
export function generateCursor(date: Date, id: string): string {
  const timestamp = date.getTime();
  return Buffer.from(`${timestamp}:${id}`).toString('base64');
}

/**
 * Parse cursor to extract timestamp and id
 */
export function parseCursor(cursor: string): { timestamp: number; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('ascii');
    const [timestamp, id] = decoded.split(':');
    return { timestamp: parseInt(timestamp, 10), id };
  } catch {
    return null;
  }
}

/**
 * Build Prisma pagination options for offset-based pagination
 */
export function buildOffsetPaginationOptions(params: PaginationParams) {
  const normalized = normalizePaginationParams(params);
  const skip = (normalized.page - 1) * normalized.limit;

  return {
    skip,
    take: normalized.limit,
    orderBy: {
      [normalized.sortBy]: normalized.sortOrder,
    },
  };
}

/**
 * Build Prisma cursor pagination options for large datasets
 */
export function buildCursorPaginationOptions(params: PaginationParams) {
  const normalized = normalizePaginationParams(params);
  const options: any = {
    take: normalized.limit,
    orderBy: {
      [normalized.sortBy]: normalized.sortOrder,
    },
  };

  if (normalized.cursor) {
    const parsedCursor = parseCursor(normalized.cursor);
    if (parsedCursor) {
      options.cursor = {
        id: parsedCursor.id,
      };
      options.skip = 1; // Skip the cursor item itself
    }
  }

  return options;
}

/**
 * Create paginated response with proper metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total: number,
  getCursorFn?: (item: T) => string
): PaginatedResult<T> {
  const normalized = normalizePaginationParams(params);
  const pagination = calculatePaginationMeta(
    normalized.page,
    normalized.limit,
    total
  );

  // Generate cursors for cursor-based pagination
  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (getCursorFn && data.length > 0) {
    if (pagination.hasNext) {
      nextCursor = getCursorFn(data[data.length - 1]);
    }
    if (pagination.hasPrevious && data.length > 0) {
      previousCursor = getCursorFn(data[0]);
    }
  }

  return {
    data,
    pagination: {
      ...pagination,
      nextCursor,
      previousCursor,
    },
  };
}

/**
 * React hook for managing pagination state
 */
export function usePagination(initialParams: PaginationParams = {}) {
  const [params, setParams] = useState(normalizePaginationParams(initialParams));

  const updateParams = useCallback((newParams: Partial<PaginationParams>) => {
    setParams(current => ({
      ...current,
      ...normalizePaginationParams({ ...current, ...newParams }),
    }));
  }, []);

  const nextPage = useCallback(() => {
    updateParams({ page: params.page + 1 });
  }, [params.page, updateParams]);

  const previousPage = useCallback(() => {
    updateParams({ page: Math.max(1, params.page - 1) });
  }, [params.page, updateParams]);

  const goToPage = useCallback((page: number) => {
    updateParams({ page: Math.max(1, page) });
  }, [updateParams]);

  const changeLimit = useCallback((limit: number) => {
    updateParams({ limit, page: 1 }); // Reset to first page when changing limit
  }, [updateParams]);

  const sort = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    updateParams({ 
      sortBy, 
      sortOrder: sortOrder || (params.sortBy === sortBy ? 
        (params.sortOrder === 'asc' ? 'desc' : 'asc') : 
        'desc'
      ),
      page: 1 // Reset to first page when sorting
    });
  }, [params.sortBy, params.sortOrder, updateParams]);

  return {
    params,
    updateParams,
    nextPage,
    previousPage,
    goToPage,
    changeLimit,
    sort,
  };
}

/**
 * Virtual scrolling utilities for large lists
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
) {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    totalItems - 1,
    visibleStart + Math.ceil(containerHeight / itemHeight)
  );
  
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(totalItems - 1, visibleEnd + overscan);
  
  return {
    startIndex,
    endIndex,
    visibleStart,
    visibleEnd,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight,
  };
}