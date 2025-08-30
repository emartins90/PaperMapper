import posthog from 'posthog-js'

// Always initialize PostHog with cookieless mode
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2025-05-24',
  autocapture: true,
  cookieless_mode: 'on_reject'  // ← Add this!
});

// Check existing consent and apply it
const checkExistingConsent = () => {
  if (typeof window === 'undefined') return;
  
  const consent = localStorage.getItem('cookie-consent');
  if (consent === 'accepted') {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
};

checkExistingConsent(); 