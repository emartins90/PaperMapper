"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LuFileText } from "react-icons/lu";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Root page should always be accessible - no redirects
    setIsLoading(false);

    // Handle scroll for sticky nav
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-primary-100 relative">
      {/* Grid of dots background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-8 py-6 flex justify-between items-center transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <LuFileText className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Paper Thread
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          <Button asChild variant="outline">
            <Link 
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Log in
            </Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Join the Beta
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-0 left-0 right-0 z-40 md:hidden">
          <div className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 pt-24">
            <div className="px-8 py-6 space-y-4">
              <Button asChild variant="outline" className="w-full">
                <Link 
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
              </Button>
              <Button asChild className="w-full">
                <Link 
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Join the Beta
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-8 py-20 w-full">
          <div className="flex flex-col items-center text-center space-y-12">
            {/* Content */}
            <div className="space-y-6 max-w-4xl">
              <div className="inline-flex items-center px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                🚀 Beta Now Open
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Write with Confidence
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                From scattered thoughts to clear connections.
              </p>
              <p className="text-lg lg:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
                Paper Thread helps students plan for papers by visually organizing and connecting thoughts and information. It provides just enough structure and guidance to help students build confidence in their own thinking.
              </p>
            </div>
            
            {/* Buttons */}
              <Button asChild size="xl">
                <Link href="/signup">
                  Join the Beta
                </Link>
              </Button>

            {/* Image */}
            <div className="w-full max-w-5xl">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                  <Image
                    src="/heroimage.png"
                    alt="Paper Thread - Visual research mapping interface showing interconnected nodes for organizing research"
                    width={1200}
                    height={800}
                    className="w-full h-auto rounded-lg"
                    priority
                  />
                </div>
                
                {/* Card type color accents */}
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-orange-300 rounded-full"></div>
                <div className="absolute -bottom-3 -left-3 w-5 h-5 bg-blue-300 rounded-full"></div>
                <div className="absolute top-1/2 -right-6 w-3 h-3 bg-purple-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="relative z-10 text-center py-12 text-gray-500">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
          <span>More info coming soon...</span>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
