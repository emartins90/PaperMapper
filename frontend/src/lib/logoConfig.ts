// Logo configuration for Paper Thread
export const logoConfig = {
  // Main logo variants
  variants: {
    primary: {
      svg: '/PaperThreadLogo.svg',
      png: '/PaperThreadLogo60.png',
      webp: '/PaperThreadLogo60.png', // Using PNG as fallback since WebP not available
      fallback: '/PaperThreadLogo60.png'
    },
    // Logo with rounded square background (primary color with white logo)
    rounded: {
      svg: '/PaperThreadLogo.svg',
      png: '/PaperThreadLogo60.png',
      webp: '/PaperThreadLogo60.png',
      fallback: '/PaperThreadLogo60.png'
    },
    // Plain logo without background
    plain: {
      svg: '/PaperThreadLogo.svg',
      png: '/PaperThreadLogo60.png',
      webp: '/PaperThreadLogo60.png',
      fallback: '/PaperThreadLogo60.png'
    },
    // Add more variants as needed (e.g., white version for dark backgrounds)
    white: {
      svg: '/images/logo-white.svg',
      png: '/images/logo-white.png',
      webp: '/images/logo-white.webp',
      fallback: '/images/logo-white.png'
    }
  },
  
  // Default dimensions
  dimensions: {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 48, height: 48 },
    xlarge: { width: 64, height: 64 }
  },
  
  // Alt text for accessibility
  altText: 'Paper Thread Logo',
  
  // Logo with text (for headers)
  withText: {
    text: 'Paper Thread',
    textClassName: 'text-2xl font-bold text-gray-900'
  }
};

// Helper function to get logo source with fallback
export function getLogoSource(variant: keyof typeof logoConfig.variants = 'primary', format: 'svg' | 'png' | 'webp' = 'svg') {
  const variantConfig = logoConfig.variants[variant];
  return variantConfig[format] || variantConfig.fallback;
}

// Helper function to get logo dimensions
export function getLogoDimensions(size: keyof typeof logoConfig.dimensions = 'medium') {
  return logoConfig.dimensions[size];
} 