"use client";

import React, { useState, useEffect, useRef } from "react";
import DrawerTabs from "@/components/ui/DrawerTabs";
import ChatExperience from "./chat/ChatExperience";
import QuestionChatExperience from "./chat/QuestionChatExperience";
import InsightChatExperience from "./chat/InsightChatExperience";
import ThoughtChatExperience from "./chat/ThoughtChatExperience";
import { Button } from "./ui/button";
import LinkedCardsTab from "./LinkedCardsTab";
import { MdClose } from "react-icons/md";
import FileUploadSection from "./file-management/FileUploadSection";
import { uploadFilesForCardType } from "./useFileUploadHandler";

interface SidePanelProps {
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
  onSaveCard?: (data: { cardId: string; chatAnswers: any; uploadedFiles: File[] }) => void;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onEdgesChange?: (changes: any[]) => void;
  onAddCard?: (cardId: string) => void; // For saving unsaved cards
  onDeleteCard?: (cardId: string) => void; // For deleting unsaved cards
}

const QUESTION_CATEGORIES = [
  "Clarify a concept",
  "Challenge an assumption",
  "Evaluate a source",
  "Compare or contrast",
  "Explore cause and effect",
  "Test a hypothesis",
  "Consider a counterpoint",
  "Ask an ethical question",
  "Propose a solution",
  "Custom..."
];
const QUESTION_STATUSES = [
  "unexplored",
  "needs sources",
  "in progress",
  "answered",
  "not relevant"
];
const QUESTION_PRIORITIES = [
  "",
  "high",
  "medium",
  "low"
];

