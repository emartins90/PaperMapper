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
 
    
    if (!isAuthenticated()) {
      
      router.replace("/login");
    } else {
      setToken(currentToken);
      setIsLoading(false);
    }
  }, [router]);

  // Show loading while checking authentication
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return <ProjectSelector token={token || ""} />;
} 