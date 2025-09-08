'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { FilterOptions } from '@/types';

export interface TimeRange {
  value: '30' | '60' | '90';
  label: string;
  startDate: Date;
  endDate: Date;
}

export type TimeFramePreset = 
  | 'yesterday' 
  | '1week' 
  | '2weeks' 
  | '1month' 
  | '2months'
  | '3months' 
  | '6months' 
  | '1year' 
  | 'lastyear' 
  | 'ytd' 
  | 'custom'
  | null;

export interface GlobalFilterState {
  symbol?: string;
  side?: 'all' | 'long' | 'short';
  tags?: string[];
  duration?: 'all' | 'intraday' | 'swing';
  showOpenTrades?: boolean;
  timeRange: TimeRange;
  timeFramePreset?: TimeFramePreset;
  priceRange?: { min: number; max: number };
  volumeRange?: { min: number; max: number };
  executionCountRange?: { min: number; max: number };
  timeOfDayRange?: { start: string; end: string };
  customDateRange?: { from?: string; to?: string };
}

export interface GlobalFilterContextType {
  filters: GlobalFilterState;
  setTimeRange: (range: '30' | '60' | '90') => void;
  setTimeFramePreset: (preset: TimeFramePreset) => void;
  setCustomDateRange: (from?: string, to?: string) => void;
  updateFilter: (key: keyof GlobalFilterState, value: unknown) => void;
  updateFilters: (filters: Partial<GlobalFilterState>) => void;
  clearFilters: () => void;
  clearAdvancedFilters: () => void;
  toFilterOptions: () => FilterOptions;
  hasActiveFilters: boolean;
  hasAdvancedFilters: boolean;
  hasCustomTimeFilter: boolean;
}

const STORAGE_KEY = 'global-filters';

const TIME_RANGES: Record<string, TimeRange> = {
  '30': {
    value: '30',
    label: '30 Days',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  },
  '60': {
    value: '60',
    label: '60 Days',
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  },
  '90': {
    value: '90',
    label: '90 Days',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  }
};

const DEFAULT_STATE: GlobalFilterState = {
  timeRange: TIME_RANGES['30'],
  timeFramePreset: null
};

function calculatePresetDates(preset: TimeFramePreset): { from: string; to: string } | null {
  if (!preset || preset === 'custom') return null;
  
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  switch (preset) {
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: formatDate(yesterday), to: formatDate(yesterday) };
    }
    case '1week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: formatDate(weekAgo), to: formatDate(today) };
    }
    case '2weeks': {
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return { from: formatDate(twoWeeksAgo), to: formatDate(today) };
    }
    case '1month': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { from: formatDate(monthAgo), to: formatDate(today) };
    }
    case '2months': {
      const twoMonthsAgo = new Date(today);
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
      return { from: formatDate(twoMonthsAgo), to: formatDate(today) };
    }
    case '3months': {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      return { from: formatDate(threeMonthsAgo), to: formatDate(today) };
    }
    case '6months': {
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      return { from: formatDate(sixMonthsAgo), to: formatDate(today) };
    }
    case '1year': {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { from: formatDate(yearAgo), to: formatDate(today) };
    }
    case 'lastyear': {
      const lastYear = today.getFullYear() - 1;
      return { 
        from: `${lastYear}-01-01`, 
        to: `${lastYear}-12-31` 
      };
    }
    case 'ytd': {
      const currentYear = today.getFullYear();
      return { 
        from: `${currentYear}-01-01`, 
        to: formatDate(today) 
      };
    }
    default:
      return null;
  }
}

type FilterAction = 
  | { type: 'SET_TIME_RANGE'; payload: '30' | '60' | '90' }
  | { type: 'SET_TIME_FRAME_PRESET'; payload: TimeFramePreset }
  | { type: 'SET_CUSTOM_DATE_RANGE'; payload: { from?: string; to?: string } }
  | { type: 'UPDATE_FILTER'; payload: { key: keyof GlobalFilterState; value: unknown } }
  | { type: 'UPDATE_FILTERS'; payload: Partial<GlobalFilterState> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'CLEAR_ADVANCED_FILTERS' }
  | { type: 'LOAD_FROM_STORAGE'; payload: GlobalFilterState };

function saveToStorage(state: GlobalFilterState) {
  if (typeof window === 'undefined') return; // Skip on server
  
  try {
    const serializable = {
      ...state,
      timeRange: {
        ...state.timeRange,
        startDate: state.timeRange.startDate.toISOString(),
        endDate: state.timeRange.endDate.toISOString()
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
}

function loadFromStorage(): GlobalFilterState | null {
  if (typeof window === 'undefined') return null; // Skip on server
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.timeRange) {
        parsed.timeRange = TIME_RANGES[parsed.timeRange.value] || TIME_RANGES['30'];
      }
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error);
  }
  return null;
}

