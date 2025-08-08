"use client";
import { useCookieConsentContext } from '@/components/CookieConsentProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestCookiesPage() {
  const { consentStatus, hasConsented, needsConsent, clearConsent } = useCookieConsentContext();

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Cookie Consent Test Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Cookie Consent Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full ${
              consentStatus === 'accepted' ? 'bg-green-500' : 
              consentStatus === 'declined' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="font-medium">
              {consentStatus === 'accepted' ? 'Cookies Accepted' :
               consentStatus === 'declined' ? 'Cookies Declined' : 'No Decision Made'}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <p><strong>Has Consented:</strong> {hasConsented() ? 'Yes' : 'No'}</p>
            <p><strong>Needs Consent:</strong> {needsConsent() ? 'Yes' : 'No'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              onClick={clearConsent}
              variant="outline"
              className="w-full"
            >
              Reset Cookie Consent (Show Banner Again)
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Click this button to reset your cookie consent and see the banner again.
              This is useful for testing the consent flow.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Reload Page
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Reload the page to test how the consent banner behaves on page refresh.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 