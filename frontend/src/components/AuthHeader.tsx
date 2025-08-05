import React from "react";
import { useRouter } from "next/navigation";

export default function AuthHeader() {
  const router = useRouter();

  return (
    <div 
      className="absolute top-6 left-6 flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => router.push("/")}
    >
      {/* Placeholder logo - you can replace this with your actual logo */}
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">PT</span>
      </div>
      <span className="text-xl font-bold text-gray-900">PaperThread</span>
    </div>
  );
} 