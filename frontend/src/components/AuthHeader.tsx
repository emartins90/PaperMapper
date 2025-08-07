import React from "react";
import { useRouter } from "next/navigation";
import { LuFileText } from "react-icons/lu";

export default function AuthHeader() {
  const router = useRouter();

  return (
    <div 
      className="absolute top-6 left-6 flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => router.push("/")}
    >
      {/* Placeholder logo - you can replace this with your actual logo */}
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <LuFileText className="w-4 h-4 text-white" />
          </div>
      <span className="text-xl font-bold text-gray-900">Paper Thread</span>
    </div>
  );
} 