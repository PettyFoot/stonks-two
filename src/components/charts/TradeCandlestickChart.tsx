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
  isShared?: boolean;
}

type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d';

// Helper function to get display name for data source
function getSourceDisplayName(source: string): string {
  switch (source) {
    case 'alpha_vantage': return 'Alpha Vantage';
    case 'mock': return 'Demo Data';
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
      
      if (daysDiff > 365 * 20) {
        errors.push('Chart date is more than 20 years old - market data may not be available');
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
                setDataSource(`${getSourceDisplayName(cached.source)} (cached)`);
                
                // Notify parent component of cached market data
                if (onMarketDataUpdate) {
                  onMarketDataUpdate(cached);
                }
                
                setIsLoading(false);
                return;
              }
            } else {
              setMarketData(cached);
              setDataSource(`${getSourceDisplayName(cached.source)} (cached)`);
              
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
        
        // Add shared parameter if this is a shared view
        if (isShared) {
          params.set('shared', 'true');
        }
        
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
          setDataSource(data.cached ? `${getSourceDisplayName(data.source)} (cached)` : getSourceDisplayName(data.source));
          
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
      
      // Choose range based on data availability - always show extended hours starting at 4:00 AM
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
    
    // Filter executions to only show ones that occurred on the same date as the chart
    const visibleExecutions = executions.filter(execution => {
      const executionTime = execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : null;
      const executionPrice = Number(execution.limitPrice) || 0;
      
      // STRICT DATE FILTERING: Only show executions on the exact same date as chart
      let withinTimeRange = false;
      if (executionTime) {
        const executionDate = new Date(executionTime).toDateString();
        const chartDateObj = new Date(chartDate).toDateString();
        
        // Only allow executions that are on the exact same date as the chart
        withinTimeRange = (executionDate === chartDateObj);
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
            padding: {
              left: 4,
              right: 4,
              top: 2,
              bottom: 2
            }
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
            <p className="text-muted-foreground text-lg">Sorry, no trade data available for this symbol on this day</p>
            <p className="text-sm text-muted mt-2">Unable to fetch market data for {symbol} on {chartDate}</p>
            <Button
              onClick={() => window.location.href = '/contact'}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
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
            
            {/* Execution markers legend - only show executions that match the chart date */}
            {(() => {
              // Filter executions to only show ones that occurred on the same date as the chart
              const visibleExecutions = executions.filter(execution => {
                const executionTime = execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : null;
                
                if (executionTime) {
                  const executionDate = new Date(executionTime).toDateString();
                  const chartDateObj = new Date(chartDate).toDateString();
                  
                  // Only allow executions that are on the exact same date as the chart
                  return executionDate === chartDateObj;
                }
                
                return false;
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
              );
            })()}
          </div>
        ) : !(error && marketData && !marketData.success) && (
          <div className="text-center py-8">
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
      </CardContent>
    </Card>
  );
}