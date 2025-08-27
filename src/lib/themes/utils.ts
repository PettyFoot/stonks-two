import { Theme } from './types';

export const applyThemeToDOM = (theme: Theme): void => {
  const root = document.documentElement;
  
  // Apply all theme colors as CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
  
  // Set data attribute for theme name (useful for additional CSS targeting)
  root.setAttribute('data-theme', theme.name);
};

export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - returns black or white based on background brightness
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16); 
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return brightness > 128 ? '#000000' : '#FFFFFF';
};

export const lightenColor = (color: string, percent: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent / 100));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export const darkenColor = (color: string, percent: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.max(0, Math.floor(r * (100 - percent) / 100));
  const newG = Math.max(0, Math.floor(g * (100 - percent) / 100));
  const newB = Math.max(0, Math.floor(b * (100 - percent) / 100));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export const saveThemePreference = (themeName: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-theme', themeName);
  }
};

export const getThemePreference = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('preferred-theme');
  }
  return null;
};