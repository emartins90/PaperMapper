import posthog from 'posthog-js'

// Export the posthog instance for use in components
export { posthog }

// Helper function to capture custom events
export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  // Only capture events if PostHog is initialized (user consented to analytics)
  if (posthog.isFeatureEnabled('__posthog_init__')) {
    posthog.capture(eventName, properties)
  }
}

// Helper function to identify users
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (posthog.isFeatureEnabled('__posthog_init__')) {
    posthog.identify(userId, properties)
  }
}

// Helper function to set user properties
export const setUserProperties = (properties: Record<string, any>) => {
  if (posthog.isFeatureEnabled('__posthog_init__')) {
    posthog.people.set(properties)
  }
}

// Function to enable PostHog when user consents
export const enablePostHog = () => {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2025-05-24',
      autocapture: true
    });
  }
}

// Function to disable PostHog when user withdraws consent
export const disablePostHog = () => {
  posthog.opt_out_capturing();
} 