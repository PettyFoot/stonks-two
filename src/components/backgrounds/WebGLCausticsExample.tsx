'use client';

import React from 'react';
import { WebGLCausticsBackground, CausticsWrapper } from './index';

// Example 1: Direct usage with WebGLCausticsBackground
export const DirectCausticsExample: React.FC = () => {
  return (
    <div className="min-h-screen relative">
      {/* WebGL Caustics Background */}
      <WebGLCausticsBackground
        intensity={0.8}
        speed={1.0}
        color={[0.8, 1.0, 1.0]} // Bright cyan-white
        backgroundColor={[0.05, 0.2, 0.35]} // Dark blue
        fallbackToCSS={true}
      />
      
      {/* Your content goes here */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg">
          <h1 className="text-4xl font-bold text-white mb-4">
            WebGL Caustics Background
          </h1>
          <p className="text-xl text-white/80">
            Beautiful animated caustics using WebGL shaders
          </p>
        </div>
      </div>
    </div>
  );
};

// Example 2: Using CausticsWrapper with preset variants
export const WrappedCausticsExample: React.FC = () => {
  return (
    <CausticsWrapper variant="ocean" className="min-h-screen">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg">
          <h1 className="text-4xl font-bold text-white mb-4">
            Caustics Wrapper Example
          </h1>
          <p className="text-xl text-white/80">
            Using the ocean preset variant
          </p>
        </div>
      </div>
    </CausticsWrapper>
  );
};

// Example 3: Multiple preset variants showcase
export const VariantsShowcase: React.FC = () => {
  const variants: Array<'ocean' | 'pool' | 'deep' | 'light'> = ['ocean', 'pool', 'deep', 'light'];
  
  return (
    <div className="grid grid-cols-2 gap-4 h-screen p-4">
      {variants.map((variant) => (
        <CausticsWrapper key={variant} variant={variant} className="relative rounded-lg overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 bg-white/20 backdrop-blur-sm rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-2 capitalize">
                {variant}
              </h3>
              <p className="text-white/80">
                Preset variant
              </p>
            </div>
          </div>
        </CausticsWrapper>
      ))}
    </div>
  );
};

// Example 4: Custom configuration
export const CustomCausticsExample: React.FC = () => {
  return (
    <CausticsWrapper 
      variant="custom"
      intensity={1.2}
      speed={0.6}
      customColor={[1.0, 0.8, 0.9]} // Pink-ish caustics
      customBackgroundColor={[0.1, 0.05, 0.15]} // Dark purple
      className="min-h-screen"
    >
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg">
          <h1 className="text-4xl font-bold text-white mb-4">
            Custom Caustics
          </h1>
          <p className="text-xl text-white/80">
            Pink caustics on dark purple background
          </p>
        </div>
      </div>
    </CausticsWrapper>
  );
};

// Example 5: Integration with existing layout
export const LayoutIntegrationExample: React.FC = () => {
  return (
    <>
      {/* Add caustics as background to any existing component */}
      <WebGLCausticsBackground 
        intensity={0.9}
        speed={1.2}
        color={[0.8, 1.0, 1.0]}
        backgroundColor={[0.1, 0.3, 0.5]}
        fallbackToCSS={true}
      />
      
      {/* Your existing layout/content */}
      <div className="relative z-10 min-h-screen">
        <nav className="p-6 bg-white/10 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">My App</h1>
        </nav>
        
        <main className="container mx-auto p-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-8 mb-6">
            <h2 className="text-3xl font-bold text-white mb-4">Content Section</h2>
            <p className="text-white/80">
              This content sits above the animated caustics background.
              The caustics provide a beautiful, subtle animation without
              interfering with readability.
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default {
  DirectCausticsExample,
  WrappedCausticsExample,
  VariantsShowcase,
  CustomCausticsExample,
  LayoutIntegrationExample
};