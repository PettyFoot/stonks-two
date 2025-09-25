'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FeatureImage {
  src: string;
  title: string;
  description: string;
}

const featureImages: FeatureImage[] = [
  {
    src: '/features/import-page.png',
    title: 'Import & Broker Integration',
    description: 'Connect your broker directly or upload CSV files with AI-powered column mapping and real-time validation.'
  },
  {
    src: '/features/records-chart.png',
    title: 'Trade Records & Charts',
    description: 'View detailed trade records with interactive charts, entry/exit markers, and comprehensive execution data.'
  },
  {
    src: '/features/dashboard-metrics.png',
    title: 'Dashboard Analytics',
    description: 'Get comprehensive performance metrics with P&L tracking, win/loss ratios, and advanced trading statistics.'
  },
  {
    src: '/features/calendar-view.png',
    title: 'Calendar Visualization',
    description: 'Visualize your trading performance over time with intuitive calendar views and daily P&L breakdowns.'
  },
  {
    src: '/features/reports-overview.png',
    title: 'Professional Reports',
    description: 'Generate detailed reports with multiple chart types including day/time distributions and volume analysis.'
  },
  {
    src: '/features/winloss-analysis.png',
    title: 'Win/Loss Analysis',
    description: 'Analyze your trading performance with detailed win/loss ratios, expectation values, and drawdown metrics.'
  },
  {
    src: '/features/price-volume-reports.png',
    title: 'Price & Volume Analytics',
    description: 'Deep dive into price and volume distribution patterns to optimize your trading strategies.'
  },
  {
    src: '/features/detailed-metrics.png',
    title: 'Detailed Performance Metrics',
    description: 'Comprehensive trading statistics including profit factors, hold times, and comparative analysis.'
  }
];

export default function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featureImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + featureImages.length) % featureImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featureImages.length);
  };

  const handleMouseEnter = () => {
    setIsPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsPlaying(true);
  };


  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-[var(--theme-primary-text)] mb-4">
          See Our Platform in Action
        </h2>
        <p className="text-xl text-[var(--theme-primary-text)] max-w-3xl mx-auto">
          Explore the powerful features and intuitive interface that make Trade Voyager Analytics the preferred choice for professional traders.
        </p>
      </div>

      <div
        className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Main Image Display */}
        <div className="relative aspect-video w-full overflow-hidden">
          {featureImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image.src}
                alt={image.title}
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                priority={index === 0}
              />
            </div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-[var(--theme-primary-text)] mb-3">
              {featureImages[currentIndex].title}
            </h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {featureImages[currentIndex].description}
            </p>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center space-x-3">
            {featureImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-[var(--theme-tertiary)] scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}