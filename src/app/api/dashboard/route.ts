import { NextResponse } from 'next/server';
import { mockDayData, mockKPIData, mockCumulativePnl } from '@/data/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30';
  
  // In a real app, this would filter based on the date range
  const dashboardData = {
    dayData: mockDayData,
    kpiData: mockKPIData,
    cumulativePnl: mockCumulativePnl,
    summary: {
      totalTrades: mockKPIData.totalTrades,
      totalPnl: mockKPIData.totalPnl,
      winRate: mockKPIData.winRate,
      avgWin: mockKPIData.avgWinningTrade,
      avgLoss: mockKPIData.avgLosingTrade,
      bestDay: mockKPIData.bestDay,
      worstDay: mockKPIData.worstDay
    }
  };
  
  return NextResponse.json(dashboardData);
}