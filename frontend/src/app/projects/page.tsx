"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectSelector from "@/components/ProjectSelector";

export default function ProjectsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    setIsLoading(false);
    
    if (!t || t !== "cookie-auth") {
      router.replace("/");
    }
  }, [router]);

  // Show loading while checking token
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // If no token, redirect to login
  if (!token) {
    return <div>Redirecting to login...</div>;
  }
  
  return <ProjectSelector token={token} />;
} 