'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import './chart-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApexOptions } from 'apexcharts';
import { ExecutionOrder } from '@/components/ExecutionsTable';
import { MarketDataCache } from '@/lib/marketData/cache';
import { MarketDataResponse } from '@/lib/marketData/types';

const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chart...</div>
});

// Using OHLCData from market data types - imported above

interface TradeCandlestickChartProps {
  symbol: string;
  executions: ExecutionOrder[];
  tradeDate: string;
  tradeTime?: string;
  height?: number;
  onExecutionSelect?: (execution: ExecutionOrder) => void;
  onMarketDataUpdate?: (marketData: MarketDataResponse) => void;
  isShared?: boolean;
}

type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d';

// Helper function to get display name for data source
function getSourceDisplayName(source: string): string {
  switch (source) {
    case 'alpha_vantage': return 'Alpha Vantage';
    case 'polygon': return 'Polygon.io';
    default: return source;
  }
}

export default function TradeCandlestickChart({
  symbol,
  executions,
  tradeDate,
  tradeTime,
  height = 400,
  onExecutionSelect,
  onMarketDataUpdate,
  isShared = false
}: TradeCandlestickChartProps) {
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('5m');
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [chartDate, setChartDate] = useState<string>(() => {
    if (!tradeDate) return '';
    // Handle different date formats from the parent
    if (/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) {
      return tradeDate; // Already in correct format
    }
    // Parse formatted dates like "Sep 03, 2025"
    const date = new Date(tradeDate + ' 12:00:00'); // Add time to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }); // Independent chart date
  const [retryCount, setRetryCount] = useState<number>(0); // Force retry counter
  const [lastRateLimitError, setLastRateLimitError] = useState<number>(0); // Track last rate limit error timestamp
  
  // Request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestInProgressRef = useRef<boolean>(false);

  // Helper function to check if a date is a weekend
  const isWeekend = useCallback((dateStr: string): boolean => {
    try {
      // Parse date consistently to avoid timezone issues
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday = 0, Saturday = 6
    } catch (error) {
      console.warn('Error parsing date for weekend check:', error);
      return false;
    }
  }, []);

  // Validate inputs - memoized to prevent useEffect loops
  const validateInputs = useCallback((symbol: string, chartDate: string) => {
    const errors = [];
    
    // Validate symbol
    if (!symbol || symbol.length === 0) {
      errors.push('Symbol is required');
    } else if (symbol.length > 10) {
      errors.push('Symbol is too long (max 10 characters)');
    } else if (!/^[A-Z0-9.\-_]+$/i.test(symbol)) {
      errors.push('Symbol contains invalid characters');
    }
    
    // Validate date
    const date = new Date(chartDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid chart date format');
    } else {
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365 * 20) {
        errors.push('Chart date is more than 20 years old - market data may not be available');
      }
      
      if (date.getTime() > now.getTime()) {
        errors.push('Chart date cannot be in the future');
      }
    }
    
    return errors;
  }, []);

  // Fetch trade-aware market data with caching
  useEffect(() => {
    // Add a small delay to debounce rapid re-renders (e.g., from StrictMode)
    const timeoutId = setTimeout(() => {
      fetchMarketData();
    }, 100);

    const fetchMarketData = async () => {
      if (!symbol) {
        console.warn('❌ No symbol provided for market data fetch');
        return;
      }
      
      // Prevent duplicate requests
      if (requestInProgressRef.current) {
        return;
      }
      
      // Prevent retries during rate limit cooldown
      const timeSinceLastRateLimit = Date.now() - lastRateLimitError;
      if (lastRateLimitError > 0) {
        // Check if this might be a daily limit (if we're still within 23 hours of the error)
        const isDailyLimit = timeSinceLastRateLimit < 23 * 60 * 60 * 1000; // 23 hours
        const cooldownTime = isDailyLimit ? 24 * 60 * 60 * 1000 : 60000; // 24 hours or 60 seconds
        
        if (timeSinceLastRateLimit < cooldownTime) {
          const remainingTime = cooldownTime - timeSinceLastRateLimit;
          if (isDailyLimit) {
            const hoursLeft = Math.ceil(remainingTime / (1000 * 60 * 60));
            setError(`Daily API limit reached. Please try again in ${hoursLeft} hours or upgrade your plan.`);
          } else {
            const secondsLeft = Math.ceil(remainingTime / 1000);
            setError(`Rate limit active. Please wait ${secondsLeft} seconds before retrying.`);
          }
          return;
        }
      }
      
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      requestInProgressRef.current = true;
      
      // Validate inputs
      const validationErrors = validateInputs(symbol, chartDate);
      if (validationErrors.length > 0) {
        console.warn('❌ Input validation failed:', validationErrors);
        setError(`Validation error: ${validationErrors[0]}`);
        setMarketData({
          symbol,
          date: chartDate,
          interval: timeInterval,
          ohlc: [],
          success: false,
          error: validationErrors.join('; '),
          source: 'alpha_vantage' as const,
          cached: false
        });
        setIsLoading(false);
        return;
      }

      // Check if it's a weekend before making API calls
      if (isWeekend(chartDate)) {
        setError(null); // Clear any previous errors
        setMarketData({
          symbol,
          date: chartDate,
          interval: timeInterval,
          ohlc: [],
          success: false,
          error: 'No chart data available - markets are closed on weekends',
          source: 'alpha_vantage' as const,
          cached: false
        });
        setIsLoading(false);
        setDataSource('No data (weekend)');
        return;
      }
      
      // Log execution data for debugging
      console.log('Fetching market data', {
        symbol,
        tradeDate,
        chartDate,
        timeInterval,
        executionsCount: executions.length,
        executions: executions.map(e => ({
          id: e.id,
          symbol: e.symbol,
          side: e.side,
          quantity: e.orderQuantity,
          price: e.limitPrice,
          time: e.orderExecutedTime
        }))
      });
      
      setIsLoading(true);
      setError(null);
      
      try {
        
        // Check client-side cache first (unless bypassed)
        const bypassCache = new URLSearchParams(window.location.search).get('nocache') === 'true' || retryCount > 0;
        if (!bypassCache) {
          const cached = MarketDataCache.get(symbol, chartDate, timeInterval, tradeTime);
          if (cached) {
            console.log('Using cached market data', {
              source: cached.source,
              candleCount: cached.ohlc?.length || 0,
              dateRange: cached.ohlc?.length ?
                `${new Date(cached.ohlc[0].timestamp).toLocaleString()} to ${new Date(cached.ohlc[cached.ohlc.length - 1].timestamp).toLocaleString()}` :
                'No candles'
            });
            
            // Validate cache data matches requested date
            if (cached.ohlc?.length > 0) {
              const firstCandleDate = new Date(cached.ohlc[0].timestamp).toDateString();
              const requestedDate = new Date(chartDate).toDateString();
              if (firstCandleDate !== requestedDate) {
                console.warn(`⚠️  Cache date mismatch: requested ${requestedDate}, cached data is from ${firstCandleDate}`);
                MarketDataCache.clearSymbol(symbol);
              } else {
                setMarketData(cached);
                let cachedSourceDisplay = `${getSourceDisplayName(cached.source)} (cached)`;
                if (cached.delayed) {
                  cachedSourceDisplay += ' (15-min delayed)';
                }
                setDataSource(cachedSourceDisplay);
                
                // Notify parent component of cached market data
                if (onMarketDataUpdate) {
                  onMarketDataUpdate(cached);
                }
                
                setIsLoading(false);
                return;
              }
            } else {
              setMarketData(cached);
              let cachedSourceDisplay = `${getSourceDisplayName(cached.source)} (cached)`;
              if (cached.delayed) {
                cachedSourceDisplay += ' (15-min delayed)';
              }
              setDataSource(cachedSourceDisplay);
              
              // Notify parent component of cached market data
              if (onMarketDataUpdate) {
                onMarketDataUpdate(cached);
              }
              
              setIsLoading(false);
              return;
            }
          } else {
          }
        } else {
        }
        
        // Convert date to ISO format (YYYY-MM-DD) for API
        // Handle both ISO format strings and date objects without timezone shifts
        const convertToISODate = (dateStr: string): string => {
          try {
            // If already in ISO format (YYYY-MM-DD), return as-is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            // For other formats, parse with local timezone hint (use noon to avoid timezone issues)
            const date = new Date(dateStr + 'T12:00:00');
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            // Use local date methods to avoid timezone conversion
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error('Date conversion error:', error, 'Input:', dateStr);
            throw error;
          }
        };

        const isoDate = convertToISODate(chartDate);

        // Build simple API URL with just symbol, date, and interval
        const params = new URLSearchParams({
          symbol,
          date: isoDate,
          interval: timeInterval
        });
        
        // Add shared parameter if this is a shared view
        if (isShared) {
          params.set('shared', 'true');
        }
        
        const response = await fetch(`/api/market-data?${params.toString()}`, {
          signal: abortControllerRef.current?.signal
        });
        
        
        // Always read the response body first, even for non-ok responses
        const data: MarketDataResponse = await response.json();
        
        // Handle rate limit responses (429) specially
        if (response.status === 429) {
          console.warn(`🚫 Rate limit exceeded:`, data);
          const rateLimitError = new Error(data.error || 'Rate limit exceeded');
          // Attach rate limit info to the error for later use
          (rateLimitError as any).rateLimitInfo = data.rateLimitInfo;
          throw rateLimitError;
        }
        
        // Handle other non-ok responses
        if (!response.ok) {
          throw new Error(data.error || `Failed to fetch market data: ${response.status} ${response.statusText}`);
        }

        console.log('Market data API response', {
          success: data.success,
          source: data.source,
          cached: data.cached,
          candleCount: data.ohlc?.length || 0,
          error: data.error || null,
          rawData: data
        });
        
        if (data.success) {
          // Log data quality info
          if (data.ohlc?.length > 0) {
            const firstCandle = new Date(data.ohlc[0].timestamp);
            const lastCandle = new Date(data.ohlc[data.ohlc.length - 1].timestamp);
            const requestedDate = new Date(chartDate);

            console.log('Market data quality check', {
              requestedDate: requestedDate.toDateString(),
              actualDataDate: firstCandle.toDateString(),
              dateMatch: firstCandle.toDateString() === requestedDate.toDateString(),
              timeRange: `${firstCandle.toLocaleTimeString()} to ${lastCandle.toLocaleTimeString()}`,
              priceRange: `$${Math.min(...data.ohlc.map(c => c.low)).toFixed(2)} - $${Math.max(...data.ohlc.map(c => c.high)).toFixed(2)}`,
              delayed: data.delayed
            });

            // Warn about date mismatches
            if (firstCandle.toDateString() !== requestedDate.toDateString()) {
              console.warn(`⚠️  Date mismatch detected! This may cause chart rendering issues.`);
            }
          }

          setMarketData(data);

          // Update data source display to include delayed status
          let sourceDisplay = data.cached ? `${getSourceDisplayName(data.source)} (cached)` : getSourceDisplayName(data.source);
          if (data.delayed) {
            sourceDisplay += ' (15-min delayed)';
          }
          setDataSource(sourceDisplay);
          
          // Notify parent component of market data update
          if (onMarketDataUpdate) {
            onMarketDataUpdate(data);
          }
          
          // Cache the response client-side
          if (!data.cached) {
            MarketDataCache.set(data);
          }
        } else {
          throw new Error(data.error || 'Market data fetch failed');
        }
        
      } catch (err) {
        // Don't handle aborted requests as errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        console.error('Error fetching market data:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to load chart data';
        
        // Extract rate limit info if available
        const rateLimitInfo = (err as any)?.rateLimitInfo;
        
        // Track rate limit errors to prevent rapid retries
        if (errorMsg.includes('ALPHA_VANTAGE_RATE_LIMIT') || 
            errorMsg.includes('POLYGON_RATE_LIMIT') || 
            errorMsg.includes('rate limit') ||
            errorMsg.includes('Rate limit exceeded')) {
          
          // For daily limits, set a longer cooldown (24 hours)
          if (errorMsg.includes('ALPHA_VANTAGE_DAILY_LIMIT') || errorMsg.includes('daily limit')) {
            setLastRateLimitError(Date.now());
          } else {
            setLastRateLimitError(Date.now());
          }
        }
        
        setError(errorMsg);
        
        // Set empty market data to show error state
        setMarketData({
          symbol,
          date: chartDate,
          interval: timeInterval,
          ohlc: [],
          success: false,
          error: errorMsg,
          source: 'alpha_vantage' as const,
          cached: false,
          rateLimitInfo // Include rate limit info for the UI
        });
        setDataSource('error');
      } finally {
        requestInProgressRef.current = false;
        setIsLoading(false);
      }
    };

    // Cleanup function to cancel any pending requests and timeouts
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      requestInProgressRef.current = false;
    };
  }, [symbol, chartDate, tradeTime, timeInterval, executions, validateInputs, retryCount]);

  // Calculate x-axis range based on the selected chart date (not first candle date)
  const getXAxisRange = useCallback(() => {
    // Always use the requested chart date for the range, not the first candle date
    // Parse date string correctly to avoid timezone shift
    const requestedDate = new Date(chartDate + 'T12:00:00');
    
    if (marketData?.ohlc && marketData.ohlc.length > 0) {
      const timestamps = marketData.ohlc.map(d => d.timestamp);
      const minTimestamp = Math.min(...timestamps);
      const maxTimestamp = Math.max(...timestamps);
      const firstCandleDate = new Date(minTimestamp);
      
      // Calculate data span in hours
      const dataSpanHours = (maxTimestamp - minTimestamp) / (1000 * 60 * 60);

      console.log('Data validation completed', {
        firstDataDate: firstCandleDate.toDateString(),
        requestedDate: requestedDate.toDateString(),
        dataSpanHours: dataSpanHours.toFixed(2),
        minTimestamp: new Date(minTimestamp).toLocaleString(),
        maxTimestamp: new Date(maxTimestamp).toLocaleString()
      });
    }
    
    // Always focus on the requested chart date from 4:00 AM to 4:00 PM (market close)
    const rangeStart = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate());
    rangeStart.setHours(4, 0, 0, 0); // 4:00 AM of the requested date

    const rangeEnd = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate());
    rangeEnd.setHours(16, 0, 0, 0); // 4:00 PM (market close) of the requested date
    
    const range = {
      min: rangeStart.getTime(),
      max: rangeEnd.getTime()
    };
    
    return range;
  }, [marketData, chartDate]);

  // Process executions for scatter series overlay
  const executionData = useMemo(() => {
    if (!executions.length || !marketData?.ohlc?.length) return { buyExecutions: [], sellExecutions: [] };
    
    const xAxisRange = getXAxisRange();
    
    // Get price range from current market data
    const priceRange = {
      min: Math.min(...marketData.ohlc.map(c => c.low)),
      max: Math.max(...marketData.ohlc.map(c => c.high))
    };
    
    // Filter executions to only show ones that occurred on the same date as the chart
    const visibleExecutions = executions.filter(execution => {
      const executionTime = execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : null;
      const executionPrice = Number(execution.limitPrice) || 0;

      // DATE FILTERING: Show executions on the chart date (or if no execution time, assume it's on chart date)
      let withinTimeRange = false;
      if (executionTime) {
        // Parse dates consistently by extracting just the date portion
        const executionDate = new Date(executionTime).toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
        const chartDateForComparison = /^\d{4}-\d{2}-\d{2}$/.test(chartDate)
          ? chartDate
          : new Date(chartDate + 'T12:00:00').toLocaleDateString('en-CA');

        // Only allow executions that are on the exact same date as the chart
        withinTimeRange = (executionDate === chartDateForComparison);
      } else {
        // If no execution time, assume it's on the chart date
        withinTimeRange = true;
      }

      // Check if execution price is within chart's price range (with 10% padding for safety)
      const priceBuffer = (priceRange.max - priceRange.min) * 0.10;
      const withinPriceRange = executionPrice >= (priceRange.min - priceBuffer) &&
        executionPrice <= (priceRange.max + priceBuffer);

      return withinTimeRange && withinPriceRange;
    });

    console.log('Chart display range and executions', {
      timeRange: `${new Date(xAxisRange.min).toLocaleTimeString()} - ${new Date(xAxisRange.max).toLocaleTimeString()}`,
      priceRange: `$${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)}`,
      chartDate,
      chartDateObj: new Date(chartDate + 'T12:00:00'),
      visibleExecutions: visibleExecutions.map(e => ({
        side: e.side,
        price: Number(e.limitPrice).toFixed(2),
        rawExecutedTime: e.orderExecutedTime,
        executedTimestamp: e.orderExecutedTime ? new Date(e.orderExecutedTime).getTime() : null,
        executedDateString: e.orderExecutedTime ? new Date(e.orderExecutedTime).toDateString() : 'N/A',
        executedTimeString: e.orderExecutedTime ? new Date(e.orderExecutedTime).toLocaleTimeString() : 'N/A',
        chartDateString: new Date(chartDate).toDateString(),
        dateMatch: e.orderExecutedTime ? new Date(e.orderExecutedTime).toDateString() === new Date(chartDate).toDateString() : false,
        withinRange: e.orderExecutedTime ? new Date(e.orderExecutedTime).getTime() >= xAxisRange.min && new Date(e.orderExecutedTime).getTime() <= xAxisRange.max : false
      }))
    });

    const parseExecutionTime = (executionTime: Date | null): number => {
      if (!executionTime) {
        // Use chart date at market open (9:30 AM) as fallback
        const fallbackDate = new Date(chartDate + 'T13:30:00'); // 9:30 AM EST in UTC
        return fallbackDate.getTime();
      }

      return new Date(executionTime).getTime();
    };

    // Separate buy and sell executions for different series
    const buyExecutions = visibleExecutions
      .filter(e => e.side === 'BUY')
      .map(execution => ({
        x: parseExecutionTime(execution.orderExecutedTime),
        y: Number(execution.limitPrice) || 0,
        executionId: execution.id,
        quantity: execution.orderQuantity,
        execution: execution
      }));
    
    const sellExecutions = visibleExecutions
      .filter(e => e.side === 'SELL')
      .map(execution => ({
        x: parseExecutionTime(execution.orderExecutedTime),
        y: Number(execution.limitPrice) || 0,
        executionId: execution.id,
        quantity: execution.orderQuantity,
        execution: execution
      }));

    console.log('Execution data for chart overlay', {
      buyExecutions: buyExecutions.length,
      sellExecutions: sellExecutions.length,
      chartDate,
      buyData: buyExecutions.map(e => ({
        timestamp: e.x,
        dateTime: new Date(e.x).toLocaleString(),
        dateOnly: new Date(e.x).toDateString(),
        timeOnly: new Date(e.x).toLocaleTimeString(),
        price: e.y,
        qty: e.quantity
      })),
      sellData: sellExecutions.map(e => ({
        timestamp: e.x,
        dateTime: new Date(e.x).toLocaleString(),
        dateOnly: new Date(e.x).toDateString(),
        timeOnly: new Date(e.x).toLocaleTimeString(),
        price: e.y,
        qty: e.quantity
      }))
    });

    return { buyExecutions, sellExecutions };
  }, [executions, selectedExecution, marketData, getXAxisRange, chartDate]);

  const xAxisRange = getXAxisRange();

  const chartOptions: ApexOptions = {
    colors: ['#000000', '#3b82f6', '#9333ea'], // Candlestick (black), Buy (blue), Sell (purple)
    stroke: {
      width: 1  // Thin wick lines
    },
    markers: {
      size: [0, 8, 8], // Hide markers for candlestick (0), show for scatter series (8px)
      colors: ['transparent', '#3b82f6', '#9333ea'], // Transparent for candlestick, blue for buy, purple for sell
      strokeColors: ['transparent', '#ffffff', '#ffffff'], // White border for scatter markers
      strokeWidth: [0, 2, 2], // No border for candlestick, 2px border for scatter
      hover: {
        sizeOffset: 0  // Prevent size increase on hover
      },
      discrete: []
    },
    states: {
      hover: {
        filter: {
          type: 'none'  // Prevents color change on hover
        }
      },
      active: {
        filter: {
          type: 'none'  // Prevents color change on click/active
        }
      }
    },
    chart: {
      type: 'line', // Changed to line to support mixed series
      height: height,
      background: 'transparent',
      animations: {
        animateGradually: {
          enabled: false // Disable gradual animations to prevent z-index issues
        }
      },
      toolbar: {
        show: true,
        offsetX: 0,
        offsetY: 0,
        tools: {
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        export: {
          csv: {
            filename: undefined,
            columnDelimiter: ',',
            headerCategory: 'category',
            headerValue: 'value',
            valueFormatter(timestamp: number) {
              return new Date(timestamp).toDateString()
            }
          },
          svg: {
            filename: undefined,
          },
          png: {
            filename: undefined,
          }
        },
        autoSelected: 'zoom'
      },
      events: {
        dataPointSelection: (event, chartContext, config) => {

          // Handle execution marker clicks (scatter series are at index 1 and 2)
          if (config.seriesIndex >= 1) {
            const isBuyExecution = config.seriesIndex === 1;
            const executionArray = isBuyExecution ? executionData.buyExecutions : executionData.sellExecutions;
            const clickedExecution = executionArray[config.dataPointIndex];
            
            if (clickedExecution) {
              setSelectedExecution(clickedExecution.executionId === selectedExecution ? null : clickedExecution.executionId);
              onExecutionSelect?.(clickedExecution.execution);
            }
          }
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: 'var(--theme-green)',
          downward: 'var(--theme-red)'
        },
        wick: {
          useFillColor: true  // Wicks match candle colors (green/red)
        }
      },
      bar: {
        columnWidth: '40%' // Optimal candlestick width for visibility
      }
    },
    xaxis: {
      type: 'datetime',
      min: xAxisRange.min,
      max: xAxisRange.max,
      tooltip: {
        enabled: false
      },
      labels: {
        style: {
          colors: 'var(--theme-primary-text)'
        },
        datetimeUTC: false,
        datetimeFormatter: {
          hour: 'HH:mm'
        }
      },
      axisBorder: {
        color: 'var(--theme-primary-text)'
      },
      axisTicks: {
        color: 'var(--theme-primary-text)'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        style: {
          colors: 'var(--theme-primary-text)'
        },
        formatter: (value) => `$${value.toFixed(2)}`
      },
      axisBorder: {
        color: 'var(--theme-primary-text)'
      },
      axisTicks: {
        color: 'var(--theme-primary-text)'
      }
    },
    grid: {
      borderColor: 'var(--theme-chart-grid)',
      strokeDashArray: 1,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      theme: 'dark',
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        // Only show custom tooltip for candlestick series (index 0)
        if (seriesIndex !== 0) return '';
        
        // Check if candlestick data exists for this series and data point
        if (!w.globals.seriesCandleO || !w.globals.seriesCandleO[seriesIndex] || !w.globals.seriesCandleO[seriesIndex][dataPointIndex]) {
          return '';
        }
        
        const ohlc = marketData?.ohlc?.[dataPointIndex];
        if (!ohlc) return '';
        
        return `
          <div class="apex-tooltip-candlestick" style="background: rgba(40, 40, 40, 0.5); border: 1px solid #555; border-radius: 6px; padding: 8px; color: #e5e5e5; font-family: system-ui, -apple-system, sans-serif;">
            <div class="apex-tooltip-title" style="color: #ffffff; font-weight: 600; font-size: 12px; margin-bottom: 6px; text-align: center;">
              <span style="color: #ffffff;">${new Date(ohlc.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
            <div class="apex-tooltip-body" style="font-size: 11px; line-height: 1.4;">
              <div style="color: #e5e5e5; margin-bottom: 2px;">Open: <span class="value" style="color: #ffffff; font-weight: 500;">$${ohlc.open.toFixed(2)}</span></div>
              <div style="color: #e5e5e5; margin-bottom: 2px;">High: <span class="value" style="color: #10b981; font-weight: 500;">$${ohlc.high.toFixed(2)}</span></div>
              <div style="color: #e5e5e5; margin-bottom: 2px;">Low: <span class="value" style="color: #ef4444; font-weight: 500;">$${ohlc.low.toFixed(2)}</span></div>
              <div style="color: #e5e5e5; margin-bottom: 2px;">Close: <span class="value" style="color: #ffffff; font-weight: 500;">$${ohlc.close.toFixed(2)}</span></div>
              ${ohlc.volume ? `<div style="color: #e5e5e5;">Volume: <span class="value" style="color: #a3a3a3; font-weight: 500;">${ohlc.volume.toLocaleString()}</span></div>` : ''}
            </div>
          </div>
        `;
      }
    },
    legend: {
      show: false,
      position: 'bottom',
      horizontalAlign: 'center',
      floating: false,
      offsetY: 10,
      labels: {
        colors: 'var(--theme-primary-text)'
      },
      markers: {
        size: 20,
        shape: 'line'
      }
    },
    theme: {
      mode: 'dark'
    }
  };

  const chartSeries = [
    {
      name: symbol,
      type: 'candlestick',
      data: marketData?.ohlc?.map(d => ({
        x: d.timestamp,
        y: [d.open, d.high, d.low, d.close]
      })) || [],
      showInLegend: false // Hide candlestick from legend
    },
    {
      name: 'Buy',
      type: 'scatter',
      data: executionData.buyExecutions.map(e => ({
        x: e.x,
        y: e.y,
        executionId: e.executionId,
        quantity: e.quantity
      })),
      showInLegend: true
    },
    {
      name: 'Sell',
      type: 'scatter',
      data: executionData.sellExecutions.map(e => ({
        x: e.x,
        y: e.y,
        executionId: e.executionId,
        quantity: e.quantity
      })),
      showInLegend: true
    }
  ];

  const handleExecutionClick = (execution: ExecutionOrder) => {
    setSelectedExecution(execution.id === selectedExecution ? null : execution.id);
    onExecutionSelect?.(execution);
  };

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-primary">
            {symbol} Price Chart
            <span className="ml-2 text-xs font-normal text-muted">
              ({executions.length} execution{executions.length !== 1 ? 's' : ''})
              {dataSource && ` • ${dataSource}`}
              {dataSource === 'demo_data' && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Demo Data
                </span>
              )}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
              className="w-36 h-9 px-3 py-2 text-sm border border-input rounded-md bg-white shadow-xs outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              title="Chart Date (independent of trade date)"
            />
            <select 
              value={timeInterval} 
              onChange={(e) => setTimeInterval(e.target.value as TimeInterval)}
              className="w-20 h-9 px-3 py-2 text-sm border border-input rounded-md bg-white shadow-xs outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && marketData && !marketData.success && (
          <div className="text-center py-8">
            {/* Check for weekend first */}
            {(marketData.error?.includes('markets are closed on weekends') || 
              isWeekend(chartDate)) ? (
              <div>
                <p className="text-muted-foreground text-lg">No chart data available</p>
                <p className="text-sm text-muted mt-2">Markets are closed on weekends</p>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground text-lg">Sorry, no trade data available for this symbol on this day</p>
                <p className="text-sm text-muted mt-2">Unable to fetch market data for {symbol} on {chartDate}</p>
              </div>
            )}
            
            {/* Check if this is a rate limit error - only show if NOT a weekend */}
            {!isWeekend(chartDate) && (error?.includes('ALPHA_VANTAGE_DAILY_LIMIT') || 
              marketData.error?.includes('ALPHA_VANTAGE_DAILY_LIMIT')) ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-red-600">Alpha Vantage daily API limit of 25 requests exceeded. The limit resets at midnight UTC.</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => window.location.href = '/settings?tab=subscription'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Upgrade Plan
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/contact'}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            ) : !isWeekend(chartDate) && (marketData.rateLimitInfo && !marketData.rateLimitInfo.allowed) ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-orange-600">
                  You've reached your limit of 10 requests per 30 minutes.
                </p>
                <p className="text-xs text-muted">
                  You've made {marketData.rateLimitInfo.callsMade}/10 requests. 
                  {marketData.rateLimitInfo.callsRemaining !== null && (
                    ` ${marketData.rateLimitInfo.callsRemaining} remaining.`
                  )}
                </p>
                <p className="text-xs text-muted">
                  Try again {new Date(marketData.rateLimitInfo.resetAt).toLocaleTimeString()}.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => window.location.href = '/settings?tab=subscription'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Upgrade to Premium
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/contact'}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            ) : !isWeekend(chartDate) && (error?.includes('ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE') || 
              marketData.error?.includes('ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE') ||
              error?.includes('rate limit exceeded (5 requests/minute)') ||
              marketData.error?.includes('rate limit exceeded (5 requests/minute)')) ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-orange-600">Free tier rate limit reached (rolling 60-second window). Please wait for earlier requests to expire and try again...</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      // Clear cache and force retry, reset rate limit cooldown
                      MarketDataCache.clearSymbol(symbol);
                      setLastRateLimitError(0);
                      setRetryCount(prev => prev + 1);
                    }}
                    variant="outline"
                    className="px-6 py-2"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Retrying...' : 'Retry'}
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/settings?tab=subscription'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Upgrade
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/contact'}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            ) : !isWeekend(chartDate) && (
              <div className="mt-4">
                <Button
                  onClick={() => window.location.href = '/contact'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  Contact Support
                </Button>
                {error && (
                  <p className="text-xs text-red-500 mt-3">{error}</p>
                )}
                {marketData.error && (
                  <p className="text-xs text-orange-500 mt-1">API Error: {marketData.error}</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted">Loading chart data...</p>
            </div>
          </div>
        ) : marketData && marketData.ohlc.length > 0 ? (
          <div className="relative">
            <Chart
              key={`${symbol}-${timeInterval}-${executions.length}-${chartDate}`}
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={height}
            />

            {/* Delayed data info banner */}
            {marketData.delayed && (
              <div className="mt-3 mb-3 flex justify-start">
                <div className="inline-flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <svg className="h-4 w-4 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    15-minute delayed data
                  </span>
                </div>
              </div>
            )}

            {/* Execution markers legend - only show executions that match the chart date */}
            {(() => {
              // Filter executions to only show ones that occurred on the same date as the chart
              const visibleExecutions = executions.filter(execution => {
                const executionTime = execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : null;

                if (executionTime) {
                  // Parse dates consistently by extracting just the date portion
                  const executionDate = new Date(executionTime).toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
                  const chartDateForComparison = /^\d{4}-\d{2}-\d{2}$/.test(chartDate)
                    ? chartDate
                    : new Date(chartDate + 'T12:00:00').toLocaleDateString('en-CA');

                  // Only allow executions that are on the exact same date as the chart
                  return executionDate === chartDateForComparison;
                } else {
                  // If no execution time, assume it's on the chart date
                  return true;
                }
              });

              return visibleExecutions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-primary">Executions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {visibleExecutions.map(execution => (
                      <Button
                        key={execution.id}
                        variant={selectedExecution === execution.id ? "default" : "outline"}
                        size="sm"
                        className={`text-xs h-7 ${
                          execution.side === 'BUY'
                            ? 'border-blue-500 text-blue-500 hover:bg-blue-500/10'
                            : 'border-purple-600 text-purple-600 hover:bg-purple-600/10'
                        }`}
                        onClick={() => handleExecutionClick(execution)}
                      >
                        {execution.side} {execution.orderQuantity}@${(Number(execution.limitPrice) || 0).toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : !(error && marketData && !marketData.success) && (
          <div className="text-center py-8">
            {isWeekend(chartDate) ? (
              <div>
                <p className="text-muted-foreground text-lg">No chart data available</p>
                <p className="text-sm text-muted mt-2">Markets are closed on weekends</p>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground text-lg">Sorry, no trade data available for this symbol on this day</p>
                <p className="text-sm text-muted mt-2">Unable to fetch market data for {symbol} on {chartDate}</p>
                <Button
                  onClick={() => window.location.href = '/contact'}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  Contact Support
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}