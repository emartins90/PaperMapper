"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
      const token = localStorage.getItem("token");
      fetch(`${API_URL}/users/me/custom-options`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
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
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/users/me/custom-options/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={large ? "font-medium text-lg px-6 py-3" : "font-medium"}
            style={large ? { minHeight: 48, minWidth: 80 } : {}}
          >
            Menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setAccountOpen(true)}>My Account</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/");
            }}
            variant="destructive"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSettings open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
} 