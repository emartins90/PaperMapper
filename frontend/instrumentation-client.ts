import posthog from 'posthog-js'

// Only initialize PostHog if environment variables are available
if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
  // Check consent BEFORE initializing PostHog (key lesson!)
  const consent = typeof window !== 'undefined' ? localStorage.getItem('cookie-consent') : null;
  const hasConsent = consent === 'accepted';
  
  // Initialize PostHog with the correct persistence from the start
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
    autocapture: true,
    person_profiles: 'identified_only',
    advanced_enable_surveys: true, // Critical for surveys!
    // Use persistence instead of cookieless_mode (key lesson!)
    persistence: hasConsent ? 'localStorage+cookie' : 'memory'
  });

  // Expose PostHog to window for survey functionality
  if (typeof window !== 'undefined') {
    (window as any).posthog = posthog;
  }
} else {
  console.log('PostHog environment variables not found - skipping initialization');
}
