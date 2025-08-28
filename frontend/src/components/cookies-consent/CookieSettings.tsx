"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCookieConsentContext } from './CookieConsentProvider';
import { ConsentStatus } from '@/hooks/useCookieConsent';
import { clearAllCookies } from '@/lib/cookieUtils';

export default function CookieSettings() {
  const { consentStatus, acceptAllCookies, acceptEssentialCookies, declineCookies, clearConsent } = useCookieConsentContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentStatus | null>(null);

  // Initialize selected consent when component loads
  useEffect(() => {
    setSelectedConsent(consentStatus);
  }, [consentStatus]);

  const hasChanges = selectedConsent !== consentStatus;

  const handleAcceptAll = () => {
    setIsUpdating(true);
    acceptAllCookies();
    setTimeout(() => setIsUpdating(false), 1000);
  };

  const handleAcceptEssential = () => {
    setIsUpdating(true);
    acceptEssentialCookies();
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
            consentStatus === 'essential' ? 'bg-blue-500' :
            consentStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <span className="text-sm text-muted-foreground">
            {consentStatus === 'accepted' ? 'All Cookies Accepted' :
             consentStatus === 'essential' ? 'Essential Cookies Only' :
             consentStatus === 'declined' ? 'Cookies Declined' : 'No Decision Made'}
          </span>
        </div>
        {hasChanges && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-sm text-orange-600 font-medium">
              Pending: {selectedConsent === 'accepted' ? 'All Cookies' :
                        selectedConsent === 'essential' ? 'Essential Only' :
                        'Decline All'} (click Save Changes to apply)
            </span>
          </div>
        )}
      </div>



      {/* Consent Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Manage Consent</Label>
        <RadioGroup 
          value={selectedConsent || ''} 
          onValueChange={(value: string) => {
            if (value === 'accepted') {
              setSelectedConsent('accepted');
            } else if (value === 'essential') {
              setSelectedConsent('essential');
            } else if (value === 'declined') {
              setSelectedConsent('declined');
            }
          }}
          disabled={isUpdating}
          className="w-full space-y-1"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="accepted" id="accepted" />
            <Label htmlFor="accepted">Accept All Cookies</Label>
          </div>
          
          <div className="flex items-center gap-3">
            <RadioGroupItem value="essential" id="essential" />
            <Label htmlFor="essential">Essential Only</Label>
          </div>
          
          <div className="flex items-center gap-3">
            <RadioGroupItem value="declined" id="declined" />
            <Label htmlFor="declined">Decline All</Label>
          </div>
        </RadioGroup>
        
        {/* Save Changes Button */}
        {hasChanges && (
          <Button 
            onClick={() => {
              if (selectedConsent === 'accepted') {
                handleAcceptAll();
              } else if (selectedConsent === 'essential') {
                handleAcceptEssential();
              } else if (selectedConsent === 'declined') {
                handleDeclineAll();
              }
            }}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
        
        {isUpdating && (
          <p className="text-xs text-muted-foreground text-center">
            Updating preferences...
          </p>
        )}
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
          <strong>What happens when you accept essential cookies only?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>You can sign in and use all app features</li>
          <li>Your preferences and settings will be saved</li>
          <li>You'll stay signed in for 30 days</li>
          <li>No analytics data will be collected</li>
        </ul>
        <p>
          <strong>What happens when you accept all cookies?</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Everything from essential cookies, plus:</li>
          <li>Analytics data helps us improve the app</li>
          <li>We can identify and fix issues faster</li>
          <li>Better understanding of feature usage</li>
        </ul>
      </div>
    </div>
  );
} 