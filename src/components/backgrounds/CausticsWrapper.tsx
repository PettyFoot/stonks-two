'use client';

import React from 'react';
import WebGLCausticsBackground from './WebGLCausticsBackground';

interface CausticsWrapperProps {
  children: React.ReactNode;
  variant?: 'ocean' | 'pool' | 'deep' | 'light' | 'custom';
  intensity?: number;
  speed?: number;
  customColor?: [number, number, number];
  customBackgroundColor?: [number, number, number];
  className?: string;
}

const CausticsWrapper: React.FC<CausticsWrapperProps> = ({
  children,
  variant = 'ocean',
  intensity,
  speed,
  customColor,
  customBackgroundColor,
  className = ''
}) => {
  // Preset configurations for different variants
  const presets = {
    ocean: {
      color: [0.7, 0.9, 1.0] as [number, number, number],
      backgroundColor: [0.05, 0.15, 0.3] as [number, number, number],
      intensity: 0.8,
      speed: 1.0
    },
    pool: {
      color: [0.8, 1.0, 1.0] as [number, number, number],
      backgroundColor: [0.1, 0.3, 0.5] as [number, number, number],
      intensity: 0.9,
      speed: 1.2
    },
    deep: {
      color: [0.4, 0.6, 0.8] as [number, number, number],
      backgroundColor: [0.02, 0.08, 0.15] as [number, number, number],
      intensity: 0.6,
      speed: 0.8
    },
    light: {
      color: [0.9, 0.95, 1.0] as [number, number, number],
      backgroundColor: [0.2, 0.4, 0.6] as [number, number, number],
      intensity: 1.0,
      speed: 1.5
    },
    custom: {
      color: customColor || [0.9, 1.0, 1.0],
      backgroundColor: customBackgroundColor || [0.05, 0.2, 0.35],
      intensity: intensity || 0.8,
      speed: speed || 1.0
    }
  };

  const config = presets[variant];

  return (
    <div className={`relative ${className}`}>
      <WebGLCausticsBackground
        intensity={intensity ?? config.intensity}
        speed={speed ?? config.speed}
        color={customColor || config.color}
        backgroundColor={customBackgroundColor || config.backgroundColor}
        fallbackToCSS={true}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default CausticsWrapper;