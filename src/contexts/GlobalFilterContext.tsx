'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { ReportsFilterOptions, PredefinedTimeframe, StandardTimeframe, FilterTimeframe } from '@/types';

interface FilterState {
  standardTimeframe: StandardTimeframe; // 30d/60d/90d tabs (not a filter)
  filters: ReportsFilterOptions;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number;
  isHydrated: boolean;
}

type FilterAction = 
  | { type: 'SET_STANDARD_TIMEFRAME'; payload: StandardTimeframe }
  | { type: 'SET_FILTERS'; payload: ReportsFilterOptions }
  | { type: 'UPDATE_FILTERS'; payload: Partial<ReportsFilterOptions> }
  | { type: 'SET_FILTER_TIMEFRAME'; payload: FilterTimeframe }
  | { type: 'SET_CUSTOM_DATE_RANGE'; payload: { from: string; to: string } }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_FROM_STORAGE'; payload: { standardTimeframe: StandardTimeframe; filters: ReportsFilterOptions } }
  | { type: 'SET_HYDRATED'; payload: boolean };

const initialState: FilterState = {
  standardTimeframe: '30d', // Default to 30 days tab
  filters: {
    predefinedTimeframe: undefined,
    customTimeRange: false,
    symbols: undefined,
    tags: undefined,
    side: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  },
  isLoading: false,
  error: null,
  lastSyncedAt: Date.now(),
  isHydrated: false,
};

// Utility function to get effective timeframe (priority: filter > custom > standard)
const getEffectiveTimeframe = (standardTimeframe: StandardTimeframe, filters: ReportsFilterOptions): PredefinedTimeframe => {
  // Priority 1: Filter timeframe
  if (filters.predefinedTimeframe) {
    return filters.predefinedTimeframe;
  }
  
  // Priority 2: Custom date range (use standard as fallback for display)
  if (filters.customTimeRange && (filters.dateFrom || filters.dateTo)) {
    return standardTimeframe; // For display purposes, show the standard timeframe when custom dates are used
  }
  
  // Priority 3: Standard timeframe
  return standardTimeframe;
};

// Utility function to calculate date range from predefined timeframe
const getDateRangeFromTimeframe = (timeframe: PredefinedTimeframe): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case '1w':
      start.setDate(end.getDate() - 7);
      break;
    case '2w':
      start.setDate(end.getDate() - 14);
      break;
    case '1m':
      start.setMonth(end.getMonth() - 1);
      break;
    case '3m':
      start.setMonth(end.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(end.getMonth() - 6);
      break;
    case 'last-year':
      // Set to previous full year
      start.setFullYear(end.getFullYear() - 1, 0, 1);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
      break;
    case 'ytd':
      start.setMonth(0, 1); // January 1st of current year
      break;
    case 'yesterday':
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '60d':
      start.setDate(end.getDate() - 60);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }

  // Set time to start/end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_STANDARD_TIMEFRAME':
      return {
        ...state,
        standardTimeframe: action.payload,
        lastSyncedAt: Date.now(),
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
        error: null,
        lastSyncedAt: Date.now(),
      };
    case 'UPDATE_FILTERS': {
      const updatedFilters = { ...state.filters, ...action.payload };
      
      // Auto-sync dates when predefined timeframe changes
      if (action.payload.predefinedTimeframe && action.payload.predefinedTimeframe !== state.filters.predefinedTimeframe) {
        const { start, end } = getDateRangeFromTimeframe(action.payload.predefinedTimeframe);
        updatedFilters.dateFrom = start.toISOString().split('T')[0];
        updatedFilters.dateTo = end.toISOString().split('T')[0];
        updatedFilters.customTimeRange = false;
      }
      
      // Clear predefined timeframe when custom dates are set
      if ((action.payload.dateFrom || action.payload.dateTo) && 
          (action.payload.dateFrom !== state.filters.dateFrom || action.payload.dateTo !== state.filters.dateTo)) {
        updatedFilters.predefinedTimeframe = undefined;
        updatedFilters.customTimeRange = true;
      }
      
      return {
        ...state,
        filters: updatedFilters,
        error: null,
        lastSyncedAt: Date.now(),
      };
    }
    case 'SET_FILTER_TIMEFRAME': {
      const { start, end } = getDateRangeFromTimeframe(action.payload);
      return {
        ...state,
        filters: {
          ...state.filters,
          predefinedTimeframe: action.payload,
          customTimeRange: false,
          dateFrom: start.toISOString().split('T')[0],
          dateTo: end.toISOString().split('T')[0],
        },
        error: null,
        lastSyncedAt: Date.now(),
      };
    }
    case 'SET_CUSTOM_DATE_RANGE':
      return {
        ...state,
        filters: {
          ...state.filters,
          predefinedTimeframe: undefined,
          customTimeRange: true,
          dateFrom: action.payload.from,
          dateTo: action.payload.to,
        },
        error: null,
        lastSyncedAt: Date.now(),
      };
    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: {
          predefinedTimeframe: undefined, // Clear filter timeframes only
          customTimeRange: false,
          symbols: undefined,
          tags: undefined,
          side: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        },
        // Keep standardTimeframe intact - it's not a filter to be cleared
        error: null,
        lastSyncedAt: Date.now(),
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'LOAD_FROM_STORAGE':
      return {
        ...state,
        standardTimeframe: action.payload.standardTimeframe || '30d', // Default fallback
        filters: action.payload.filters,
        lastSyncedAt: Date.now(),
      };
    case 'SET_HYDRATED':
      return {
        ...state,
        isHydrated: action.payload,
      };
    default:
      return state;
  }
}

