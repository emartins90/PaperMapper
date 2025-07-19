"use client";
import ProjectNav from "@/components/ProjectNav";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
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
        {/* Account button and menu */}
        <MenuDropdown />
      </div>
      
      {/* Project Navigation with Card List */}
      <ProjectNav nodes={[]} onCardClick={handleCardClick} projectId={projectId} />
      
      {children}
    </>
  );
} 