"use client";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AccountSettings from "@/components/AccountSettings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MenuDropdown({ large = false }: { large?: boolean }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [customOptions, setCustomOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();
  const email = typeof window !== "undefined" ? localStorage.getItem("email") : "";

  // Fetch custom options when modal opens
  useEffect(() => {
    if (accountOpen) {
      setLoadingOptions(true);
      fetch(`${API_URL}/users/me/custom-options`, {
        credentials: "include", // Use cookie-based authentication
      })
        .then((res) => res.ok ? res.json() : Promise.reject("Failed to fetch custom options"))
        .then((data) => setCustomOptions(data))
        .catch(() => setCustomOptions([]))
        .finally(() => setLoadingOptions(false));
    }
  }, [accountOpen]);

  // Group options by type
  const groupedOptions = customOptions.reduce((acc: any, opt: any) => {
    if (!acc[opt.option_type]) acc[opt.option_type] = [];
    acc[opt.option_type].push(opt);
    return acc;
  }, {});

  // Delete handler
  const handleDeleteOption = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "DELETE",
        credentials: "include", // Use cookie-based authentication
      });
      if (res.ok) {
        setCustomOptions((prev) => prev.filter((opt) => opt.id !== id));
      } else {
        alert("Failed to delete custom option");
      }
    } catch {
      alert("Failed to delete custom option");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={large ? "font-medium text-lg px-6 py-3" : "font-medium"}
        style={large ? { minHeight: 48, minWidth: 80 } : {}}
        onClick={() => setAccountOpen(true)}
      >
        My Account
      </Button>
      <AccountSettings open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
} 