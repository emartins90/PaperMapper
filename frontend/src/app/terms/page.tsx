import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Paper Thread",
  description: "Terms of Service for Paper Thread - Learn about our service terms and user responsibilities.",
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p>
            These Terms of Service ("Terms") govern your use of Paper Thread ("Service"), operated by Paper Thread ("we," "our," or "us"). By accessing or using our Service, you agree to be bound by these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
          <p className="mb-4">
            Paper Thread is an academic paper planning and organization tool designed for high school and college students. Our Service helps students:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Organize research materials and citations</li>
            <li>Plan and structure academic papers</li>
            <li>Connect thoughts and insights visually</li>
            <li>Manage projects and assignments</li>
            <li>Store and organize academic files</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Registration and Use</h2>
          
          <h3 className="text-xl font-medium mb-3">Account Creation</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You must provide a valid email address when creating an account</li>
            <li>You are responsible for maintaining the security of your password</li>
            <li>You must be at least 13 years old to use our Service</li>
            <li>One account per person is allowed</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Account Responsibilities</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You are responsible for all activity under your account</li>
            <li>You must notify us immediately of any unauthorized use</li>
            <li>You may not share your account credentials with others</li>
            <li>You may not use another person's account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
          
          <h3 className="text-xl font-medium mb-3">You May Use Our Service To:</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Create and organize academic projects and research</li>
            <li>Upload and store academic files and documents</li>
            <li>Collaborate on academic work (within your account)</li>
            <li>Access our tools for educational purposes</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">You May Not:</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Upload content that violates copyright or intellectual property rights</li>
            <li>Upload malicious files, viruses, or harmful code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use the Service to harass, abuse, or harm others</li>
            <li>Share inappropriate, offensive, or harmful content</li>
            <li>Use automated systems to access the Service without permission</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Content and Intellectual Property</h2>
          
          <h3 className="text-xl font-medium mb-3">Your Content</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You retain ownership of content you upload to our Service</li>
            <li>You grant us a limited license to store and process your content to provide the Service</li>
            <li>You are responsible for ensuring you have rights to upload any content</li>
            <li>You must not upload content that infringes on others' intellectual property rights</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Our Service</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Paper Thread and its original content, features, and functionality are owned by us</li>
            <li>Our Service is protected by copyright, trademark, and other intellectual property laws</li>
            <li>You may not copy, modify, or distribute our Service without permission</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">File Uploads and Storage</h2>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You may upload academic files up to 50MB per file</li>
            <li>Maximum 5 files per card</li>
            <li>Total storage limit of 200MB per card</li>
            <li>Supported file types: documents, images, PDFs, audio</li>
            <li>We reserve the right to remove files that violate these Terms</li>
            <li>Files are stored securely but you should maintain your own backups</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Service Availability and Support</h2>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>We strive to maintain high service availability but cannot guarantee 100% uptime</li>
            <li>We may perform maintenance that temporarily affects service availability</li>
            <li>We provide support through our contact email</li>
            <li>We are not responsible for lost data due to service interruptions</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy and Data Protection</h2>
          
          <p className="mb-4">
            Your privacy is important to us. Our collection and use of your information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
          </p>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>We collect and process data as described in our Privacy Policy</li>
            <li>You consent to our data practices by using our Service</li>
            <li>You may request deletion of your data at any time</li>
            <li>We implement appropriate security measures to protect your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Termination</h2>
          
          <h3 className="text-xl font-medium mb-3">By You</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>You may delete your account at any time through Account Settings</li>
            <li>Account deletion is permanent and cannot be undone</li>
            <li>All your data, projects, and files will be permanently deleted</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">By Us</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>We may suspend or terminate your account if you violate these Terms</li>
            <li>We may terminate accounts that are inactive for extended periods</li>
            <li>We will provide notice when possible before terminating accounts</li>
            <li>Termination does not affect your obligations under these Terms</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
          
          <p className="mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAPER THREAD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
          </p>
          
          <p className="mb-4">
            OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US, IF ANY, IN THE TWELVE MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
          
          <p className="mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
          
          <p className="mb-4">
            You agree to indemnify and hold harmless Paper Thread from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
          
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with the laws of [Your State/Country], without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
          
          <p className="mb-4">
            We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          
          <p className="mb-4">
            If you have any questions about these Terms of Service, please contact us:
          </p>
          
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Email:</strong> terms@paperthread-app.com</li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            These Terms of Service are effective as of the date listed above and apply to all users of Paper Thread.
          </p>
        </div>
      </div>
    </div>
  );
}