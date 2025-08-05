"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "../../components/AuthForm";
import { isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    if (isAuthenticated()) {
      router.replace("/projects");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <AuthForm 
        mode="login"
        onAuth={(token) => {
          localStorage.setItem("token", token);
          router.replace("/projects");
        }} 
      />
    </div>
  );
} 