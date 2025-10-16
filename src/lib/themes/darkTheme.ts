import { Theme } from './types';

export const darkTheme: Theme = {
  name: 'dark',
  displayName: 'Dark Theme',
  colors: {
    // Core colors (adjusted for dark mode)
    green: '#10B981',     // slightly different green for dark backgrounds
    red: '#EF4444',       // slightly different red for dark backgrounds
    primary: '#1F2937',   // dark gray for primary
    secondary: '#111827', // darker gray for secondary
    tertiary: '#3B82F6',  // blue accent for dark mode
    
    // Text colors (inverted for dark mode)
    primaryText: '#F9FAFB',  // white text
    secondaryText: '#F5F5F5', // light gray text
    
    // UI colors (dark mode backgrounds)
    background: '#0F172A',  // very dark background
    surface: '#1E293B',     // dark surface
    border: '#374151',      // dark borders
    muted: '#6B7280',       // muted elements

    // Input and form control colors
    input: '#1E293B',       // dark input background (matches surface)
    ring: '#3B82F6',        // blue focus ring (matches tertiary)
    mutedForeground: '#9CA3AF', // light gray for placeholders
    
    // Semantic colors
    positive: '#10B981',    // maps to green
    negative: '#EF4444',    // maps to red
    warning: '#F59E0B',     // warning stays similar
    info: '#3B82F6',        // maps to tertiary
    
    // Chart colors (adjusted for dark backgrounds)
    chartGrid: '#374151',
    chartAxis: '#9CA3AF',
    chartTooltipBg: '#374151',
    chartTooltipText: '#F9FAFB',
    
    // Hover states
    greenHover: '#059669',   // darker green
    redHover: '#DC2626',     // darker red
    primaryHover: '#374151', // lighter primary
    secondaryHover: '#1F2937', // lighter secondary
    tertiaryHover: '#2563EB'  // darker tertiary
  }
};