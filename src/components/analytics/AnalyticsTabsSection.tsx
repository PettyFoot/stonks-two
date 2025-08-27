'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsData } from '@/types';

// Import tab components
import DaysTimesTab from './tabs/DaysTimesTab';
import PriceVolumeTab from './tabs/PriceVolumeTab';
import InstrumentTab from './tabs/InstrumentTab';
import WinLossExpectationTab from './tabs/WinLossExpectationTab';
// import MarketBehaviorTab from './tabs/MarketBehaviorTab';
// import LiquidityTab from './tabs/LiquidityTab';

interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<AnalyticsTabContentProps>;
  enabled: boolean;
  contextSpecific?: boolean;
}

interface AnalyticsTabContentProps {
  data: AnalyticsData;
  context: 'detailed' | 'win-loss-days';
}

interface AnalyticsTabsSectionProps {
  data: AnalyticsData;
  context: 'detailed' | 'win-loss-days';
  availableTabs?: string[];
  className?: string;
}

// Placeholder component for tabs not yet implemented
const PlaceholderTab: React.FC<AnalyticsTabContentProps> = ({  }) => (
  <Card className="bg-theme-surface border-theme-border">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-medium text-theme-primary-text">Coming Soon</CardTitle>
    </CardHeader>
    <CardContent className="h-64">
      <div className="flex items-center justify-center h-full text-theme-secondary-text">
        This tab will be implemented in the next phase
      </div>
    </CardContent>
  </Card>
);

// Tab configuration
const tabConfigurations: Record<string, TabConfig> = {
  'days-times': {
    id: 'days-times',
    label: 'Days/Times',
    component: DaysTimesTab,
    enabled: true,
  },
  'price-volume': {
    id: 'price-volume',
    label: 'Price/Volume',
    component: PriceVolumeTab,
    enabled: true,
  },
  'instrument': {
    id: 'instrument',
    label: 'Instrument',
    component: InstrumentTab,
    enabled: true,
  },
  'win-loss-expectation': {
    id: 'win-loss-expectation',
    label: 'Win/Loss/Expectation',
    component: WinLossExpectationTab,
    enabled: true,
  },
  'market-behavior': {
    id: 'market-behavior',
    label: 'Market Behavior',
    component: PlaceholderTab,
    enabled: true,
  },
  'liquidity': {
    id: 'liquidity',
    label: 'Liquidity',
    component: PlaceholderTab,
    enabled: true,
  },
};

// Context-specific tab availability
const contextTabsMap = {
  detailed: ['days-times', 'price-volume', 'instrument', 'win-loss-expectation', 'market-behavior', 'liquidity'],
  'win-loss-days': ['days-times', 'price-volume', 'instrument', 'win-loss-expectation', 'market-behavior', 'liquidity'],
};

export default function AnalyticsTabsSection({ 
  data, 
  context, 
  availableTabs,
  className = '' 
}: AnalyticsTabsSectionProps) {
  // Determine which tabs to show based on context and availability
  const tabsToShow = availableTabs || contextTabsMap[context] || ['days-times'];
  const enabledTabs = tabsToShow.filter(tabId => tabConfigurations[tabId]?.enabled);
  
  // Default to first enabled tab
  const [activeTab, setActiveTab] = useState(enabledTabs[0] || 'days-times');

  // Early return if no data
  if (!data) {
    return (
      <Card className="bg-theme-surface border-theme-border">
        <CardContent className="h-64">
          <div className="flex items-center justify-center h-full text-theme-secondary-text">
            No analytics data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-center">
          <TabsList className="grid w-fit bg-theme-surface/50 p-1 rounded-lg" style={{ gridTemplateColumns: `repeat(${enabledTabs.length}, 1fr)` }}>
          {enabledTabs.map((tabId) => {
            const tabConfig = tabConfigurations[tabId];
            if (!tabConfig) return null;
            
            return (
              <TabsTrigger
                key={tabId}
                value={tabId}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground transition-all duration-200"
              >
                {tabConfig.label}
              </TabsTrigger>
            );
          })}
          </TabsList>
        </div>

        {/* Tab Content */}
        {enabledTabs.map((tabId) => {
          const tabConfig = tabConfigurations[tabId];
          if (!tabConfig) return null;

          const TabComponent = tabConfig.component;

          return (
            <TabsContent key={tabId} value={tabId} className="space-y-6">
              <TabComponent data={data} context={context} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// Export types for use in tab components
export type { AnalyticsTabContentProps };