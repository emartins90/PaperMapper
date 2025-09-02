import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import CookieConsentProvider from "@/components/cookies-consent/CookieConsentProvider";
import { UserProvider } from "@/contexts/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paper Thread - Write with confidence",
  description: "Paper Thread helps high school and collegestudents plan for writing academic papers by visually organizing and connecting thoughts and information. It provides just enough structure and guidance to help students build confidence in their own thinking.",
};

// PostHog Script Component
function PostHogScript() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  
  if (!posthogKey || !posthogHost) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Ce Os As Te Cs Fs capture Ye calculateEventProperties Ls register register_once register_for_session unregister unregister_for_session qs getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty zs js createPersonProfile Us Rs Bs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ds debug L Ns getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          
          // Check consent BEFORE initializing PostHog
          const consent = localStorage.getItem('cookie-consent');
          const hasConsent = consent === 'accepted';
          
          // Initialize PostHog with the correct mode from the start
          posthog.init('${posthogKey}', {
            api_host: '${posthogHost}',
            defaults: '2025-05-24',
            autocapture: true,
            person_profiles: 'identified_only',
            // Only use cookieless mode if consent is NOT given
            cookieless_mode: hasConsent ? 'off' : 'always',
            persistence: hasConsent ? 'localStorage+cookie' : 'memory'
          });
          
          // No need to call opt_in/opt_out after initialization
          // PostHog is already initialized in the correct mode
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PostHogScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          <CookieConsentProvider>
            <Toaster richColors position="top-center" offset={100} />
            <div style={{ position: "relative", minHeight: "100vh" }}>
              {/* Main page content */}
              <div>
                {children}
              </div>
            </div>
          </CookieConsentProvider>
        </UserProvider>
      </body>
    </html>
  );
}
