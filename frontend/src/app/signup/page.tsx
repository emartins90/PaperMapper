"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "../../components/AuthForm";
import AuthHeader from "../../components/AuthHeader";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // For signup, we don't redirect logged-in users - they can still create new accounts
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative">
      <AuthHeader />
      <AuthForm 
        mode="Sign Up"
        onAuth={(token) => {
          localStorage.setItem("token", token);
          router.replace("/projects");
        }} 
      />
    </div>
  );
} 