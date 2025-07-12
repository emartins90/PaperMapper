"use client";

// frontend/src/app/TopBar.tsx
import { MdSettings, MdList, MdOutlineSource } from "react-icons/md";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import TabSwitcher from "@/components/ui/TabSwitcher";

export default function TopNav() {
  const [activeTab, setActiveTab] = useState<"gather" | "outline">("gather");

  return (
    <div
      className="absolute top-5 left-1/2 -translate-x-1/2 z-10 bg-white px-2 py-2 rounded-xl shadow-lg w-fit flex items-center"
    >
      
      <div className="flex gap-0">
        <Button variant="link" className="text-foreground [&>svg]:text-foreground "><MdSettings size={16} />Project Settings</Button>
        <Button variant="link" className="text-foreground  [&>svg]:text-foreground "><MdOutlineSource size={16} />Source List</Button>
        <Button variant="link" className="text-foreground [&>svg]:text-foreground "><MdList size={16} />Card List</Button>
      </div>
      <div className="self-stretch w-px bg-gray-200 mx-4" />
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}