export interface ThemeColors {
  // Main theme colors
  green: string;      // profit/long/positive
  red: string;        // loss/short/negative  
  primary: string;    // main UI color
  secondary: string;  // secondary UI elements
  tertiary: string;   // accent/highlights
  
  // Text colors
  primaryText: string;
  secondaryText: string;
  
  // Derived/computed colors for UI consistency
  background: string;
  surface: string;
  border: string;
  muted: string;
  
  // Semantic colors (mapped to main colors)
  positive: string;   // maps to green
  negative: string;   // maps to red
  warning: string;
  info: string;
  
  // Chart-specific colors
  chartGrid: string;
  chartAxis: string;
  chartTooltipBg: string;
  chartTooltipText: string;
  
  // Hover states (darker variants)
  greenHover: string;
  redHover: string;
  primaryHover: string;
  secondaryHover: string;
  tertiaryHover: string;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
}

export type ThemeMode = 'default' | 'dark' | 'party';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentMode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  availableThemes: Theme[];
}