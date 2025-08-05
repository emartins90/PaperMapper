"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProjectSelector from "@/components/ProjectSelector";
import { isAuthenticated, getToken } from "@/lib/auth";

export default function ProjectsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    console.log("Projects page - current token:", currentToken);
    console.log("Projects page - isAuthenticated:", isAuthenticated());
    
    if (!isAuthenticated()) {
      console.log("Projects page - redirecting to login");
      router.replace("/login");
    } else {
      console.log("Projects page - setting token and loading projects");
      setToken(currentToken);
      setIsLoading(false);
    }
  }, [router]);

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  console.log("Projects page - rendering ProjectSelector with token:", token);
  return <ProjectSelector token={token || ""} />;
} 