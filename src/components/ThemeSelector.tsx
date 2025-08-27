'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/lib/themes';

const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeSelect = (theme: Theme) => {
    setTheme(theme);
    setIsOpen(false);
  };

  const getThemePreview = (theme: Theme) => {
    return (
      <div className="flex space-x-1">
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ backgroundColor: theme.colors.green }}
        />
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ backgroundColor: theme.colors.red }}
        />
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ backgroundColor: theme.colors.primary }}
        />
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ backgroundColor: theme.colors.secondary }}
        />
        <div 
          className="w-4 h-4 rounded-full border"
          style={{ backgroundColor: theme.colors.tertiary }}
        />
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md border border-default bg-surface hover:bg-primary/10 transition-colors"
      >
        <span className="text-sm font-medium text-primary">Theme:</span>
        <span className="text-sm text-secondary">{currentTheme.displayName}</span>
        {getThemePreview(currentTheme)}
        <svg 
          className={`w-4 h-4 transition-transform text-secondary ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-surface border border-default z-50">
          <div className="p-2">
            <h3 className="text-sm font-semibold text-primary mb-3 px-2">Select Theme</h3>
            <div className="space-y-1">
              {availableThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeSelect(theme)}
                  className={`w-full flex items-center justify-between p-3 rounded-md transition-colors ${
                    currentTheme.name === theme.name 
                      ? 'bg-positive/10 border border-positive' 
                      : 'hover:bg-primary/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-primary">
                        {theme.displayName}
                      </span>
                      <span className="text-xs text-secondary">
                        {theme.name === 'default' && 'Classic trading colors'}
                        {theme.name === 'dark' && 'Dark mode with muted colors'}
                        {theme.name === 'party' && 'Fun and vibrant colors'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {getThemePreview(theme)}
                    <div className="text-xs text-secondary space-y-1">
                      <div className="flex items-center space-x-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.colors.green }}
                        />
                        <span>Profit</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.colors.red }}
                        />
                        <span>Loss</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="border-t border-default p-3">
            <p className="text-xs text-secondary">
              Theme changes apply instantly across the entire application. 
              Your preference is saved automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;