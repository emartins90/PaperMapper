import { useState, useEffect } from 'react';

export type ConsentStatus = 'accepted' | 'declined' | null;

export function useCookieConsent() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check localStorage for existing consent
    const storedConsent = localStorage.getItem('cookie-consent') as ConsentStatus;
    setConsentStatus(storedConsent);
    setIsLoaded(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsentStatus('accepted');
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

  const needsConsent = () => {
    return consentStatus === null;
  };

  return {
    consentStatus,
    isLoaded,
    acceptCookies,
    declineCookies,
    clearConsent,
    hasConsented,
    needsConsent,
  };
} 