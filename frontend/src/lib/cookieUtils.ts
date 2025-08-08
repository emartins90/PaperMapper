/**
 * Utility functions for cookie consent management
 */

export function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookie-consent') === 'accepted';
}

export function clearAllCookies(): void {
  if (typeof window === 'undefined') return;
  
  // Clear all cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
}

export function shouldShowConsentBanner(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookie-consent') === null;
}

/**
 * Wrapper for fetch that checks cookie consent before making authenticated requests
 */
export async function fetchWithConsent(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // If this is an authenticated request and user hasn't consented to cookies
  if (options.credentials === 'include' && !hasCookieConsent()) {
    throw new Error('Cookie consent required for authenticated requests');
  }
  
  return fetch(url, options);
}

/**
 * Check if user can perform authenticated actions
 */
export function canPerformAuthenticatedActions(): boolean {
  return hasCookieConsent();
} 