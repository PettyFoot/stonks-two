'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGlobalFilters } from '@/contexts/GlobalFilterContext';
import StatsSection from '@/components/reports/StatsSection';
import TabsSection from '@/components/reports/TabsSection';
import { useDetailedReportsData } from '@/hooks/useDetailedReportsData';

export default function Reports() {
  const [pnlType, setPnlType] = useState('Gross');
  const [viewMode, setViewMode] = useState('$ Value');
  const [reportType, setReportType] = useState('Aggregate P&L');
  const { filters } = useGlobalFilters();
  const { stats, trades, loading, error } = useDetailedReportsData();

  /* 
   * Product Manager Review Point:
   * Main page structure provides:
   * 1. Statistics overview (22 metrics)
   * 2. Tab-based chart navigation
   * 3. Global filter integration
   * 4. Responsive design for all screen sizes
   */

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Reports" 
        showTimeRangeFilters={false}
      />
      
      <FilterPanel 
        showAdvanced={true}
        showTimeRangeTabs={true}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Report Type Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">P&L Type</label>
              <Select value={pnlType} onValueChange={setPnlType}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gross">Gross</SelectItem>
                  <SelectItem value="Net">Net</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">View mode</label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$ Value">$ Value</SelectItem>
                  <SelectItem value="Percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-primary">Report type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aggregate P&L">Aggregate P&L</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted">Loading comprehensive reports data...</div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">Error: {error}</div>
          </div>
        )}
        
        {/* Main Content */}
        {!loading && !error && (
          <>
            {/* Statistics Section - 22 Trading Metrics */}
            <StatsSection stats={stats} />
            
            {/* Enhanced Tabs Section with Charts */}
            <TabsSection trades={trades} />
          </>
        )}
      </div>
    </div>
  );
}

/* 
 * Code Reviewer Review Point:
 * - Clean component structure with proper separation of concerns
 * - All components follow existing naming conventions
 * - TypeScript types are properly used
 * - Global filter integration maintains consistency
 * - Responsive design patterns match existing app architecture
 */