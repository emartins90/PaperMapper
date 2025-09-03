"use client";
import ProjectNav from "@/components/ProjectNav";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { isMobileDevice } from "../../../lib/deviceDetection";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../../components/ui/breadcrumb";
import MenuDropdown from "../../../components/MenuDropdown";
import { LuChevronLeft, LuMessageSquare } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? parseInt(params.id, 10) : Array.isArray(params.id) ? parseInt(params.id[0], 10) : undefined;
  const [projectName, setProjectName] = useState<string>("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toastIdRef = useRef<string | number | null>(null);
  const email = typeof window !== "undefined" ? localStorage.getItem("email") : "";

  // Check project access and get project name
  useEffect(() => {
    if (!projectId) return;
    
    const checkProjectAccess = async () => {
      try {
        const res = await fetch(`${API_URL}/projects/${projectId}`, {
          credentials: "include",
        });
        
        if (res.status === 403) {
          setHasAccess(false);
          setProjectName("");
        } else if (res.ok) {
          const data = await res.json();
          setProjectName(data.name);
          setHasAccess(true);
        } else {
          setHasAccess(false);
          setProjectName("");
        }
      } catch (error) {
        setHasAccess(false);
        setProjectName("");
      } finally {
        setIsLoading(false);
      }
    };

    checkProjectAccess();
  }, [projectId]);

  // Check if device is mobile and show toast
  useEffect(() => {
    const checkMobile = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      
      // Show toast if mobile (every time they visit a project page)
      if (mobile) {
        // Show dismissable toast for mobile users with custom action
        const toastId = toast.info(
          "Please use a tablet in landscape mode or computer to edit your projects for the best experience.",
          {
            duration: Infinity, // Don't auto-dismiss
            dismissible: true,
            position: "bottom-center",
            style: {
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#1e293b",
              borderRadius: "8px",
              padding: "12px 16px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            },
            action: {
              label: "Got it",
              onClick: () => {
                // Toast will be dismissed when user clicks "Got it"
              },
            },
          }
        );
        toastIdRef.current = toastId;
      }
    };

    // Check on mount
    checkMobile();

    // Check on window resize
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup function - only runs when component unmounts
    return () => {
      window.removeEventListener('resize', handleResize);
      // Dismiss toast when navigating away
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  const maxLength = 20; // Reduced from 28 to be more aggressive
  const displayName = projectName.length > maxLength
    ? projectName.slice(0, maxLength) + "…"
    : projectName;

  // Handler for card clicks from the ProjectNav
  const handleCardClick = (cardId: string, cardType: string) => {
    // Dispatch a custom event that the Canvas can listen to
    const event = new CustomEvent('cardListClick', {
      detail: { cardId, cardType }
    });
    window.dispatchEvent(event);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking project access...</p>
        </div>
      </div>
    );
  }

  // Show access denied page
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">
            You don't have permission to access this project.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/projects')}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to My Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top bar with breadcrumb and account button */}
      <div className="absolute top-5 left-0 z-20 w-full flex items-center justify-between px-8 h-16">
        {/* Breadcrumb - Full on large screens and mobile, chevron on medium screens */}
        <div className="bg-white rounded-xl shadow px-3 py-1 flex items-center max-w-md">
          {/* Full breadcrumb - shown on large screens (xl+) and mobile (below md) */}
          <div className="block md:hidden xl:block">
            <Breadcrumb>
              <BreadcrumbList className="text-sm h-12 flex items-center whitespace-nowrap overflow-hidden">
                <BreadcrumbItem className="flex-shrink-0">
                  <BreadcrumbLink asChild>
                    <Link href="/projects" className="font-semibold text-gray-700 hover:underline flex items-center text-sm h-12">
                      Projects
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="flex-shrink-0" />
                <BreadcrumbItem className="min-w-0 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BreadcrumbPage className="font-bold text-gray-900 text-sm h-12 flex items-center truncate cursor-help">
                          {displayName || "..."}
                        </BreadcrumbPage>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        align="start"
                        sideOffset={5}
                      >
                        {projectName}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          {/* Chevron back button - shown only on medium screens (md to xl) */}
          <div className="hidden md:block xl:hidden">
            <Link 
              href="/projects" 
              className="flex items-center justify-center w-8 h-8 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Projects"
            >
              <LuChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>
        {/* Account button and menu - Hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center space-x-3">
            {/* Beta Feedback Button */}
            <Button
              className="flex items-center text-insight-700 space-x-2 ph-no-capture bg-insight-100 hover:bg-insight-200 font-medium"
              data-attr="feedback-button"
            >
              <LuMessageSquare className="w-4 h-4 text-insight-700" />
              <span>Share Feedback</span>
            </Button>
            <MenuDropdown />
          </div>
        )}
      </div>
      
      {/* Project Navigation with Card List - Hidden on mobile */}
      {!isMobile && (
        <ProjectNav nodes={[]} onCardClick={handleCardClick} projectId={projectId} />
      )}
      
      {children}
    </>
  );
} 