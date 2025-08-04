"use client";
import ProjectNav from "@/components/ProjectNav";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { isMobileDevice } from "@/lib/deviceDetection";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../../components/ui/breadcrumb";
import MenuDropdown from "../../../components/MenuDropdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === "string" ? parseInt(params.id, 10) : Array.isArray(params.id) ? parseInt(params.id[0], 10) : undefined;
  const [projectName, setProjectName] = useState<string>("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const email = typeof window !== "undefined" ? localStorage.getItem("email") : "";

  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/projects/${projectId}`, {
      credentials: "include", // Send cookies with request
    })
      .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch project"))
      .then(data => setProjectName(data.name))
      .catch(() => setProjectName(""));
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

  const maxLength = 28;
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

  return (
    <>
      {/* Top bar with breadcrumb and account button */}
      <div className="absolute top-5 left-0 z-20 w-full flex items-center justify-between px-8 h-16">
        {/* Breadcrumb */}
        <div className="bg-white rounded-xl shadow px-3 py-1 flex items-center">
          <Breadcrumb>
            <BreadcrumbList className="text-md h-12 flex items-center">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/projects" className="font-semibold text-gray-700 hover:underline flex items-center text-md h-12">
                    Projects
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold text-gray-900 text-md h-12 flex items-center">{displayName || "..."}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {/* Account button and menu - Hidden on mobile */}
        {!isMobile && <MenuDropdown />}
      </div>
      
      {/* Project Navigation with Card List - Hidden on mobile */}
      {!isMobile && (
        <ProjectNav nodes={[]} onCardClick={handleCardClick} projectId={projectId} />
      )}
      
      {children}
    </>
  );
} 