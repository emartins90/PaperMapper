"use client";
import { createContext, useContext, ReactNode } from 'react';
import { useCookieConsent, ConsentStatus } from '@/hooks/useCookieConsent';
import CookieConsent from './CookieConsent';

interface CookieConsentContextType {
  consentStatus: ConsentStatus;
  isLoaded: boolean;
  acceptCookies: () => void;
  declineCookies: () => void;
  clearConsent: () => void;
  hasConsented: () => boolean;
  needsConsent: () => boolean;
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

  const handleAccept = () => {
    cookieConsent.acceptCookies();
    // You can add analytics tracking here if needed
    console.log('Cookies accepted');
  };

  const handleDecline = () => {
    cookieConsent.declineCookies();
    // Clear any existing cookies if user declines
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('Cookies declined');
  };

  return (
    <CookieConsentContext.Provider value={cookieConsent}>
      {children}
      {cookieConsent.needsConsent() && (
        <CookieConsent onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </CookieConsentContext.Provider>
  );
} 