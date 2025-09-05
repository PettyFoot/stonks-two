'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
}

type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d';

export default function TradeCandlestickChart({
  symbol,
  executions,
  tradeDate,
  tradeTime,
  height = 400,
  onExecutionSelect,
  onMarketDataUpdate
}: TradeCandlestickChartProps) {
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('5m');
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [chartDate, setChartDate] = useState<string>(tradeDate); // Independent chart date


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
      
      if (daysDiff > 365) {
        errors.push('Chart date is more than 1 year old - market data may not be available');
      } else if (daysDiff > 60 && timeInterval !== '1d') {
        errors.push(`Intraday data (${timeInterval}) is only available for the last 60 days`);
      }
      
      if (date.getTime() > now.getTime()) {
        errors.push('Chart date cannot be in the future');
      }
    }
    
    return errors;
  }, [timeInterval]);

  // Fetch trade-aware market data with caching
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!symbol) {
        console.warn('❌ No symbol provided for market data fetch');
        return;
      }
      
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
          source: 'yahoo' as const,
          cached: false
        });
        setIsLoading(false);
        return;
      }
      
      // Log execution data for debugging
      console.log('📊 Chart initialization:', {
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
        console.log(`🔍 Fetching market data for ${symbol} on ${chartDate} (${timeInterval})`);
        
        // Check client-side cache first (unless bypassed)
        const bypassCache = new URLSearchParams(window.location.search).get('nocache') === 'true';
        if (!bypassCache) {
          const cached = MarketDataCache.get(symbol, chartDate, timeInterval, tradeTime);
          if (cached) {
            console.log(`📋 Using cached data for ${symbol}:`, {
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
                console.log('💀 Clearing stale cache and fetching fresh data...');
                MarketDataCache.clearSymbol(symbol);
              } else {
                setMarketData(cached);
                setDataSource(`${cached.source} (cached)`);
                
                // Notify parent component of cached market data
                if (onMarketDataUpdate) {
                  onMarketDataUpdate(cached);
                }
                
                setIsLoading(false);
                return;
              }
            } else {
              setMarketData(cached);
              setDataSource(`${cached.source} (cached)`);
              
              // Notify parent component of cached market data
              if (onMarketDataUpdate) {
                onMarketDataUpdate(cached);
              }
              
              setIsLoading(false);
              return;
            }
          } else {
            console.log(`📥 No cache found for ${symbol} on ${chartDate}`);
          }
        } else {
          console.log(`🚫 Cache bypass enabled via ?nocache=true`);
        }
        
        // Build simple API URL with just symbol, date, and interval
        const params = new URLSearchParams({
          symbol,
          date: chartDate,
          interval: timeInterval
        });
        
        const response = await fetch(`/api/market-data?${params.toString()}`);
        
        console.log(`📡 API request sent: /api/market-data?${params.toString()}`);
        console.log(`🔗 Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch market data: ${response.status} ${response.statusText}`);
        }
        
        const data: MarketDataResponse = await response.json();
        
        console.log(`📊 API Response for ${symbol}:`, {
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
            
            console.log(`📈 Data analysis:`, {
              requestedDate: requestedDate.toDateString(),
              actualDataDate: firstCandle.toDateString(),
              dateMatch: firstCandle.toDateString() === requestedDate.toDateString(),
              timeRange: `${firstCandle.toLocaleTimeString()} to ${lastCandle.toLocaleTimeString()}`,
              priceRange: `$${Math.min(...data.ohlc.map(c => c.low)).toFixed(2)} - $${Math.max(...data.ohlc.map(c => c.high)).toFixed(2)}`
            });
            
            // Warn about date mismatches
            if (firstCandle.toDateString() !== requestedDate.toDateString()) {
              console.warn(`⚠️  Date mismatch detected! This may cause chart rendering issues.`);
            }
          }
          
          setMarketData(data);
          setDataSource(data.cached ? `${data.source} (cached)` : data.source);
          
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
        console.error('Error fetching market data:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to load chart data';
        setError(errorMsg);
        
        // Set empty market data to show error state
        setMarketData({
          symbol,
          date: chartDate,
          interval: timeInterval,
          ohlc: [],
          success: false,
          error: errorMsg,
          source: 'yahoo' as const,
          cached: false
        });
        setDataSource('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, [symbol, chartDate, tradeTime, timeInterval, executions, validateInputs]);

  // Calculate x-axis range based on actual data availability
  const getXAxisRange = useCallback(() => {
    if (marketData?.ohlc && marketData.ohlc.length > 0) {
      const timestamps = marketData.ohlc.map(d => d.timestamp);
      const minTimestamp = Math.min(...timestamps);
      const maxTimestamp = Math.max(...timestamps);
      const firstCandleDate = new Date(minTimestamp);
      
      // Use the actual date from the data, not the requested date
      const actualTradingDate = new Date(firstCandleDate.getFullYear(), firstCandleDate.getMonth(), firstCandleDate.getDate());
      
      // Calculate data span in hours
      const dataSpanHours = (maxTimestamp - minTimestamp) / (1000 * 60 * 60);
      
      console.log(`📊 Chart range calculation:`, {
        actualDataDate: actualTradingDate.toDateString(),
        requestedDate: new Date(chartDate).toDateString(),
        dataSpanHours: dataSpanHours.toFixed(2),
        minTimestamp: new Date(minTimestamp).toLocaleString(),
        maxTimestamp: new Date(maxTimestamp).toLocaleString()
      });
      
      // Choose range based on data availability
      if (dataSpanHours < 3) {
        // Sparse data: show actual data range + 30 min padding
        const padding = 30 * 60 * 1000; // 30 minutes in milliseconds
        const range = {
          min: minTimestamp - padding,
          max: maxTimestamp + padding
        };
        console.log(`📏 Using sparse data range: ${new Date(range.min).toLocaleString()} to ${new Date(range.max).toLocaleString()}`);
        return range;
      } else if (dataSpanHours < 7) {
        // Partial day: show regular trading hours for the ACTUAL data date
        const rangeStart = new Date(actualTradingDate);
        rangeStart.setHours(9, 30, 0, 0); // 9:30 AM
        const rangeEnd = new Date(actualTradingDate);
        rangeEnd.setHours(16, 0, 0, 0); // 4:00 PM
        
        const range = {
          min: rangeStart.getTime(),
          max: rangeEnd.getTime()
        };
        console.log(`📏 Using regular hours range: ${new Date(range.min).toLocaleString()} to ${new Date(range.max).toLocaleString()}`);
        return range;
      } else {
        // Full day: show extended hours for the ACTUAL data date
        const rangeStart = new Date(actualTradingDate);
        rangeStart.setHours(4, 0, 0, 0); // 4:00 AM
        const rangeEnd = new Date(actualTradingDate);
        rangeEnd.setHours(20, 0, 0, 0); // 8:00 PM
        
        const range = {
          min: rangeStart.getTime(),
          max: rangeEnd.getTime()
        };
        console.log(`📏 Using extended hours range: ${new Date(range.min).toLocaleString()} to ${new Date(range.max).toLocaleString()}`);
        return range;
      }
    } else {
      // Fallback to requested chart date (regular hours since we don't know data availability)
      const fallbackStart = new Date(chartDate);
      fallbackStart.setHours(9, 30, 0, 0);
      const fallbackEnd = new Date(chartDate);
      fallbackEnd.setHours(16, 0, 0, 0);
      
      const range = {
        min: fallbackStart.getTime(),
        max: fallbackEnd.getTime()
      };
      console.log(`📏 Using fallback range: ${new Date(range.min).toLocaleString()} to ${new Date(range.max).toLocaleString()}`);
      return range;
    }
  }, [marketData, chartDate]);

  // Process executions for triangular annotations
  const executionAnnotations = useMemo(() => {
    if (!executions.length || !marketData?.ohlc?.length) return { points: [] };
    
    const xAxisRange = getXAxisRange();
    
    // Get price range from current market data
    const priceRange = {
      min: Math.min(...marketData.ohlc.map(c => c.low)),
      max: Math.max(...marketData.ohlc.map(c => c.high))
    };
    
    // Filter executions that are within visible time and price ranges
    const visibleExecutions = executions.filter(execution => {
      const executionTime = execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : null;
      const executionPrice = Number(execution.limitPrice) || 0;
      
      // MORE LENIENT TIME FILTERING: Check if execution is on the same date as chart
      // OR if execution time falls within the chart's time range
      let withinTimeRange = false;
      if (executionTime) {
        const executionDate = new Date(executionTime).toDateString();
        const chartDateObj = new Date(chartDate).toDateString();
        
        // Allow executions if they're on the same date OR within the time range
        withinTimeRange = (executionDate === chartDateObj) || 
          (executionTime >= xAxisRange.min && executionTime <= xAxisRange.max);
      }
      
      // Check if execution price is within chart's price range (with 10% padding for safety)
      const priceBuffer = (priceRange.max - priceRange.min) * 0.10;
      const withinPriceRange = executionPrice >= (priceRange.min - priceBuffer) && 
        executionPrice <= (priceRange.max + priceBuffer);
      
      return withinTimeRange && withinPriceRange;
    });
    
    console.log(`📍 Filtering ${executions.length} executions -> ${visibleExecutions.length} visible`, {
      timeRange: `${new Date(xAxisRange.min).toLocaleTimeString()} - ${new Date(xAxisRange.max).toLocaleTimeString()}`,
      priceRange: `$${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)}`,
      chartDate,
      visibleExecutions: visibleExecutions.map(e => ({
        side: e.side,
        price: Number(e.limitPrice).toFixed(2),
        time: e.orderExecutedTime ? new Date(e.orderExecutedTime).toLocaleTimeString() : 'N/A',
        executedTime: e.orderExecutedTime,
        withinRange: e.orderExecutedTime ? new Date(e.orderExecutedTime).getTime() >= xAxisRange.min && new Date(e.orderExecutedTime).getTime() <= xAxisRange.max : false
      }))
    });

    // Create triangular point annotations for visible executions
    const pointAnnotations = visibleExecutions.map(execution => {
      const isBuy = execution.side === 'BUY';
      const executionPrice = Number(execution.limitPrice) || 0;
      
      return {
        x: execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : Date.now(),
        y: executionPrice,
        marker: {
          size: selectedExecution === execution.id ? 12 : 10,
          fillColor: isBuy ? '#10b981' : '#ef4444', // Green for buy, red for sell
          strokeColor: '#ffffff',
          strokeWidth: 2,
          shape: 'circle' // Start with circles to test if annotations work
        },
        label: {
          text: `${isBuy ? '▲' : '▼'}${execution.orderQuantity}`,
          style: {
            background: isBuy ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '3px',
            padding: '2px 4px'
          },
          offsetY: isBuy ? -20 : 20, // Position label above/below marker
          offsetX: 0,
          borderWidth: 0
        }
      };
    });

    console.log(`🎯 Created ${pointAnnotations.length} point annotations:`, pointAnnotations.map(p => ({
      x: new Date(p.x).toLocaleString(),
      y: p.y,
      markerShape: p.marker.shape,
      markerSize: p.marker.size,
      markerColor: p.marker.fillColor
    })));

    return {
      points: pointAnnotations
    };
  }, [executions, selectedExecution, marketData, getXAxisRange]);

  const xAxisRange = getXAxisRange();

  const chartOptions: ApexOptions = {
    chart: {
      type: 'candlestick', // Reverted back to candlestick
      height: height,
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      events: {
        markerClick: (_event, _chartContext, { dataPointIndex }) => {
          console.log('Annotation marker clicked:', { dataPointIndex });
          // Handle execution annotation clicks
          if (executionAnnotations.points[dataPointIndex]) {
            const executionData = executionAnnotations.points[dataPointIndex];
            const execution = executions.find(e => 
              e.orderExecutedTime && new Date(e.orderExecutedTime).getTime() === executionData.x
            );
            if (execution) {
              setSelectedExecution(execution.id);
              onExecutionSelect?.(execution);
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
          useFillColor: true
        }
      }
    },
    xaxis: {
      type: 'datetime',
      min: xAxisRange.min,  // 4:00 AM (pre-market start) based on actual data date
      max: xAxisRange.max,  // 8:00 PM (after-hours end) based on actual data date
      labels: {
        style: {
          colors: 'var(--theme-primary-text)'
        },
        datetimeFormatter: {
          hour: 'HH:mm'
        }
      },
      axisBorder: {
        color: 'var(--theme-chart-axis)'
      },
      axisTicks: {
        color: 'var(--theme-chart-axis)'
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
        color: 'var(--theme-chart-axis)'
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
        const data = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
        if (!data) return '';
        
        const ohlc = marketData?.ohlc[dataPointIndex];
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
    annotations: {
      points: executionAnnotations.points
    },
    theme: {
      mode: 'dark'
    }
  };

  const chartSeries = [
    {
      name: symbol,
      data: marketData?.ohlc?.map(d => ({
        x: d.timestamp,
        y: [d.open, d.high, d.low, d.close]
      })) || []
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
            <p className="text-muted-foreground text-lg">Chart data not available</p>
            <p className="text-sm text-muted mt-2">Unable to fetch market data for {symbol} on {chartDate}</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            {marketData.error && (
              <p className="text-xs text-orange-500 mt-1">API Error: {marketData.error}</p>
            )}
            <div className="mt-4 text-xs text-muted space-y-1">
              <p>Troubleshooting tips:</p>
              <p>• Check if the symbol '{symbol}' is valid</p>
              <p>• Ensure the date {chartDate} is within the last 60 days for intraday data</p>
              <p>• Try refreshing the page or clearing the cache</p>
            </div>
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
              type="candlestick"
              height={height}
            />
            
            {/* Execution markers legend */}
            {executions.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-primary">Executions:</h4>
                <div className="flex flex-wrap gap-2">
                  {executions.map(execution => (
                    <Button
                      key={execution.id}
                      variant={selectedExecution === execution.id ? "default" : "outline"}
                      size="sm"
                      className={`text-xs h-7 ${
                        execution.side === 'BUY' 
                          ? 'border-[var(--theme-green)] text-[var(--theme-green)] hover:bg-[var(--theme-green)]/10' 
                          : 'border-[var(--theme-red)] text-[var(--theme-red)] hover:bg-[var(--theme-red)]/10'
                      }`}
                      onClick={() => handleExecutionClick(execution)}
                    >
                      {execution.side} {execution.orderQuantity}@${(Number(execution.limitPrice) || 0).toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-lg">Chart data not available</p>
            <p className="text-sm text-muted mt-2">Unable to fetch market data for {symbol} on {chartDate}</p>
            <div className="mt-4 text-xs text-muted space-y-1">
              <p>This could be due to:</p>
              <p>• Market data for {symbol} is not available</p>
              <p>• Date {chartDate} is outside the available data range</p>
              <p>• Symbol '{symbol}' may not be recognized by market data providers</p>
            </div>
            {executions.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded text-left">
                <p className="text-xs font-medium text-blue-900 mb-2">Execution Summary:</p>
                {executions.slice(0, 3).map(exec => (
                  <p key={exec.id} className="text-xs text-blue-800">
                    {exec.side} {exec.orderQuantity} shares @ ${((Number(exec.limitPrice) / 100) || 0).toFixed(2)}
                  </p>
                ))}
                {executions.length > 3 && (
                  <p className="text-xs text-blue-600 mt-1">... and {executions.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}