interface FilterContextType {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  updateFilters: (filters: Partial<ReportsFilterOptions>) => void;
  setStandardTimeframe: (timeframe: StandardTimeframe) => void;
  setFilterTimeframe: (timeframe: FilterTimeframe) => void;
  setCustomDateRange: (from: string, to: string) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getEffectiveTimeframe: () => PredefinedTimeframe;
}

const FilterContext = createContext<FilterContextType | null>(null);

const STORAGE_KEY = 'tradingAnalyticsFilters';
const STORAGE_VERSION = '1.0';

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilterContext must be used within FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider = ({ children }: FilterProviderProps) => {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Debounced localStorage save
  const saveToStorage = useCallback(
    (standardTimeframe: StandardTimeframe, filters: ReportsFilterOptions) => {
      const debouncedSave = debounce(() => {
        try {
          const storageData = {
            version: STORAGE_VERSION,
            standardTimeframe,
            filters,
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        } catch (error) {
          console.warn('Failed to save filters to localStorage:', error);
        }
      }, 300);
      debouncedSave();
    },
    []
  );

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storageData = JSON.parse(stored);
        
        // Check version compatibility and age (expire after 7 days)
        const isValid = storageData.version === STORAGE_VERSION &&
                        (Date.now() - storageData.timestamp) < 7 * 24 * 60 * 60 * 1000;

        if (isValid && storageData.filters) {
          dispatch({ 
            type: 'LOAD_FROM_STORAGE', 
            payload: { 
              standardTimeframe: storageData.standardTimeframe || '30d', 
              filters: storageData.filters 
            } 
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    } finally {
      dispatch({ type: 'SET_HYDRATED', payload: true });
    }
  }, []);

  // Save to storage when filters or standardTimeframe change (but not on initial load)
  useEffect(() => {
    if (state.isHydrated) {
      saveToStorage(state.standardTimeframe, state.filters);
    }
  }, [state.standardTimeframe, state.filters, state.isHydrated, saveToStorage]);

  const updateFilters = useCallback((filters: Partial<ReportsFilterOptions>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  const setStandardTimeframe = useCallback((timeframe: StandardTimeframe) => {
    dispatch({ type: 'SET_STANDARD_TIMEFRAME', payload: timeframe });
  }, []);

  const setFilterTimeframe = useCallback((timeframe: FilterTimeframe) => {
    dispatch({ type: 'SET_FILTER_TIMEFRAME', payload: timeframe });
  }, []);

  const setCustomDateRange = useCallback((from: string, to: string) => {
    dispatch({ type: 'SET_CUSTOM_DATE_RANGE', payload: { from, to } });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const getEffectiveTimeframeCallback = useCallback(() => {
    return getEffectiveTimeframe(state.standardTimeframe, state.filters);
  }, [state.standardTimeframe, state.filters]);

  const value: FilterContextType = {
    state,
    dispatch,
    updateFilters,
    setStandardTimeframe,
    setFilterTimeframe,
    setCustomDateRange,
    clearFilters,
    setLoading,
    setError,
    getEffectiveTimeframe: getEffectiveTimeframeCallback,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Export the utility function for use in other components
export { getDateRangeFromTimeframe };