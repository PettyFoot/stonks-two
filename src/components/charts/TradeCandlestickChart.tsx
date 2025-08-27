'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import './chart-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ApexOptions } from 'apexcharts';
import { ExecutionOrder } from '@/components/ExecutionsTable';

const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading chart...</div>
});

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradeCandlestickChartProps {
  symbol: string;
  executions: ExecutionOrder[];
  tradeDate: string;
  height?: number;
  onExecutionSelect?: (execution: ExecutionOrder) => void;
}

type TimeInterval = '1m' | '5m' | '15m' | '1h' | '1d';

export default function TradeCandlestickChart({
  symbol,
  executions,
  tradeDate,
  height = 400,
  onExecutionSelect
}: TradeCandlestickChartProps) {
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('5m');
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  // Generate mock OHLC data for development
  const generateMockOHLCData = React.useCallback((): OHLCData[] => {
    const basePrice = executions.length > 0 ? 
      Number(executions[0].limitPrice) / 100 || 100 : 100;
    const data: OHLCData[] = [];
    const startTime = new Date(`${tradeDate} 09:30:00`).getTime();
    const intervalMs = timeInterval === '1m' ? 60000 : 
                      timeInterval === '5m' ? 300000 :
                      timeInterval === '15m' ? 900000 :
                      timeInterval === '1h' ? 3600000 : 86400000;
    
    let currentPrice = basePrice;
    
    for (let i = 0; i < 78; i++) { // ~6.5 hours of market data
      const timestamp = startTime + (i * intervalMs);
      const volatility = 0.02; // 2% volatility
      
      const open = currentPrice;
      const change = (Math.random() - 0.5) * volatility * currentPrice;
      const high = Math.max(open, open + Math.abs(change) * 1.5);
      const low = Math.min(open, open - Math.abs(change) * 1.5);
      const close = open + change;
      
      data.push({
        timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000)
      });
      
      currentPrice = close;
    }
    
    return data;
  }, [executions, tradeDate, timeInterval]);

  // Fetch market data when symbol or interval changes
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!symbol) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/market-data?symbol=${symbol}&date=${tradeDate}&interval=${timeInterval}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch market data');
        }
        
        const data = await response.json();
        setOhlcData(data.ohlc || []);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        // Generate mock data for development
        setOhlcData(generateMockOHLCData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, [symbol, tradeDate, timeInterval, generateMockOHLCData]);

  // Process executions for annotations
  const executionAnnotations = useMemo(() => {
    if (!executions.length) return { yaxis: [], points: [] };
    
    const yAxisAnnotations = executions.map((execution, index) => ({
      y: Number(execution.limitPrice) / 100 || 0,
      borderColor: execution.side === 'BUY' ? '#16A34A' : '#DC2626',
      borderWidth: 2,
      strokeDashArray: selectedExecution === execution.id ? 0 : 5,
      label: {
        text: `${execution.side} ${execution.orderQuantity}@$${((Number(execution.limitPrice) / 100) || 0).toFixed(2)}`,
        style: {
          background: execution.side === 'BUY' ? '#16A34A' : '#DC2626',
          color: '#fff',
          fontSize: '10px'
        },
        position: 'left',
        offsetX: index * 100 // Offset multiple executions
      }
    }));

    const pointAnnotations = executions.map(execution => ({
      x: execution.orderExecutedTime ? new Date(execution.orderExecutedTime).getTime() : Date.now(),
      y: Number(execution.limitPrice) / 100 || 0,
      marker: {
        size: selectedExecution === execution.id ? 10 : 6,
        fillColor: execution.side === 'BUY' ? '#16A34A' : '#DC2626',
        strokeColor: '#fff',
        strokeWidth: 2,
        shape: execution.side === 'BUY' ? 'circle' : 'square'
      },
      label: {
        text: `${execution.orderQuantity}`,
        style: {
          background: execution.side === 'BUY' ? '#16A34A' : '#DC2626',
          color: '#fff',
          fontSize: '8px'
        }
      }
    }));

    return {
      yaxis: yAxisAnnotations,
      points: pointAnnotations
    };
  }, [executions, selectedExecution]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'candlestick',
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
          // Handle execution marker clicks
          const execution = executions[dataPointIndex];
          if (execution) {
            setSelectedExecution(execution.id);
            onExecutionSelect?.(execution);
          }
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#16A34A',
          downward: '#DC2626'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#94a3b8'
        },
        datetimeFormatter: {
          hour: 'HH:mm'
        }
      },
      axisBorder: {
        color: '#334155'
      },
      axisTicks: {
        color: '#334155'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        style: {
          colors: '#94a3b8'
        },
        formatter: (value) => `$${value.toFixed(2)}`
      },
      axisBorder: {
        color: '#334155'
      }
    },
    grid: {
      borderColor: '#334155',
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
        
        const ohlc = ohlcData[dataPointIndex];
        if (!ohlc) return '';
        
        return `
          <div class="apex-tooltip-candlestick">
            <div class="apex-tooltip-title">
              ${new Date(ohlc.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div class="apex-tooltip-body">
              <div>Open: <span class="value">$${ohlc.open.toFixed(2)}</span></div>
              <div>High: <span class="value">$${ohlc.high.toFixed(2)}</span></div>
              <div>Low: <span class="value">$${ohlc.low.toFixed(2)}</span></div>
              <div>Close: <span class="value">$${ohlc.close.toFixed(2)}</span></div>
              ${ohlc.volume ? `<div>Volume: <span class="value">${ohlc.volume.toLocaleString()}</span></div>` : ''}
            </div>
          </div>
        `;
      }
    },
    annotations: executionAnnotations,
    theme: {
      mode: 'dark'
    }
  };

  const chartSeries = [
    {
      name: symbol,
      data: ohlcData.map(d => ({
        x: d.timestamp,
        y: [d.open, d.high, d.low, d.close]
      }))
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
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeInterval} onValueChange={(value: TimeInterval) => setTimeInterval(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="1d">1d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">Error loading chart data</p>
            <p className="text-sm text-muted">{error}</p>
            <p className="text-xs text-muted mt-2">Showing mock data for development</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Chart
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
                          ? 'border-green-500 text-green-600 hover:bg-green-50' 
                          : 'border-red-500 text-red-600 hover:bg-red-50'
                      }`}
                      onClick={() => handleExecutionClick(execution)}
                    >
                      {execution.side} {execution.orderQuantity}@${((Number(execution.limitPrice) / 100) || 0).toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}