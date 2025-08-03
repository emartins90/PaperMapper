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
  title: "PaperThread - Weave your research into papers",
  description: "Visual research mapping for students who struggle with traditional methods. Connect your ideas, organize your research, and write better papers.",
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
