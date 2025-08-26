export const CHART_HEIGHTS = {
  XS: 150,  // Extra Small - Base unit (1x)
  SM: 300,  // Small - 2x base
  MD: 450,  // Medium - 3x base  
  LG: 600,  // Large - 4x base
} as const;

export type ChartHeight = keyof typeof CHART_HEIGHTS;