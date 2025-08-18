'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ReportsFilterOptions, PredefinedTimeframe } from '@/types';

interface FilterState {
  filters: ReportsFilterOptions;
  isLoading: boolean;
  error: string | null;
}

type FilterAction = 
  | { type: 'SET_FILTERS'; payload: ReportsFilterOptions }
  | { type: 'UPDATE_FILTERS'; payload: Partial<ReportsFilterOptions> }
  | { type: 'SET_PREDEFINED_TIMEFRAME'; payload: PredefinedTimeframe }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: FilterState = {
  filters: {
    predefinedTimeframe: '30d',
    customTimeRange: false,
  },
  isLoading: false,
  error: null,
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
        error: null,
      };
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        error: null,
      };
    case 'SET_PREDEFINED_TIMEFRAME':
      return {
        ...state,
        filters: {
          ...state.filters,
          predefinedTimeframe: action.payload,
          customTimeRange: false,
          // Clear date range when using predefined timeframe
          dateRange: undefined,
        },
        error: null,
      };
    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: {
          predefinedTimeframe: '30d',
          customTimeRange: false,
        },
        error: null,
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
    default:
      return state;
  }
}

interface FilterContextType {
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  updateFilters: (filters: Partial<ReportsFilterOptions>) => void;
  setPredefinedTimeframe: (timeframe: PredefinedTimeframe) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

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

  const updateFilters = (filters: Partial<ReportsFilterOptions>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  };

  const setPredefinedTimeframe = (timeframe: PredefinedTimeframe) => {
    dispatch({ type: 'SET_PREDEFINED_TIMEFRAME', payload: timeframe });
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR_FILTERS' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const value: FilterContextType = {
    state,
    dispatch,
    updateFilters,
    setPredefinedTimeframe,
    clearFilters,
    setLoading,
    setError,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

// Utility function to calculate date range from predefined timeframe
export const getDateRangeFromTimeframe = (timeframe: PredefinedTimeframe): { start: Date; end: Date } => {
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
      // Set to previous full year (e.g., if current year is 2025, set to 2024-01-01 to 2024-12-31)
      start.setFullYear(end.getFullYear() - 1, 0, 1); // January 1st of previous year
      end.setFullYear(end.getFullYear() - 1, 11, 31); // December 31st of previous year
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
      start.setDate(end.getDate() - 30); // Default to 30 days
  }

  // Set time to start/end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};