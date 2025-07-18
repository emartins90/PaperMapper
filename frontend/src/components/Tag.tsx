import React from "react";

type TagProps = {
  children: React.ReactNode;
  color?: string; // e.g. 'blue', 'green', 'gray', 'purple', 'teal', etc.
  className?: string;
};

const colorClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-900",
  red: "bg-red-100 text-red-900",
  gray: "bg-gray-200 text-gray-900",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  teal: "bg-teal-100 text-teal-700",
  primary: "bg-primary-200 text-foreground",
};

export default function Tag({ children, color = "gray", className = "" }: TagProps) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[color] || colorClasses.gray} ${className}`}>
      {children}
    </span>
  );
} 