"use client";

import React, { useState } from "react";
import DrawerTabs from "@/components/ui/DrawerTabs";
import ChatExperience from "../chat/ChatExperience";
import QuestionChatExperience from "../chat/QuestionChatExperience";
import InsightChatExperience from "../chat/InsightChatExperience";
import ThoughtChatExperience from "../chat/ThoughtChatExperience";
import SourceCardContent from "./sp-content-source";
import QuestionCardContent from "./sp-content-question";
import InsightCardContent from "./sp-content-insight";
import ThoughtCardContent from "./sp-content-thought";
import ClaimCardContent from "./sp-content-claim";
import ClaimChatExperience from "../chat/ClaimChatExperience";
import { useCardSave } from "../shared/useCardSave";
import { toast } from "sonner";

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
  claimTab: string;
  onClaimTabChange: (tab: string) => void;
  onSaveCard?: (data: { cardId: string; chatAnswers: any; uploadedFiles: File[] }) => void;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onEdgesChange?: (changes: any[]) => void;
  onAddCard?: (cardId: string) => void; // For saving unsaved cards
  onDeleteCard?: (cardId: string) => void; // For deleting unsaved cards
  projectId?: number; // Add projectId prop
  onFileClick?: (fileUrl: string, entry: any) => void; // Optional handler for file click
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
  claimTab,
  onClaimTabChange,
  onSaveCard,
  onUpdateNodeData,
  onEdgesChange,
  onAddCard,
  onDeleteCard,
  projectId,
  onFileClick,
}: SidePanelBaseProps) {
  // Move hooks before any early returns - always call them with consistent parameters
  const [formData, setFormData] = useState<any>({});
  
  // Get the node position for the current card
  const currentNode = openCard ? nodes.find(n => n.id === openCard.id) : null;
  const nodePosition = currentNode?.position;

  // Always call useCardSave with consistent parameters to maintain hook order
  const { saveCard, isSaving } = useCardSave({
    cardId: openCard?.id || "",
    cardType: openCard ? (nodes.find(n => n.id === openCard.id)?.type || "source") : "source",
    projectId: projectId || 0,
    nodePosition,
    onUpdateNodeData,
    onAddCard: undefined, // Don't call onAddCard since we're using the shared save hook
    onDeleteCard,
  });

  // Add state for file viewer
  const [sidePanelFileViewer, setSidePanelFileViewer] = useState<{ fileUrl: string; cardId: string; cardType: string } | null>(null);

  // Handler to open file viewer
  const handleFileClick = (fileUrl: string, entry: any) => {
    if (onFileClick) {
      onFileClick(fileUrl, entry);
      return;
    }
    if (!openCard) return;
    setSidePanelFileViewer({ fileUrl, cardId: openCard.id, cardType: openCard.type });
    // You may want to call a prop or context handler here to open the global FullscreenFileViewer
  };

  if (!openCard) return null;

  const cardType = openCard.type;
  const cardData = openCard ? nodes.find(n => n.id === openCard.id)?.data : undefined;
  const isInChatMode = guided && openCard.id === chatActiveCardId && (cardType === "source" || cardType === "question" || cardType === "insight" || cardType === "thought" || cardType === "claim");
  
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
      (cardType === "thought" && !cardData.thoughtId) ||
      (cardType === "claim" && !cardData.claimId);
    
    // If we have valid data IDs, the card is saved regardless of the ID format
    if (!hasMissingDataIds) {
      return false;
    }
    
    // If we have a UUID ID and missing data IDs, the card is unsaved
    return isUUID && hasMissingDataIds;
  };
  
  const cardIsUnsaved = isUnsaved();

  // Handle close button - delete unsaved cards, just close saved ones
  const handleClose = () => {
    if (cardIsUnsaved && onDeleteCard) {
      onDeleteCard(openCard.id);
    }
    onClose();
  };

  // Handle save button click
  const handleSaveClick = async () => {
    if (!openCard || !cardType) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: formData,
        uploadedFiles: formData.uploadedFiles || [],
      });
    } catch (error) {
      console.error("Failed to save card:", error);
      const errorMessage = (error as Error).message;
      if (errorMessage === "Failed to fetch" || errorMessage.includes("fetch") || errorMessage.includes("network")) {
        toast.error("Please check your network connection.");
      } else {
        toast.error("Failed to save card: " + errorMessage);
      }
    }
  };

  // Check if the card has required content to enable save
  const canSave = () => {
    if (!cardType) return false;
    
    switch (cardType) {
      case "source":
        // Source cards can be saved without requiring detailed content
        return true;
      case "question":
        return formData.questionText?.trim();
      case "insight":
        return formData.insightText?.trim();
      case "thought":
        return formData.thoughtText?.trim();
      case "claim":
        return formData.claimText?.trim();
      default:
        return false;
    }
  };

  // Render the appropriate content based on card type and mode
  const renderContent = () => {
    if (isInChatMode) {
      // Chat mode - show chat experience
      switch (cardType) {
        case "source":
          return <ChatExperience cardId={openCard.id} projectId={projectId || 0} nodes={nodes} onClose={onClose} onUpdateNodeData={onUpdateNodeData} />;
        case "question":
          return <QuestionChatExperience cardId={openCard.id} projectId={projectId || 0} nodes={nodes} onClose={onClose} onUpdateNodeData={onUpdateNodeData} />;
        case "insight":
          return <InsightChatExperience cardId={openCard.id} projectId={projectId || 0} nodes={nodes} onClose={onClose} onUpdateNodeData={onUpdateNodeData} />;
        case "thought":
          return <ThoughtChatExperience cardId={openCard.id} projectId={projectId || 0} nodes={nodes} onClose={onClose} onUpdateNodeData={onUpdateNodeData} />;
        case "claim":
          return <ClaimChatExperience cardId={openCard.id} projectId={projectId || 0} nodes={nodes} onClose={onClose} onUpdateNodeData={onUpdateNodeData} />;
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
          {cardType === "claim" && (
            <DrawerTabs
              tabs={[
                { id: "info", label: "Claim Info" },
                { id: "linked", label: "Linked Cards" },
              ]}
              activeTab={claimTab}
              onTabChange={onClaimTabChange}
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
              onFormDataChange={setFormData}
              showSaveButton={false} // Hide individual save button since we have sticky one
              onFileClick={handleFileClick}
              projectId={projectId}
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
              onFormDataChange={setFormData}
              showSaveButton={false} // Hide individual save button since we have sticky one
              onFileClick={handleFileClick}
              projectId={projectId}
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
              onFormDataChange={setFormData}
              showSaveButton={false} // Hide individual save button since we have sticky one
              onFileClick={handleFileClick}
              projectId={projectId}
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
              onFormDataChange={setFormData}
              showSaveButton={false} // Hide individual save button since we have sticky one
              onFileClick={handleFileClick}
              projectId={projectId}
            />
          )}
          {cardType === 'claim' && (
            <ClaimCardContent
              cardData={cardData}
              openCard={openCard}
              onUpdateNodeData={onUpdateNodeData}
              onAddCard={onAddCard}
              onDeleteCard={onDeleteCard}
              claimTab={claimTab}
              nodes={nodes}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onClose={onClose}
              onFormDataChange={setFormData}
              showSaveButton={false}
              onFileClick={handleFileClick}
              projectId={projectId}
            />
          )}
        </>
      );
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] max-w-full z-40 bg-white shadow-2xl flex flex-col border-l">
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
        
        {/* Sticky Save Button for unsaved cards - only show when not in chat mode */}
        {cardIsUnsaved && !isInChatMode && (
          <div className="border-t bg-white p-4">
            <button
              onClick={handleSaveClick}
              disabled={isSaving || !canSave()}
              className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : `Save ${cardType?.replace(/^(.)/, (c: string) => c.toUpperCase())}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 