import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  priority = false,
  sizes,
  quality = 85
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(className)}
      priority={priority}
      sizes={sizes}
      quality={quality}
      loading={priority ? 'eager' : 'lazy'}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyatNeauiOPTcPKPf2gA1zvBvIGigx7sHmq45yP/9k="
    />
  );
}

// Configuration for different logo sizes
const LOGO_CONFIG = {
  src: '/trade-voyager-logo.png', // Configurable logo path
  alt: 'Trade Voyager Analytics - Professional Trading Analytics Platform'
};

// Logo component with multiple sizes
export function OptimizedLogo({ 
  className, 
  size = 'medium',
  priority = false 
}: { 
  className?: string; 
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  priority?: boolean;
}) {
  const sizeConfig = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 },
    large: { width: 64, height: 64 },
    xlarge: { width: 96, height: 96 },
    xxlarge: { width: 192, height: 192 }
  };

  const { width, height } = sizeConfig[size];

  return (
    <OptimizedImage
      src={LOGO_CONFIG.src}
      alt={LOGO_CONFIG.alt}
      width={width}
      height={height}
      className={cn('rounded-lg', className)}
      priority={priority}
      sizes={`${width}px`}
      quality={90}
    />
  );
}