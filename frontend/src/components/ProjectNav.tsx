"use client";

// frontend/src/app/TopBar.tsx
import { MdSettings, MdList, MdOutlineSource } from "react-icons/md";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import TabSwitcher from "@/components/ui/TabSwitcher";
import CardListPanel from "./CardListPanel";

interface ProjectNavProps {
  nodes: any[];
  onCardClick: (cardId: string, cardType: string) => void;
}

export default function ProjectNav({ nodes: initialNodes, onCardClick }: ProjectNavProps) {
  const [activeTab, setActiveTab] = useState<"gather" | "outline">("gather");
  const [showCardList, setShowCardList] = useState(false);
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();

  // Listen for nodes updates from Canvas
  useEffect(() => {
    const handleNodesUpdate = (event: CustomEvent) => {
      setNodes(event.detail.nodes);
    };

    window.addEventListener('nodesUpdate', handleNodesUpdate as EventListener);
    
    return () => {
      window.removeEventListener('nodesUpdate', handleNodesUpdate as EventListener);
    };
  }, []);

  const handleCardListClick = () => {
    setShowCardList(true);
  };

  const handleCardClick = (cardId: string, cardType: string) => {
    console.log("ProjectNav handleCardClick:", cardId, cardType);
    setSelectedCardId(cardId);
    onCardClick(cardId, cardType);
  };

  return (
    <>
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-white px-2 py-2 rounded-xl shadow-lg w-fit flex items-center"
      >
        
        <div className="flex gap-0">
          <Button variant="ghost" className="text-foreground [&>svg]:text-foreground hover:bg-gray-100"><MdSettings size={16} />Project Settings</Button>
          <Button variant="ghost" className="text-foreground [&>svg]:text-foreground hover:bg-gray-100"><MdOutlineSource size={16} />Source List</Button>
          <Button 
            variant="ghost" 
            className="text-foreground [&>svg]:text-foreground hover:bg-gray-100" 
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Card List button clicked!");
              handleCardListClick();
            }}
            style={{ position: 'relative', zIndex: 9999 }}
          >
            <MdList size={16} />Card List
          </Button>
        </div>
        <div className="self-stretch w-px bg-gray-200 mx-4" />
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {showCardList && (
        <CardListPanel 
          nodes={nodes} 
          onClose={() => setShowCardList(false)} 
          onCardClick={handleCardClick}
          selectedCardId={selectedCardId}
        />
      )}
    </>
  );
}