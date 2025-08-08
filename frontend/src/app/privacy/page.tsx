import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Paper Thread",
  description: "Privacy Policy for Paper Thread - Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p>
            Paper Thread ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application for academic paper planning and organization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-medium mb-3">Personal Information</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Email Address:</strong> Used for account creation, authentication, and communication</li>
            <li><strong>Password:</strong> Securely hashed and stored for account authentication</li>
            <li><strong>Account Information:</strong> User preferences, custom options, and settings</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Content You Create</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Projects:</strong> Paper topics, class subjects, due dates, and project status</li>
            <li><strong>Source Materials:</strong> Citations, content, summaries, notes, and uploaded files</li>
            <li><strong>Academic Content:</strong> Questions, insights, thoughts, claims, and research notes</li>
            <li><strong>Files:</strong> Documents, images, and other files you upload (stored securely in Cloudflare R2)</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Usage Data</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Authentication Data:</strong> Login sessions and authentication tokens</li>
            <li><strong>Preferences:</strong> User interface settings and guided experience preferences</li>
            <li><strong>Technical Data:</strong> Browser type, device information, and IP address for security</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          
          <h3 className="text-xl font-medium mb-3">Essential Functions</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Account Management:</strong> Create and maintain your user account</li>
            <li><strong>Authentication:</strong> Verify your identity and maintain secure sessions</li>
            <li><strong>Data Storage:</strong> Store and retrieve your projects, content, and files</li>
            <li><strong>App Functionality:</strong> Provide core features like project organization and file management</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Improvement and Support</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Service Improvement:</strong> Analyze usage patterns to improve our application</li>
            <li><strong>Technical Support:</strong> Troubleshoot issues and provide customer support</li>
            <li><strong>Security:</strong> Monitor for and prevent security threats</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
          
          <h3 className="text-xl font-medium mb-3">Essential Cookies</h3>
          <p className="mb-4">
            We use essential cookies that are necessary for the application to function properly:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Authentication Cookies:</strong> Keep you signed in for 30 days</li>
            <li><strong>Session Cookies:</strong> Remember your preferences and settings</li>
            <li><strong>Security Cookies:</strong> Protect your account and data</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Cookie Consent</h3>
          <p className="mb-4">
            We require your explicit consent before setting any cookies. You can manage your cookie preferences in your Account Settings at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
          
          <h3 className="text-xl font-medium mb-3">Data Storage</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Database:</strong> User data and content stored in PostgreSQL database</li>
            <li><strong>File Storage:</strong> Uploaded files stored securely in Cloudflare R2</li>
            <li><strong>Local Storage:</strong> Some preferences stored in your browser</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Security Measures</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Encryption:</strong> All data transmitted over HTTPS</li>
            <li><strong>Password Security:</strong> Passwords securely hashed using industry standards</li>
            <li><strong>Authentication:</strong> Secure JWT tokens for session management</li>
            <li><strong>Access Control:</strong> Strict access controls and authentication requirements</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Sharing and Disclosure</h2>
          
          <p className="mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
          </p>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Service Providers:</strong> We use trusted third-party services for hosting, database management, and file storage (Railway, Cloudflare R2)</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
            <li><strong>Security:</strong> We may share information to investigate or prevent security threats</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
          
          <h3 className="text-xl font-medium mb-3">Access and Control</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Account Access:</strong> View and update your account information in Account Settings</li>
            <li><strong>Data Export:</strong> Request a copy of your data (contact us)</li>
            <li><strong>Data Deletion:</strong> Delete your account and all associated data</li>
            <li><strong>Cookie Management:</strong> Control cookie preferences in Account Settings</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Account Deletion</h3>
          <p className="mb-4">
            You can delete your account at any time through Account Settings. This will permanently remove all your data, including projects, content, and files.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
            <li><strong>Deleted Accounts:</strong> Data permanently deleted immediately upon account deletion</li>
            <li><strong>No Backup Retention:</strong> We do not retain any backup copies of deleted data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
          
          <p className="mb-4">
            Our service is designed for high school and college students, but we do not knowingly collect personal information from children under 13. If you are under 13, please do not provide any personal information to us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">International Users</h2>
          
          <p className="mb-4">
            If you are accessing our service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
          
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          
          <p className="mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Email:</strong> privacy@paperthread-app.com</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Legal Basis (GDPR)</h2>
          
          <p className="mb-4">
            For users in the European Union, we process your data based on:
          </p>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Contract:</strong> To provide you with our services</li>
            <li><strong>Legitimate Interest:</strong> To improve our services and ensure security</li>
            <li><strong>Consent:</strong> For optional features and cookies (where applicable)</li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            This Privacy Policy is effective as of the date listed above and applies to all users of Paper Thread.
          </p>
        </div>
      </div>
    </div>
  );
}