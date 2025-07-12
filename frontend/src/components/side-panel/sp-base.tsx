"use client";

import React from "react";
import DrawerTabs from "@/components/ui/DrawerTabs";
import ChatExperience from "../chat/ChatExperience";
import QuestionChatExperience from "../chat/QuestionChatExperience";
import InsightChatExperience from "../chat/InsightChatExperience";
import ThoughtChatExperience from "../chat/ThoughtChatExperience";
import SourceCardContent from "./sp-content-source";
import QuestionCardContent from "./sp-content-question";
import InsightCardContent from "./sp-content-insight";
import ThoughtCardContent from "./sp-content-thought";

interface SidePanelBaseProps {
  openCard: { id: string; type: string } | null;
  nodes: any[];
  edges: any[];
  guided: boolean;
  chatActiveCardId: string | null;
  onClose: () => void;
  sourceTab: string;
  onSourceTabChange: (tab: string) => void;
  questionTab: string;
  onQuestionTabChange: (tab: string) => void;
  insightTab: string;
  onInsightTabChange: (tab: string) => void;
  thoughtTab: string;
  onThoughtTabChange: (tab: string) => void;
  onSaveCard?: (data: { cardId: string; chatAnswers: any; uploadedFiles: File[] }) => void;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onEdgesChange?: (changes: any[]) => void;
  onAddCard?: (cardId: string) => void; // For saving unsaved cards
  onDeleteCard?: (cardId: string) => void; // For deleting unsaved cards
}

export default function SidePanelBase({
  openCard,
  nodes,
  edges,
  guided,
  chatActiveCardId,
  onClose,
  sourceTab,
  onSourceTabChange,
  questionTab,
  onQuestionTabChange,
  insightTab,
  onInsightTabChange,
  thoughtTab,
  onThoughtTabChange,
  onSaveCard,
  onUpdateNodeData,
  onEdgesChange,
  onAddCard,
  onDeleteCard,
}: SidePanelBaseProps) {
  if (!openCard) return null;

  const cardType = nodes.find(n => n.id === openCard.id)?.type;
  const cardData = openCard ? nodes.find(n => n.id === openCard.id)?.data : undefined;
  const isInChatMode = guided && openCard.id === chatActiveCardId && (cardType === "source" || cardType === "question" || cardType === "insight" || cardType === "thought");
  
  // Detect if card is unsaved (has UUID ID or missing data IDs)
  const isUnsaved = () => {
    if (!cardData) return true;
    
    // Check if ID is a UUID (unsaved cards have UUIDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(openCard.id);
    
    // Check if data IDs are missing (null or undefined)
    const hasMissingDataIds = 
      (cardType === "source" && (!cardData.sourceMaterialId || !cardData.citationId)) ||
      (cardType === "question" && !cardData.questionId) ||
      (cardType === "insight" && !cardData.insightId) ||
      (cardType === "thought" && !cardData.thoughtId);
    
    return isUUID || hasMissingDataIds;
  };
  
  const cardIsUnsaved = isUnsaved();
  
  // Handle close button - delete unsaved cards, just close saved ones
  const handleClose = () => {
    if (cardIsUnsaved && onDeleteCard) {
      onDeleteCard(openCard.id);
    }
    onClose();
  };

  // Render the appropriate content based on card type and mode
  const renderContent = () => {
    if (isInChatMode) {
      // Chat mode - show chat experience
      switch (cardType) {
        case "source":
          return <ChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />;
        case "question":
          return <QuestionChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />;
        case "insight":
          return <InsightChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />;
        case "thought":
          return <ThoughtChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />;
        default:
          return null;
      }
    } else {
      // Normal mode - show content components with tabs
      return (
        <>
          {/* Render tabs for source and question cards */}
          {cardType === "source" && (
            <DrawerTabs
              tabs={[
                { id: "content", label: "Source Content & Notes" },
                { id: "info", label: "Source Info" },
                { id: "linked", label: "Linked Cards" },
              ]}
              activeTab={sourceTab}
              onTabChange={onSourceTabChange}
              className="px-4 pt-2"
            />
          )}
          {cardType === "question" && (
            <DrawerTabs
              tabs={[
                { id: "info", label: "Question Info" },
                { id: "linked", label: "Linked Cards" },
              ]}
              activeTab={questionTab}
              onTabChange={onQuestionTabChange}
              className="px-4 pt-2"
            />
          )}
          {cardType === "insight" && (
            <DrawerTabs
              tabs={[
                { id: "info", label: "Insight Info" },
                { id: "linked", label: "Linked Cards" },
              ]}
              activeTab={insightTab}
              onTabChange={onInsightTabChange}
              className="px-4 pt-2"
            />
          )}
          {cardType === "thought" && (
            <DrawerTabs
              tabs={[
                { id: "info", label: "Thought Info" },
                { id: "linked", label: "Linked Cards" },
              ]}
              activeTab={thoughtTab}
              onTabChange={onThoughtTabChange}
              className="px-4 pt-2"
            />
          )}
          
          {/* Render content components */}
          {cardType === 'source' && (
            <SourceCardContent
              cardType={openCard.type}
              sourceTab={sourceTab}
              cardData={cardData}
              onUpdateNodeData={onUpdateNodeData}
              openCard={openCard}
              nodes={nodes}
              edges={edges}
              onClose={onClose}
              onEdgesChange={onEdgesChange}
              onAddCard={onAddCard}
              onDeleteCard={onDeleteCard}
            />
          )}
          {cardType === 'question' && (
            <QuestionCardContent
              cardData={cardData}
              openCard={openCard}
              onUpdateNodeData={onUpdateNodeData}
              questionTab={questionTab}
              nodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onClose={onClose}
              onAddCard={onAddCard}
              onDeleteCard={onDeleteCard}
            />
          )}
          {cardType === 'insight' && (
            <InsightCardContent
              cardData={cardData}
              openCard={openCard}
              onUpdateNodeData={onUpdateNodeData}
              onAddCard={onAddCard}
              onDeleteCard={onDeleteCard}
              insightTab={insightTab}
              nodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onClose={onClose}
            />
          )}
          {cardType === 'thought' && (
            <ThoughtCardContent
              cardData={cardData}
              openCard={openCard}
              onUpdateNodeData={onUpdateNodeData}
              onAddCard={onAddCard}
              onDeleteCard={onDeleteCard}
              thoughtTab={thoughtTab}
              nodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onClose={onClose}
            />
          )}
        </>
      );
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] max-w-full z-[9999] bg-white shadow-2xl flex flex-col border-l">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b p-4">
        <div className="text-lg font-bold">
          {isInChatMode 
            ? `Add a ${cardType?.replace(/^(.)/, (c: string) => c.toUpperCase())} Card`
            : cardType?.replace(/^(.)/, (c: string) => c.toUpperCase()) || ""
          }
        </div>
        <button className="text-2xl px-2 cursor-pointer" onClick={handleClose}>×</button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
        
        {/* Sticky Add Card button for unsaved cards */}
        {cardIsUnsaved && !isInChatMode && onAddCard && (
          <div className="border-t bg-white p-4">
            <button
              onClick={() => onAddCard(openCard.id)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add Card
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 