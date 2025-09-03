"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { captureEvent } from "@/lib/posthog";
import { LuZap, LuGitBranch, LuMessageCircle, LuBrain, LuCalendarCheck, LuListChecks, LuFileText, LuGift, LuHammer } from "react-icons/lu";

// How it Helps Section Component
function HowItHelpsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [videoError, setVideoError] = useState(false);

  const tabs = [
    {
      id: 0,
      icon: LuZap,
      title: "Tackle the blank page faster",
      description: "Skip the pressure of writing the first sentence. Start by capturing one thought or source at a time.",
      videoSrc: "/api/static-assets/firstthought.mp4"
    },
    {
      id: 1,
      icon: LuGitBranch,
      title: "Find structure with connections",
      description: "Connecting ideas and information on the canvas helps you see the structure of your paper before writing.",
      videoSrc: "/api/static-assets/createlink.mp4"
    },
    {
      id: 2,
      icon: LuBrain,
      title: "Build confidence, not dependence",
      description: "Use the chat-based card creation to support your thought process, not replace it.",
      videoSrc: "/api/static-assets/buildconfidence.mp4"
    }
  ];

  return (
    <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-stretch">
      {/* Left side - Tabs */}
      <div className="space-y-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 rounded-xl cursor-pointer transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-purple-50 border-2 border-violet-500 shadow-lg'
                : 'bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeTab === tab.id ? 'bg-violet-500' : 'bg-gray-100'
              }`}>
                <tab.icon className={`w-5 h-5 ${
                  activeTab === tab.id ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className={`text-xl font-semibold ${
                  activeTab === tab.id ? 'text-black' : 'text-gray-900'
                }`}>
                  {tab.title}
                </h3>
                <p className={`text-base leading-normal ${
                  activeTab === tab.id ? 'text-black' : 'text-gray-600'
                }`}>
                  {tab.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right side - Video */}
      <div className="lg:sticky lg:top-8 h-full">
        {/* Purple background container */}
        <div className="bg-insight-50 p-8 rounded-3xl border-2 border-insight-100 h-full flex flex-col justify-center">
          <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden" style={{ aspectRatio: '660/550' }}>
          {tabs[activeTab].videoSrc.includes('placeholder') || videoError ? (
            /* Placeholder for tabs without videos yet */
            <div className="absolute inset-0 flex items-center justify-center bg-insight-100">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎥</div>
                <h4 className="text-xl font-semibold mb-2">{tabs[activeTab].title}</h4>
                <p className="text-gray-300">
                  {videoError ? 'Video failed to load' : 'Video coming soon'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Trying to load: {tabs[activeTab].videoSrc}
                </p>
                <div className="mt-4 px-4 py-2 bg-white/10 rounded-lg inline-block">
                  <span className="text-sm">Tab {activeTab + 1} of {tabs.length}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Actual video */
            <video
              key={tabs[activeTab].videoSrc}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              onError={(e) => {
                console.error('Video error:', e);
                console.error('Video src:', tabs[activeTab].videoSrc);
                setVideoError(true);
              }}
              onLoadStart={() => console.log('Video load started:', tabs[activeTab].videoSrc)}
              onLoadedData={() => console.log('Video loaded:', tabs[activeTab].videoSrc)}
            >
              <source src={tabs[activeTab].videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        
        {/* Video controls/indicators */}
        <div className="flex justify-center mt-4 space-x-2">
          {tabs.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeTab === index ? 'bg-primary-500' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
        </div> {/* Close purple background container */}
      </div>
    </div>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Root page should always be accessible - no redirects
    setIsLoading(false);

    // Track page view
    // captureEvent('page_viewed', { page: 'home' });

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
              <Logo width={40} height={40} variant="rounded" priority />
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
              onClick={() => captureEvent('login_button_clicked', { location: 'desktop_nav' })}
            >
              Log in
            </Link>
          </Button>
          <Button asChild>
            <Link 
              href="/signup"
              onClick={() => captureEvent('signup_button_clicked', { location: 'desktop_nav' })}
            >
              Sign up
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
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    captureEvent('login_button_clicked', { location: 'mobile_nav' });
                  }}
                >
                  Log in
                </Link>
              </Button>
              <Button asChild className="w-full">
                <Link 
                  href="/signup"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    captureEvent('signup_button_clicked', { location: 'mobile_nav' });
                  }}
                >
                  Sign up
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
            <div className="space-y-12 max-w-4xl">
              <div className="inline-flex items-center px-4 py-2 bg-insight-100 text-insight-700 rounded-full text-sm font-medium">
                🚀 Beta Now Open
              </div>
              <div className="space-y-1">
             
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Write with Confidence
              </h1>
              <p className="text-xl lg:text-4xl text-gray-600 leading-relaxed">
                From scattered thoughts to clear connections
              </p>
              <p className="text-md lg:text-xl text-gray-600 leading-relaxed">
                A visual workspace for students to plan and organize their papers.
             </p>
              </div>
             
            </div>
            
            {/* Buttons */}
              <Button asChild size="xl">
                <Link 
                  href="/signup"
                  onClick={() => captureEvent('hero_signup_button_clicked', { location: 'hero_section' })}
                >
                  Join the Beta
                </Link>
              </Button>

              {/* Image */}
            <div className="w-full max-w-5xl">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100">
                  <Image
                    src="/api/static-assets/heroimage.png?v=2"
                    alt="Paper Thread - Visual research mapping interface showing interconnected nodes for organizing research"
                    width={1200}
                    height={800}
                    className="w-full h-auto rounded-lg"
                    priority
                  />
                </div>
                
                {/* Card type color accents */}
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-orange-300 rounded-full"></div>
                <div className="absolute bottom-1/3 -left-3 w-5 h-5 bg-blue-300 rounded-full"></div>
                <div className="absolute top-1/2 -right-6 w-3 h-3 bg-purple-300 rounded-full"></div>
                <div className="absolute top-10 -left-8 w-4 h-4 bg-thought-200 rounded-full"></div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Helps Section - Overlapping the hero */}
      <div className="relative z-20 -mt-60 bg-primary-50 rounded-t-3xl">
        <div className="max-w-6xl mx-auto px-8 pt-12 pb-24">
          <div className="text-left mb-12">
            <h2 className="text-4xl lg:text-4xl font-bold text-gray-900 mb-4">
              How it Helps
            </h2>
            <p className="text-lg text-gray-600">
              Paper Thread helps students plan for papers by visually organizing and connecting thoughts and information. 
              It provides just enough structure and guidance to help students build confidence in their own thinking without relying on AI to do it for them.
            </p>
          </div>

          <HowItHelpsSection />
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 bg-white py-24">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-4xl font-bold text-gray-900 mb-4">
              More Ways to Stay Organized
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Project Tracking */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <LuCalendarCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Project Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                Track due dates, manage assignment files, and access a library of resources all in one organized project view.
              </p>
            </div>

            {/* Organization Tools */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <LuListChecks className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Navigation Tools</h3>
              <p className="text-gray-600 leading-relaxed">
                Never lose track of your citations with the source list. Search and filter in the card list to find exactly what you need.
              </p>
            </div>

            {/* Upcoming Outline */}
            <div className="text-center space-y-2 opacity-75">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-purple-300">
                <LuFileText className="w-8 h-8 text-purple-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold text-gray-700">Outline Builder</h3>
                <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Under construction
                </div>
              </div>
              <p className="text-gray-500 leading-relaxed">
                Turn your connected ideas into structured outlines with guided tools to help organize your thoughts.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Beta CTA Section */}
      <div className="relative z-10 bg-gradient-to-br from-primary-100 to-primary-50 py-24">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed">
                Join our beta and help us build a tool that works for you.
              </p>
            </div>
            
            <div className="bg-insight-50 border-2 border-insight-100 backdrop-blur-sm rounded-2xl p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-8 text-left">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-insight-500 rounded-lg flex items-center justify-center">
                    <LuGift className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Completely Free</h3>
                  <p className="text-gray-600 text-sm">
                    No payment required during beta. Full access to all features.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-insight-500 rounded-lg flex items-center justify-center">
                    <LuHammer className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Shape the Product</h3>
                  <p className="text-gray-600 text-sm">
                    Your feedback directly influences new features and improvements.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button asChild size="xl">
                <Link 
                  href="/signup"
                  onClick={() => captureEvent('bottom_cta_signup_clicked', { location: 'beta_cta_section' })}
                >
                  Join the Beta - It's Free
                </Link>
              </Button>
              <p className="text-gray-600 text-sm">
                No credit card required • Set up in under 2 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
