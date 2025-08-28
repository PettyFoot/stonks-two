import { Theme } from './types';

export const partyTheme: Theme = {
  name: 'party',
  displayName: 'Party Theme',
  colors: {
    // Core colors (vibrant/fun colors)
    green: '#84CC16',     // lime green 
    red: '#F97316',       // orange-red
    primary: '#8B5CF6',   // purple
    secondary: '#EC4899', // pink
    tertiary: '#06B6D4',  // cyan
    
    // Text colors
    primaryText: '#1F2937',  // dark text for readability
    secondaryText: '#F5F5F5', // gray text
    
    // UI colors (bright/fun theme)
    background: '#FEF3C7',  // light yellow background
    surface: '#FFFFFF',     // white surfaces
    border: '#D1D5DB',      // light borders
    muted: '#9CA3AF',       // muted elements
    
    // Semantic colors
    positive: '#84CC16',    // maps to green (lime)
    negative: '#F97316',    // maps to red (orange)
    warning: '#FBBF24',     // yellow warning
    info: '#06B6D4',        // maps to tertiary (cyan)
    
    // Chart colors (vibrant theme)
    chartGrid: '#E5E7EB',
    chartAxis: '#6B7280',
    chartTooltipBg: '#8B5CF6',
    chartTooltipText: '#FFFFFF',
    
    // Hover states
    greenHover: '#65A30D',   // darker lime
    redHover: '#EA580C',     // darker orange
    primaryHover: '#7C3AED', // darker purple
    secondaryHover: '#DB2777', // darker pink
    tertiaryHover: '#0891B2'  // darker cyan
  }
};