"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCookieConsentContext } from './CookieConsentProvider';
import { clearAllCookies } from '@/lib/cookieUtils';

export default function CookieSettings() {
  const { consentStatus, acceptCookies, declineCookies, clearConsent } = useCookieConsentContext();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAcceptAll = () => {
    setIsUpdating(true);
    acceptCookies();
    setTimeout(() => setIsUpdating(false), 1000);
  };

  const handleDeclineAll = () => {
    setIsUpdating(true);
    declineCookies();
    clearAllCookies();
    setTimeout(() => setIsUpdating(false), 1000);
  };



  return (
    <div className="space-y-4 max-w-sm ">
      {/* Current Status */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Current Status</Label>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            consentStatus === 'accepted' ? 'bg-green-500' : 
            consentStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm text-muted-foreground">
            {consentStatus === 'accepted' ? 'Cookies Accepted' :
             consentStatus === 'declined' ? 'Cookies Declined' : 'No Decision Made'}
          </span>
        </div>
      </div>

      {/* Essential Cookies Info */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Essential Cookies</Label>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>These cookies are necessary for the app to function properly:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Authentication cookies</strong> - Keep you signed in for 30 days</li>
            <li><strong>Session cookies</strong> - Remember your preferences and settings</li>
            <li><strong>Security cookies</strong> - Protect your account and data</li>
          </ul>
          <p className="text-xs">
            Note: These cookies cannot be disabled as they are essential for the app to work.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Manage Consent</Label>
        <div className="flex gap-2">
          <Button 
            onClick={handleAcceptAll}
            disabled={isUpdating || consentStatus === 'accepted'}
            className="flex-1"
          >
            {isUpdating ? 'Updating...' : 'Accept All Cookies'}
          </Button>
          <Button 
            onClick={handleDeclineAll}
            variant="outline"
            disabled={isUpdating || consentStatus === 'declined'}
            className="flex-1"
          >
            {isUpdating ? 'Updating...' : 'Decline All Cookies'}
          </Button>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          <strong>What happens when you decline cookies?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>You won't be able to sign in or create an account</li>
          <li>Your preferences won't be saved between sessions</li>
          <li>Some features may not work properly</li>
        </ul>
        <p>
          <strong>What happens when you accept cookies?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>You can sign in and use all app features</li>
          <li>Your preferences and settings will be saved</li>
          <li>You'll stay signed in for 30 days</li>
        </ul>
      </div>
    </div>
  );
} 