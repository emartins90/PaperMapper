"use client";
import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useCookieConsent, ConsentStatus } from '@/hooks/useCookieConsent';
import CookieConsent from './CookieConsent';
import { posthog } from '@/lib/posthog';
import { useUser } from '@/contexts/UserContext';

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
  const { user } = useUser();

  const handleAcceptAll = () => {
    cookieConsent.acceptAllCookies();
    posthog.opt_in_capturing(); // Enable PostHog analytics
  };

  const handleAcceptEssential = () => {
    cookieConsent.acceptEssentialCookies();
    posthog.opt_out_capturing(); // Disable PostHog analytics for essential-only consent
  };

  const handleDecline = () => {
    cookieConsent.declineCookies();
    posthog.opt_out_capturing(); // Disable PostHog analytics
    // Clear any existing cookies if user declines
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  };

  // Handle consent changes after initial setup
  useEffect(() => {
    if (cookieConsent.consentStatus === 'accepted') {
      posthog.opt_in_capturing();
      
      // If user is logged in, identify them in PostHog
      if (user && user.id !== user.email) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.name,
        });
      } else if (user) {
      }
    } else {
      posthog.opt_out_capturing();
    }
  }, [cookieConsent.consentStatus, user]);

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