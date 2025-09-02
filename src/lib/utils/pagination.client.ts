"use client";

import { useState, useCallback } from 'react';
import { PaginationParams, normalizePaginationParams } from './pagination';

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