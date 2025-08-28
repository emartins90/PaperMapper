"use client";
import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useCookieConsent, ConsentStatus } from '@/hooks/useCookieConsent';
import CookieConsent from './CookieConsent';
import { enablePostHog, disablePostHog } from '@/lib/posthog';

interface CookieConsentContextType {
  consentStatus: ConsentStatus;
  isLoaded: boolean;
  acceptAllCookies: () => void;
  acceptEssentialCookies: () => void;
  declineCookies: () => void;
  clearConsent: () => void;
  hasConsented: () => boolean;
  needsConsent: () => boolean;
  hasAnalyticsConsent: () => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function useCookieConsentContext() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsentContext must be used within a CookieConsentProvider');
  }
  return context;
}

interface CookieConsentProviderProps {
  children: ReactNode;
}

export default function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const cookieConsent = useCookieConsent();

  const handleAcceptAll = () => {
    cookieConsent.acceptAllCookies();
    enablePostHog(); // Enable analytics
    console.log('All cookies accepted');
  };

  const handleAcceptEssential = () => {
    cookieConsent.acceptEssentialCookies();
    disablePostHog(); // Disable analytics for essential-only consent
    console.log('Essential cookies accepted');
  };

  const handleDecline = () => {
    cookieConsent.declineCookies();
    disablePostHog(); // Disable analytics
    // Clear any existing cookies if user declines
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('Cookies declined');
  };

  // Handle consent changes after initial setup
  useEffect(() => {
    if (cookieConsent.consentStatus === 'accepted') {
      enablePostHog();
    } else {
      disablePostHog();
    }
  }, [cookieConsent.consentStatus]);

  return (
    <CookieConsentContext.Provider value={{
      ...cookieConsent,
      hasAnalyticsConsent: cookieConsent.hasAnalyticsConsent
    }}>
      {children}
      {cookieConsent.needsConsent() && (
        <CookieConsent 
          onAcceptAll={handleAcceptAll} 
          onAcceptEssential={handleAcceptEssential}
          onDecline={handleDecline} 
        />
      )}
    </CookieConsentContext.Provider>
  );
} 