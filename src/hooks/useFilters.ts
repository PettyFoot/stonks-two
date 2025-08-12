'use client';

import { useState, useCallback } from 'react';
import { FilterOptions } from '@/types';

export function useFilters(initialFilters: FilterOptions = {}) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const updateFilter = useCallback((key: keyof FilterOptions, value: FilterOptions[keyof FilterOptions]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearFilter = useCallback((key: keyof FilterOptions) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Helper functions for common filter operations
  const setSymbolFilter = useCallback((symbol: string | undefined) => {
    updateFilter('symbol', symbol);
  }, [updateFilter]);

  const setSideFilter = useCallback((side: 'all' | 'long' | 'short' | undefined) => {
    updateFilter('side', side);
  }, [updateFilter]);

  const setDateRangeFilter = useCallback((dateFrom?: string, dateTo?: string) => {
    updateFilters({ dateFrom, dateTo });
  }, [updateFilters]);

  const setTagsFilter = useCallback((tags: string[] | undefined) => {
    updateFilter('tags', tags);
  }, [updateFilter]);

  const setDurationFilter = useCallback((duration: 'all' | 'intraday' | 'multiday' | undefined) => {
    updateFilter('duration', duration);
  }, [updateFilter]);

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && 
    !(Array.isArray(value) && value.length === 0)
  );

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    clearFilter,
    setSymbolFilter,
    setSideFilter,
    setDateRangeFilter,
    setTagsFilter,
    setDurationFilter,
    hasActiveFilters
  };
}