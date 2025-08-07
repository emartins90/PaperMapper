import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster richColors position="top-center" offset={100} />
        <div style={{ position: "relative", minHeight: "100vh" }}>
          {/* Main page content */}
          <div>
        {children}
          </div>
        </div>
      </body>
    </html>
  );
}
