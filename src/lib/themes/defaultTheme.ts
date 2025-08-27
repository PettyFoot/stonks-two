import { Theme } from './types';

export const defaultTheme: Theme = {
  name: 'default',
  displayName: 'Default Theme',
  colors: {
    // Core colors (as specified)
    green: '#15A349',
    red: '#F40000', 
    primary: '#D8D4D5',
    secondary: '#2B4141',
    tertiary: '#5688C7',
    
    // Text colors
    primaryText: '#000000',
    secondaryText: '#53565c',
    
    // UI colors (for backgrounds, surfaces, etc.)
    background: '#F6F7FB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    muted: '#9CA3AF',
    
    // Semantic colors (mapped to core colors)
    positive: '#15A349',  // maps to green
    negative: '#F40000',  // maps to red  
    warning: '#F59E0B',
    info: '#5688C7',      // maps to tertiary
    
    // Chart colors
    chartGrid: '#E5E7EB',
    chartAxis: '#6B7280', 
    chartTooltipBg: '#1F2937',
    chartTooltipText: '#FFFFFF',
    
    // Hover states (darker variants)
    greenHover: '#0F7A35',    // darker green
    redHover: '#C80000',      // darker red
    primaryHover: '#C0BCBD',  // darker primary
    secondaryHover: '#1E2D2D', // darker secondary  
    tertiaryHover: '#4A73A3'  // darker tertiary
  }
};