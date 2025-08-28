"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LuX } from 'react-icons/lu';

interface CookieConsentProps {
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
  onDecline: () => void;
}

export default function CookieConsent({ onAcceptAll, onAcceptEssential, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
    onAcceptAll();
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setIsVisible(false);
    onAcceptEssential();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
    onDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <Card className="max-w-4xl mx-auto py-1 shadow-none">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">We use cookies</h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to keep you signed in and provide a better experience.
              </p>
              <div className="text-xs text-muted-foreground">
                <p><strong>Essential cookies</strong> keep you signed in and remember your preferences.</p>
                <p><strong>Analytics cookies</strong> help us improve the app by understanding usage patterns.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAcceptAll}>
                Accept All Cookies
              </Button>
              <Button onClick={handleAcceptEssential} variant="secondary">
                Accept Essential Only
              </Button>
              <Button 
                onClick={handleDecline} 
                variant="outline"
              >
                Decline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 