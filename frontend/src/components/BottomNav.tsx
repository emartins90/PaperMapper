"use client";

import React from "react";
import { MdHelpOutline, MdLibraryBooks, MdLightbulbOutline, MdChatBubbleOutline } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

// Add prop type
interface BottomNavProps {
  onAddSourceMaterial?: () => void;
  onAddQuestion?: () => void;
  onAddInsight?: () => void;
  onAddThought?: () => void;
  guided: boolean;
  onGuidedChange: (guided: boolean) => void;
}

export default function BottomNav({ 
  onAddSourceMaterial, 
  onAddQuestion, 
  onAddInsight, 
  onAddThought, 
  guided, 
  onGuidedChange 
}: BottomNavProps) {
  return (
    <TooltipProvider>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-md flex items-center px-6 py-2 border border-gray-100">
        {/* Guided Experience Toggle */}
        <span className="flex items-center gap-2 pr-2">
          Guided Experience
          <Switch checked={guided} onCheckedChange={onGuidedChange} aria-label="Toggle Guided Experience" />
        </span>
        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 mx-3"  />
        {/* Icon Buttons */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="light" className="bg-question-100 hover:bg-question-300" size="icon" aria-label="Add Question Card" onClick={() => {
                onAddQuestion?.();
              }}>
                <MdHelpOutline size={40} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Question Card</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="light" className="bg-source-100 hover:bg-source-300" size="icon" aria-label="Add Source Material Card" onClick={() => {
                onAddSourceMaterial?.();
              }}>
                <MdLibraryBooks size={40} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Source Material Card</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="light" className="bg-insight-100 hover:bg-insight-300" size="icon" aria-label="Add Insight Card" onClick={() => {
                onAddInsight?.();
              }}>
                <MdLightbulbOutline size={40} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Insight Card</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="light" className="bg-thought-100 hover:bg-thought-300" size="icon" aria-label="Add Thought Card" onClick={() => {
                onAddThought?.();
              }}>
                <MdChatBubbleOutline size={40} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Thought Card</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
} 