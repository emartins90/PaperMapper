"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "../components/AuthForm";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    setIsLoading(false);
    if (t) {
      router.replace("/projects");
    }
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (token) {
    return null;
  }

  // Redirect immediately after login
  return <AuthForm onAuth={(token) => {
    setToken(token);
    router.replace("/projects");
  }} />;
}
