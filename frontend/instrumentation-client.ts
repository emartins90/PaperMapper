import posthog from 'posthog-js'

// Check if user has consented to analytics cookies
const hasAnalyticsConsent = () => {
  if (typeof window === 'undefined') return false;
  const consent = localStorage.getItem('cookie-consent');
  return consent === 'accepted';
};

// Only initialize PostHog if user has consented to analytics
if (hasAnalyticsConsent()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
    autocapture: true
  });
} 