function filterReducer(state: GlobalFilterState, action: FilterAction): GlobalFilterState {
  let newState: GlobalFilterState;
  
  switch (action.type) {
    case 'SET_TIME_RANGE':
      newState = {
        ...state,
        timeRange: TIME_RANGES[action.payload],
        customDateRange: undefined,
        timeFramePreset: null
      };
      break;
      
    case 'SET_TIME_FRAME_PRESET':
      const dates = calculatePresetDates(action.payload);
      newState = {
        ...state,
        timeFramePreset: action.payload,
        customDateRange: dates || undefined
      };
      break;
      
    case 'SET_CUSTOM_DATE_RANGE':
      newState = {
        ...state,
        customDateRange: (action.payload.from || action.payload.to) ? action.payload : undefined,
        timeFramePreset: (action.payload.from || action.payload.to) ? 'custom' : null
      };
      break;
      
    case 'UPDATE_FILTER':
      newState = {
        ...state,
        [action.payload.key]: action.payload.value
      };
      break;
      
    case 'UPDATE_FILTERS':
      newState = { ...state, ...action.payload };
      break;
      
    case 'CLEAR_FILTERS':
      newState = DEFAULT_STATE;
      break;
      
    case 'CLEAR_ADVANCED_FILTERS':
      newState = {
        ...state,
        priceRange: undefined,
        volumeRange: undefined,
        executionCountRange: undefined,
        timeOfDayRange: undefined,
        customDateRange: undefined,
        timeFramePreset: null
      };
      break;
      
    case 'LOAD_FROM_STORAGE':
      return action.payload;
      
    default:
      return state;
  }
  
  saveToStorage(newState);
  return newState;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | null>(null);

interface GlobalFilterProviderProps {
  children: ReactNode;
}

export function GlobalFilterProvider({ children }: GlobalFilterProviderProps) {
  const [state, dispatch] = useReducer(filterReducer, DEFAULT_STATE);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      dispatch({ type: 'LOAD_FROM_STORAGE', payload: stored });
    }
  }, []);

  const setTimeRange = useCallback((range: '30' | '60' | '90') => {
    dispatch({ type: 'SET_TIME_RANGE', payload: range });
  }, []);

  const setTimeFramePreset = useCallback((preset: TimeFramePreset) => {
    dispatch({ type: 'SET_TIME_FRAME_PRESET', payload: preset });
  }, []);

  const setCustomDateRange = useCallback((from?: string, to?: string) => {
    dispatch({ type: 'SET_CUSTOM_DATE_RANGE', payload: { from, to } });
  }, []);

  const updateFilter = useCallback((key: keyof GlobalFilterState, value: unknown) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { key, value } });
  }, []);

  const updateFilters = useCallback((filters: Partial<GlobalFilterState>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const clearAdvancedFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_ADVANCED_FILTERS' });
  }, []);

  const toFilterOptions = useCallback((): FilterOptions => {
    const effectiveDateRange = state.customDateRange || {
      from: state.timeRange.startDate.toISOString().split('T')[0],
      to: state.timeRange.endDate.toISOString().split('T')[0]
    };

    return {
      symbol: state.symbol,
      side: state.side,
      tags: state.tags,
      duration: state.duration,
      showOpenTrades: state.showOpenTrades,
      dateFrom: effectiveDateRange.from,
      dateTo: effectiveDateRange.to,
      priceRange: state.priceRange,
      volumeRange: state.volumeRange,
      executionCountRange: state.executionCountRange,
      timeRange: state.timeOfDayRange
    };
  }, [state]);

  const hasCustomTimeFilter = !!(state.timeFramePreset || state.customDateRange);

  const hasActiveFilters = !!(
    state.symbol ||
    (state.side && state.side !== 'all') ||
    (state.tags && state.tags.length > 0) ||
    (state.duration && state.duration !== 'all') ||
    state.customDateRange ||
    state.timeFramePreset ||
    state.priceRange ||
    state.volumeRange ||
    state.executionCountRange ||
    state.timeOfDayRange
  );

  const hasAdvancedFilters = !!(
    state.priceRange ||
    state.volumeRange ||
    state.executionCountRange ||
    state.timeOfDayRange ||
    state.customDateRange
  );

  const value: GlobalFilterContextType = {
    filters: state,
    setTimeRange,
    setTimeFramePreset,
    setCustomDateRange,
    updateFilter,
    updateFilters,
    clearFilters,
    clearAdvancedFilters,
    toFilterOptions,
    hasActiveFilters,
    hasAdvancedFilters,
    hasCustomTimeFilter
  };

  return (
    <GlobalFilterContext.Provider value={value}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(GlobalFilterContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within a GlobalFilterProvider');
  }
  return context;
}