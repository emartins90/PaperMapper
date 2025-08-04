// Device detection utility
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check for touch support
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getDeviceSpecificAction(): string {
  return isTouchDevice() ? 'tap' : 'click';
}

// Mobile device detection
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check screen width for mobile devices (phones, not tablets)
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Mobile phones typically have width <= 768px and aspect ratio > 1.2 (portrait)
  // Tablets typically have width > 768px or aspect ratio <= 1.2 (landscape)
  const isSmallScreen = screenWidth <= 768;
  const isPortrait = screenHeight > screenWidth * 1.2;
  
  // Consider it mobile if it's a small screen in portrait mode (phone)
  // or if it's a very small screen regardless of orientation
  return isSmallScreen && (isPortrait || screenWidth <= 480);
}

// Check if device is a tablet (not mobile phone)
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Tablets typically have width > 768px or are in landscape mode
  const isLargeScreen = screenWidth > 768;
  const isLandscape = screenWidth > screenHeight * 1.2;
  
  return isLargeScreen || isLandscape;
} 