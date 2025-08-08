# Cookie Consent Implementation

This document describes the cookie consent implementation for the Paper Thread app, which ensures GDPR compliance for authentication cookies.

## Overview

The cookie consent system prevents setting authentication cookies until the user has explicitly consented. This is required under GDPR for non-essential cookies.

## Components

### 1. CookieConsent Component (`/frontend/src/components/CookieConsent.tsx`)
- Displays a banner at the bottom of the page when consent is needed
- Shows information about what cookies are used
- Provides Accept/Decline buttons
- Automatically hides after user makes a choice

### 2. CookieConsentProvider (`/frontend/src/components/CookieConsentProvider.tsx`)
- Context provider that manages cookie consent state globally
- Wraps the entire app in `layout.tsx`
- Provides consent status and management functions
- Automatically shows the consent banner when needed

### 3. useCookieConsent Hook (`/frontend/src/hooks/useCookieConsent.ts`)
- Custom hook for managing cookie consent state
- Provides functions to accept/decline/clear consent
- Handles localStorage persistence

### 4. Cookie Utils (`/frontend/src/lib/cookieUtils.ts`)
- Utility functions for cookie management
- `hasCookieConsent()` - Check if user has consented
- `clearAllCookies()` - Remove all cookies
- `fetchWithConsent()` - Wrapper for fetch that checks consent

### 5. CookieSettings Component (`/frontend/src/components/CookieSettings.tsx`)
- Settings page for managing cookie preferences
- Available in Account Settings → Cookie Settings tab
- Allows users to change their consent after initial choice

## How It Works

### Initial Load
1. App checks localStorage for existing consent
2. If no consent exists, shows the consent banner
3. User must accept cookies to use authentication features

### Authentication Flow
1. User tries to log in/register
2. `AuthForm` checks `hasCookieConsent()` before making requests
3. If no consent, shows error message directing user to accept cookies
4. If consent exists, proceeds with authentication

### Consent Management
- Consent is stored in localStorage as `cookie-consent`
- Values: `'accepted'`, `'declined'`, or `null`
- Users can change preferences in Account Settings
- Declining cookies clears all existing cookies

## GDPR Compliance

### Required Elements
- ✅ **Explicit Consent**: User must click "Accept" to enable cookies
- ✅ **Clear Information**: Banner explains what cookies are used
- ✅ **Easy Withdrawal**: Users can decline/change consent in settings
- ✅ **No Pre-ticked Boxes**: Default state is no consent
- ✅ **Granular Control**: Separate accept/decline options

### Cookie Types Covered
- **Authentication cookies** (`auth_token`) - 30-day persistence
- **Session cookies** - User preferences and settings
- **Security cookies** - Account protection

## Testing

### Test Page
Visit `/test-cookies` to:
- View current consent status
- Reset consent to test banner again
- Test consent persistence across page reloads

### Manual Testing
1. Clear localStorage: `localStorage.removeItem('cookie-consent')`
2. Reload page - should see consent banner
3. Try to log in without accepting - should see error
4. Accept cookies - should be able to log in
5. Check Account Settings → Cookie Settings

## Integration Points

### Authentication
- `AuthForm.tsx` checks consent before login/register
- Prevents authentication requests without consent

### API Requests
- All authenticated requests use `credentials: "include"`
- Consent is checked before making these requests

### Account Settings
- New "Cookie Settings" tab added
- Users can manage consent after initial choice

## Future Enhancements

### Analytics Cookies (Future)
If adding analytics tracking:
1. Add analytics consent to the banner
2. Separate essential vs. optional cookies
3. Allow granular control over cookie types

### Third-party Cookies (Future)
If adding third-party services:
1. Add specific consent for each service
2. Implement cookie preference management
3. Add detailed cookie descriptions

## Legal Considerations

### Privacy Policy Requirements
- Document what cookies are used
- Explain purpose and duration
- Provide contact information for questions

### Terms of Service
- Include cookie usage terms
- Explain consequences of declining cookies
- Detail data retention policies

## Maintenance

### Regular Tasks
- Review cookie usage quarterly
- Update consent banner text if cookie usage changes
- Test consent flow after deployments
- Monitor for consent-related issues

### Updates
- When adding new cookies, update banner text
- When changing cookie behavior, test consent flow
- When updating privacy policy, review consent text 