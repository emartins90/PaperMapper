import React from "react";
import { useRouter } from "next/navigation";
import Logo from "./Logo";

export default function AuthHeader() {
  const router = useRouter();

  return (
    <div 
      className="absolute top-6 left-6 flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => router.push("/")}
    >
      {/* Logo */}
      <Logo width={32} height={32} />
      <span className="text-xl font-bold text-gray-900">Paper Thread</span>
    </div>
  );
} 