function QuestionCardContent({ cardData, openCard, onUpdateNodeData, questionTab, nodes, edges, onEdgesChange, onClose, onAddCard, onDeleteCard }: { cardData: any; openCard: { id: string; type: string } | null; onUpdateNodeData?: (cardId: string, newData: any) => void; questionTab: string; nodes: any[]; edges: any[]; onEdgesChange?: (changes: any[]) => void; onClose?: () => void; onAddCard?: (cardId: string) => void; onDeleteCard?: (cardId: string) => void }) {
  const [question, setQuestion] = React.useState(cardData?.question || "");
  const [category, setCategory] = React.useState(cardData?.category || "");
  const [customCategory, setCustomCategory] = React.useState("");
  const [status, setStatus] = React.useState(cardData?.status || "unexplored");
  const [priority, setPriority] = React.useState(cardData?.priority || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setQuestion(cardData?.question || "");
    setCategory(cardData?.category || "");
    setStatus(cardData?.status || "unexplored");
    setPriority(cardData?.priority || "");
    setCustomCategory("");
    setFiles(cardData?.files || []);
  }, [openCard?.id]);

  const saveAllFields = async (fields?: Partial<{ question: string; category: string; status: string; priority: string }>) => {
    if (!cardData?.questionId && !cardData?.data_id) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const questionId = cardData?.questionId || cardData?.data_id;
      const response = await fetch(`${API_URL}/questions/${questionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData?.projectId,
          question_text: fields?.question ?? question,
          category: fields?.category ?? (category === "Custom..." ? customCategory : category),
          status: fields?.status ?? status,
          priority: fields?.priority ?? priority,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          question: fields?.question ?? question,
          category: fields?.category ?? (category === "Custom..." ? customCategory : category),
          status: fields?.status ?? status,
          priority: fields?.priority ?? priority,
        });
      }
    } catch (error) {
      console.error("Error saving question changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // File upload logic for questions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      await uploadFilesForCardType(
        "question",
        cardData?.questionId,
        Array.from(e.target.files),
        files,
        (newFiles) => {
          setFiles(newFiles);
          onUpdateNodeData?.(openCard.id, { files: newFiles });
        }
      );
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/questions/delete_file/?question_id=${cardData?.questionId}&file_url=${encodeURIComponent(fileUrl)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete file");
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);
      onUpdateNodeData?.(openCard.id, { files: newFiles });
    } catch (err) {
      alert("Failed to delete file: " + (err as Error).message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {questionTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Enter your research or essay question..."
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onBlur={() => saveAllFields({ question })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Function / Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={category && QUESTION_CATEGORIES.includes(category) ? category : (category ? "Custom..." : "")}
              onChange={e => {
                setCategory(e.target.value);
                if (e.target.value !== "Custom...") {
                  setCustomCategory("");
                  saveAllFields({ category: e.target.value });
                }
              }}
              onBlur={() => saveAllFields({ category })}
            >
              <option value="">Select category...</option>
              {QUESTION_CATEGORIES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {category === "Custom..." && (
              <input
                className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter custom category..."
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                onBlur={() => saveAllFields({ category: customCategory })}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={status}
              onChange={e => { setStatus(e.target.value); saveAllFields({ status: e.target.value }); }}
              onBlur={() => saveAllFields({ status })}
            >
              {QUESTION_STATUSES.map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={priority}
              onChange={e => { setPriority(e.target.value); saveAllFields({ priority: e.target.value }); }}
              onBlur={() => saveAllFields({ priority })}
            >
              <option value="">No Priority</option>
              {QUESTION_PRIORITIES.filter(opt => opt !== "").map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>
          {/* File upload and display section */}
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            fileInputRef={fileInputRef}
          />
          {isSaving && <div className="text-xs text-blue-500 mt-2">Saving...</div>}
        </div>
      ) : questionTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
}

function InsightCardContent({ cardData, openCard, onUpdateNodeData, onAddCard, onDeleteCard }: { cardData: any; openCard: { id: string; type: string } | null; onUpdateNodeData?: (cardId: string, newData: any) => void; onAddCard?: (cardId: string) => void; onDeleteCard?: (cardId: string) => void }) {
  const [insight, setInsight] = React.useState(cardData?.insight || "");
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInsight(cardData?.insight || "");
    setFiles(cardData?.files || []);
  }, [openCard?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      await uploadFilesForCardType(
        "insight",
        cardData?.insightId,
        Array.from(e.target.files),
        files,
        (newFiles) => {
          setFiles(newFiles);
          onUpdateNodeData?.(openCard.id, { files: newFiles });
        }
      );
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/insights/delete_file/?insight_id=${cardData?.insightId}&file_url=${encodeURIComponent(fileUrl)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete file");
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);
      onUpdateNodeData?.(openCard.id, { files: newFiles });
    } catch (err) {
      alert("Failed to delete file: " + (err as Error).message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Insight</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            placeholder="Describe the insight or pattern you noticed..."
            rows={3}
            value={insight}
            onChange={e => setInsight(e.target.value)}
            onBlur={() => openCard && onUpdateNodeData?.(openCard.id, { insight })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Files & Images</label>
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>
    </div>
  );
}

function ThoughtCardContent({ cardData, openCard, onUpdateNodeData, onAddCard, onDeleteCard }: { cardData: any; openCard: { id: string; type: string } | null; onUpdateNodeData?: (cardId: string, newData: any) => void; onAddCard?: (cardId: string) => void; onDeleteCard?: (cardId: string) => void }) {
  const [thought, setThought] = React.useState(cardData?.thought || "");
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setThought(cardData?.thought || "");
    setFiles(cardData?.files || []);
  }, [openCard?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      await uploadFilesForCardType(
        "thought",
        cardData?.thoughtId,
        Array.from(e.target.files),
        files,
        (newFiles) => {
          setFiles(newFiles);
          onUpdateNodeData?.(openCard.id, { files: newFiles });
        }
      );
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/thoughts/delete_file/?thought_id=${cardData?.thoughtId}&file_url=${encodeURIComponent(fileUrl)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete file");
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);
      onUpdateNodeData?.(openCard.id, { files: newFiles });
    } catch (err) {
      alert("Failed to delete file: " + (err as Error).message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thought</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            placeholder="Share your thought..."
            rows={3}
            value={thought}
            onChange={e => setThought(e.target.value)}
            onBlur={() => openCard && onUpdateNodeData?.(openCard.id, { thought })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Files & Images</label>
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            fileInputRef={fileInputRef}
          />
        </div>
      </div>
    </div>
  );
}

export default function SidePanel({
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
  onSaveCard,
  onUpdateNodeData,
  onEdgesChange,
  onAddCard,
  onDeleteCard,
}: SidePanelProps) {
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

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] max-w-full z-[9999] bg-white shadow-2xl flex flex-col border-l">
      <div className="flex flex-row items-center justify-between border-b p-4">
        <div className="text-lg font-bold">
          {isInChatMode 
            ? `Add a ${cardType?.replace(/^(.)/, (c: string) => c.toUpperCase())} Card`
            : cardType?.replace(/^(.)/, (c: string) => c.toUpperCase()) || ""
          }
        </div>
        <button className="text-2xl px-2 cursor-pointer" onClick={handleClose}>×</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {isInChatMode ? (
            cardType === "source" ? (
              <ChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />
            ) : cardType === "question" ? (
              <QuestionChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />
            ) : cardType === "insight" ? (
              <InsightChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />
            ) : cardType === "thought" ? (
              <ThoughtChatExperience cardId={openCard.id} projectId={cardData?.projectId} nodes={nodes} onSaveCard={onSaveCard} />
            ) : null
          ) : (
            <>
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
              {openCard && openCard.type === 'source' ? (
                !cardData || !cardData.sourceMaterialId || !cardData.projectId ? (
                  <div className="p-6 text-red-600 font-semibold">Error: Source material data is missing or incomplete.<br/>cardData: {JSON.stringify(cardData)}</div>
                ) : (
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
                )
              ) : null}
              {openCard && openCard.type === 'question' ? (
                !cardData || !cardData.questionId || !cardData.projectId ? (
                  <div className="p-6 text-red-600 font-semibold">Error: Question data is missing or incomplete.<br/>cardData: {JSON.stringify(cardData)}</div>
                ) : (
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
                )
              ) : null}
              {openCard && openCard.type === 'insight' ? (
                !cardData || !cardData.insightId || !cardData.projectId ? (
                  <div className="p-6 text-red-600 font-semibold">Error: Insight data is missing or incomplete.<br/>cardData: {JSON.stringify(cardData)}</div>
                ) : (
                  <InsightCardContent
                    cardData={cardData}
                    openCard={openCard}
                    onUpdateNodeData={onUpdateNodeData}
                    onAddCard={onAddCard}
                    onDeleteCard={onDeleteCard}
                  />
                )
              ) : null}
              {openCard && openCard.type === 'thought' ? (
                !cardData || !cardData.thoughtId || !cardData.projectId ? (
                  <div className="p-6 text-red-600 font-semibold">Error: Thought data is missing or incomplete.<br/>cardData: {JSON.stringify(cardData)}</div>
                ) : (
                  <ThoughtCardContent
                    cardData={cardData}
                    openCard={openCard}
                    onUpdateNodeData={onUpdateNodeData}
                    onAddCard={onAddCard}
                    onDeleteCard={onDeleteCard}
                  />
                )
              ) : null}
            </>
          )}
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



// Source card content component
function SourceCardContent({ cardType, sourceTab, cardData, onUpdateNodeData, openCard, nodes, edges, onClose, onEdgesChange, onAddCard, onDeleteCard }: { cardType: string | undefined; sourceTab: string; cardData: any; onUpdateNodeData?: (cardId: string, newData: any) => void; openCard: { id: string; type: string } | null; nodes: any[]; edges: any[]; onClose: () => void; onEdgesChange?: (changes: any[]) => void; onAddCard?: (cardId: string) => void; onDeleteCard?: (cardId: string) => void }) {
  const [notes, setNotes] = useState(cardData?.additionalNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<string[]>(cardData?.files || []);
  const [isUploading, setIsUploading] = useState(false);
  
  // Add state for all editable fields
  const [sourceCitation, setSourceCitation] = useState(cardData?.source || "");
  const [summary, setSummary] = useState(cardData?.summary || "");
  const [sourceContent, setSourceContent] = useState(cardData?.text || "");
  const [tags, setTags] = useState<string[]>(Array.isArray(cardData?.tags) ? cardData.tags : []);
  const [tagInput, setTagInput] = useState("");
  const [argumentType, setArgumentType] = useState(cardData?.thesisSupport || "");
  const [sourceFunction, setSourceFunction] = useState(cardData?.sourceFunction || "");
  const [credibility, setCredibility] = useState(cardData?.credibility || "");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all existing tags from all cards
  const getAllExistingTags = () => {
    const allTags = new Set<string>();
    nodes.forEach(node => {
      if (node.data?.tags) {
        const nodeTags = Array.isArray(node.data.tags) ? node.data.tags : 
                        typeof node.data.tags === 'string' ? node.data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
        nodeTags.forEach((tag: string) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  // Filter suggestions based on input
  const filterSuggestions = (input: string) => {
    if (!input.trim()) {
      setFilteredSuggestions([]);
      return;
    }
    
    const existingTags = getAllExistingTags();
    const filtered = existingTags.filter(tag => 
      tag.toLowerCase().includes(input.toLowerCase()) && 
      !tags.includes(tag)
    );
    setFilteredSuggestions(filtered);
  };

  // Handle tag input change
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    filterSuggestions(value);
    setShowTagSuggestions(value.length > 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    const newTags = [...tags, suggestion];
    setTags(newTags);
    setTagInput("");
    setShowTagSuggestions(false);
    setFilteredSuggestions([]);
    saveAllFieldsWithTags(newTags);
  };

  // Update all fields when component mounts or card changes
  useEffect(() => {
    setNotes(cardData?.additionalNotes || "");
    setSourceCitation(cardData?.source || "");
    setSummary(cardData?.summary || "");
    setSourceContent(cardData?.text || "");
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
    setArgumentType(cardData?.thesisSupport || "");
    setSourceFunction(cardData?.sourceFunction || "");
    setCredibility(cardData?.credibility || "");
  }, [openCard?.id]); // Only run when the card ID changes, not when cardData changes

  // Update files when cardData changes
  useEffect(() => {
    setFiles(cardData?.files || []);
  }, [cardData?.files]);

  // Save all fields to backend
  const saveAllFields = async () => {
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          source: sourceCitation,
          summary: summary,
          text: sourceContent,
          tags: tags,
          thesisSupport: argumentType,
          sourceFunction: sourceFunction,
          credibility: credibility,
          additionalNotes: notes,
          files: files,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific tags
  const saveAllFieldsWithTags = async (tagsToSave: string[]) => {
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tagsToSave.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          source: sourceCitation,
          summary: summary,
          text: sourceContent,
          tags: tagsToSave,
          thesisSupport: argumentType,
          sourceFunction: sourceFunction,
          credibility: credibility,
          additionalNotes: notes,
          files: files,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific argument type
  const saveAllFieldsWithArgumentType = async (argumentTypeToSave: string) => {
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentTypeToSave,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          source: sourceCitation,
          summary: summary,
          text: sourceContent,
          tags: tags,
          thesisSupport: argumentTypeToSave,
          sourceFunction: sourceFunction,
          credibility: credibility,
          additionalNotes: notes,
          files: files,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific source function
  const saveAllFieldsWithSourceFunction = async (sourceFunctionToSave: string) => {
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunctionToSave,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          source: sourceCitation,
          summary: summary,
          text: sourceContent,
          tags: tags,
          thesisSupport: argumentType,
          sourceFunction: sourceFunctionToSave,
          credibility: credibility,
          additionalNotes: notes,
          files: files,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific credibility
  const saveAllFieldsWithCredibility = async (credibilityToSave: string) => {
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
      
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", {
          source: sourceCitation,
          summary: summary,
          text: sourceContent,
          tags: tags,
          thesisSupport: argumentType,
          sourceFunction: sourceFunction,
          credibility: credibilityToSave,
          additionalNotes: notes,
          files: files,
        });
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save notes to backend (existing function)
  const saveNotes = async (newNotes: string) => {
    if (!cardData?.sourceMaterialId) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: newNotes,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      // Revert the notes if save failed
      setNotes(cardData?.additionalNotes || "");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput("");
      setShowTagSuggestions(false);
      setFilteredSuggestions([]);
      // Save immediately when tag is added with the new tags
      saveAllFieldsWithTags(newTags);
    }
  };

  // Handle tag deletion
  const handleDeleteTag = (tagToDelete: string) => {
    const newTags = tags.filter(tag => tag !== tagToDelete);
    setTags(newTags);
    // Save immediately when tag is deleted with the new tags
    saveAllFieldsWithTags(newTags);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      await uploadFilesForCardType(
        "source",
        cardData?.sourceMaterialId,
        Array.from(e.target.files),
        files,
        (newFiles) => {
          setFiles(newFiles);
          onUpdateNodeData?.(openCard.id, { files: newFiles });
        }
      );
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      alert('Could not determine filename.');
      return;
    }
    if (!cardData || !cardData.sourceMaterialId || !cardData.projectId) {
      alert('Source material data is missing.');
      return;
    }
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Delete the file from the uploads directory (ignore 404)
      await fetch(`${API_URL}/upload/${filename}`, { method: 'DELETE' });

      // Remove the file from the files array
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);

      // Prepare the update payload (all required fields, snake_case)
      const payload = {
        citation_id: cardData.citationId ?? null,
        project_id: cardData.projectId,
        content: cardData.text ?? "",
        summary: cardData.summary ?? "",
        tags: Array.isArray(cardData.tags) ? cardData.tags.join(', ') : (cardData.tags ?? ""),
        argument_type: cardData.thesisSupport ?? "",
        function: cardData.sourceFunction ?? "",
        files: newFiles.length ? newFiles.join(',') : "",
        notes: cardData.additionalNotes ?? "",
      };

      // Update the source material in the backend
      const updateRes = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) {
        throw new Error('Failed to update source material');
      }
      
      // Update the node data in the parent component to reflect the change immediately
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", { files: newFiles });
      }
    } catch (err) {
      alert('Failed to fully delete file.');
    }
  };

  // Handle notes change with debounced save
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    
    // Debounce the save to avoid too many API calls
    const timeoutId = setTimeout(() => {
      saveNotes(newNotes);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  };

  // Handle field changes (just update state, no auto-save)
  const handleSourceCitationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceCitation(e.target.value);
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummary(e.target.value);
  };

  const handleSourceContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceContent(e.target.value);
  };

  const handleArgumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setArgumentType(newValue);
    // Save immediately when selection is made
    saveAllFieldsWithArgumentType(newValue);
  };

  const handleSourceFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSourceFunction(newValue);
    // Save immediately when selection is made
    saveAllFieldsWithSourceFunction(newValue);
  };

  const handleCredibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setCredibility(newValue);
    // Save immediately when selection is made
    saveAllFieldsWithCredibility(newValue);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  // Handle field blur (save when user leaves the field)
  const handleSourceCitationBlur = () => {
    saveAllFields();
  };

  const handleSummaryBlur = () => {
    saveAllFields();
  };

  const handleSourceContentBlur = () => {
    saveAllFields();
  };

  const handleArgumentTypeBlur = () => {
    saveAllFields();
  };

  const handleSourceFunctionBlur = () => {
    saveAllFields();
  };

  const handleCredibilityBlur = () => {
    saveAllFields();
  };

  const handleTagsBlur = () => {
    saveAllFields();
  };

  if (!cardType || cardType !== "source") {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="text-gray-500 text-sm">Card details and tabs go here.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {sourceTab === "content" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Source Material</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none min-h-[120px] max-h-64 overflow-auto"
              style={{ minHeight: '120px', maxHeight: '16rem' }}
              placeholder="Type or paste the full text content, quotes, or relevant excerpts from your source..."
              rows={5}
              value={sourceContent}
              onChange={handleSourceContentChange}
              onBlur={handleSourceContentBlur}
            />
          </div>
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleDeleteFile}
            fileInputRef={fileInputRef}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">My Notes</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm min-h-[80px] resize-y"
              placeholder="Add any personal notes, thoughts, or connections to other sources..."
              rows={3}
              value={notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>
      ) : sourceTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Function</label>
            <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={sourceFunction} onChange={handleSourceFunctionChange} onBlur={handleSourceFunctionBlur}>
              <option value="">Select source function...</option>
              <option value="Evidence">Evidence</option>
              <option value="Definition">Definition</option>
              <option value="Background Info">Background Info</option>
              <option value="Data Point">Data Point</option>
              <option value="Theory">Theory</option>
              <option value="Concept">Concept</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How does this source contribute to your research?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Argument Type</label>
            <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={argumentType} onChange={handleArgumentTypeChange} onBlur={handleArgumentTypeBlur}>
              <option value="">Select argument type...</option>
              <option value="Thesis-supporting">Thesis-supporting</option>
              <option value="Counter-evidence">Counter-evidence</option>
              <option value="Neutral to thesis">Neutral to thesis</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topical Tags</label>
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  className="w-full border rounded px-2 py-1"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type a tag and press Enter..."
                />
                {showTagSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
        
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Write a brief summary (2-3 sentences) of the key points..."
              rows={3}
              value={summary}
              onChange={handleSummaryChange}
              onBlur={handleSummaryBlur}
            />
            <p className="text-xs text-gray-500 mt-1">Focus on the most relevant information for your research question.</p>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Citation</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Author, Title, Publication, Date, URL..."
                rows={3}
                value={sourceCitation}
                onChange={handleSourceCitationChange}
                onBlur={handleSourceCitationBlur}
              />
              <p className="text-xs text-gray-500 mt-1">Include all available citation details. We'll help format this properly later.</p>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Credibility</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={credibility} onChange={handleCredibilityChange} onBlur={handleCredibilityBlur}>
                <option value="">Select credibility level...</option>
                <option value="Peer-reviewed study">Peer-reviewed study</option>
                <option value="News article (reputable)">News article (reputable)</option>
                <option value="News article (biased)">News article (biased)</option>
                <option value="Expert opinion">Expert opinion</option>
                <option value="Institutional report">Institutional report</option>
                <option value="Personal experience">Personal experience</option>
                <option value="Blog or opinion piece">Blog or opinion piece</option>
                <option value="Speculative claim">Speculative claim</option>
                <option value="Social media post">Social media post</option>
                <option value="Unclear origin">Unclear origin</option>
              </select>
            </div>
          </div>
        </div>
      ) : sourceTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 