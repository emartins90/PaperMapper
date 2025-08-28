import posthog from 'posthog-js'

// Export the posthog instance for use in components
export { posthog }

// Helper function to capture custom events
export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties)
}

// Helper function to identify users
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties)
}

// Helper function to set user properties
export const setUserProperties = (properties: Record<string, any>) => {
  posthog.people.set(properties)
} 