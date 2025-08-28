import { useState, useEffect } from 'react';

export type ConsentStatus = 'accepted' | 'essential' | 'declined' | null;

export function useCookieConsent() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check localStorage for existing consent
    const storedConsent = localStorage.getItem('cookie-consent') as ConsentStatus;
    setConsentStatus(storedConsent);
    setIsLoaded(true);
  }, []);

  const acceptAllCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsentStatus('accepted');
  };

  const acceptEssentialCookies = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setConsentStatus('essential');
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setConsentStatus('declined');
  };

  const clearConsent = () => {
    localStorage.removeItem('cookie-consent');
    setConsentStatus(null);
  };

  const hasConsented = () => {
    return consentStatus === 'accepted';
  };

  const hasAnalyticsConsent = () => {
    return consentStatus === 'accepted';
  };

  const needsConsent = () => {
    return consentStatus === null;
  };

  return {
    consentStatus,
    isLoaded,
    acceptAllCookies,
    acceptEssentialCookies,
    declineCookies,
    clearConsent,
    hasConsented,
    hasAnalyticsConsent,
    needsConsent,
  };
} 