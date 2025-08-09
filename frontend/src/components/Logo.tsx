import Image from 'next/image';
import { useState } from 'react';
import { logoConfig, getLogoSource, getLogoDimensions } from '@/lib/logoConfig';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  variant?: 'primary' | 'rounded' | 'plain';
}

export default function Logo({ 
  width = 40, 
  height = 40, 
  className = "", 
  priority = false,
  variant = 'rounded'
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  // If there's an error with the image, fall back to the text logo
  if (imageError) {
    return (
      <div className={`w-10 h-10 bg-primary rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-sm">PT</span>
      </div>
    );
  }

  // Handle different variants
  if (variant === 'plain') {
    return (
      <div className="flex items-center">
        <Image
          src={getLogoSource('primary', 'svg')}
          alt={logoConfig.altText}
          width={width}
          height={height}
          className={className}
          priority={priority}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Default variant is 'rounded' - logo with rounded square background
  return (
    <div className="flex items-center">
      <div className={`bg-primary rounded-lg flex items-center justify-center ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
        <Image
          src={getLogoSource('primary', 'svg')}
          alt={logoConfig.altText}
          width={Math.max(width - 12, 16)} // Balanced padding around the logo
          height={Math.max(height - 12, 16)}
          className="filter brightness-0 invert" // Makes the logo white
          priority={priority}
          onError={() => setImageError(true)}
        />
      </div>
    </div>
  );
}

// Alternative logo component for when you want just the icon without text
export function LogoIcon({ 
  width = 40, 
  height = 40, 
  className = "", 
  priority = false,
  variant = 'rounded'
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className={`w-10 h-10 bg-primary rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-sm">PT</span>
      </div>
    );
  }

  // Handle different variants
  if (variant === 'plain') {
    return (
      <Image
        src={getLogoSource('primary', 'svg')}
        alt={logoConfig.altText}
        width={width}
        height={height}
        className={className}
        priority={priority}
        onError={() => setImageError(true)}
      />
    );
  }

  // Default variant is 'rounded' - logo with rounded square background
  return (
    <div className={`bg-primary rounded-lg flex items-center justify-center ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
      <Image
        src={getLogoSource('primary', 'svg')}
        alt={logoConfig.altText}
        width={Math.max(width - 12, 16)} // Balanced padding around the logo
        height={Math.max(height - 12, 16)}
        className="filter brightness-0 invert" // Makes the logo white
        priority={priority}
        onError={() => setImageError(true)}
      />
    </div>
  );
} 