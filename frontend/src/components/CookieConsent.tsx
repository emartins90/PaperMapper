"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LuX } from 'react-icons/lu';

interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
    onDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">We use cookies</h3>
              <p className="text-sm text-muted-foreground">
                We use cookies to keep you signed in and provide a better experience. 
                These cookies are essential for the app to function properly. 
                By clicking "Accept", you consent to our use of cookies.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Essential cookies we use:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Authentication cookies</strong> - Keep you signed in for 30 days</li>
                  <li><strong>Session cookies</strong> - Remember your preferences and settings</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAccept}>
                Accept All Cookies
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