import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CardType } from "../../components/useFileUploadHandler";
import FileChip from "../canvas-add-files/FileChip";
import { useCardSave } from "../shared/useCardSave";
import { Spinner } from "../ui/spinner";

interface Citation {
  id: number;
  text: string;
  credibility: string | null;
  project_id: number;
}

interface ChatExperienceBaseProps {
  cardId: string;
  projectId: number;
  nodes: any[];
  prompts: any[];
  promptTitles: { [key: string]: string };
  chatType: CardType;
  onUpdateNodeData?: (nodeId: string, data: any) => void;
  onClose?: () => void;
}

type ComboboxOption = { value: string; label: string };
type ChatMessage = { role: "system" | "user"; text: string; imageUrl?: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("token");
  return token || "";
};

const ChatExperienceBase: React.FC<ChatExperienceBaseProps> = ({
  cardId,
  projectId,
  nodes,
  prompts,
  promptTitles,
  chatType,
  onUpdateNodeData,
  onClose,
}) => {
  const [chatStep, setChatStep] = useState(0);
  const [chatAnswers, setChatAnswers] = useState<{ [key: string]: string | string[] }>({});
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [showCustomInput, setShowCustomInput] = useState<{ [key: string]: boolean }>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const uploadedFilesRef = useRef<File[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [userOptions, setUserOptions] = useState<{ [key: string]: ComboboxOption[] }>({});
  const [loadingOptions, setLoadingOptions] = useState<{ [key: string]: boolean }>({});
  const [savingOption, setSavingOption] = useState<{ [key: string]: boolean }>({});
  const [customOpen, setCustomOpen] = useState<{ [key: string]: boolean }>({});
  const [inputValue, setInputValue] = useState<{ [key: string]: string }>({});
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTagSuggestions, setFilteredTagSuggestions] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [chatInputs, setChatInputs] = useState<{ [key: string]: string }>({});
  const [filesByPrompt, setFilesByPrompt] = useState<{ [promptId: string]: File[] }>({});
  const [cardSaved, setCardSaved] = useState(false);
  const [deletingTags, setDeletingTags] = useState<Set<string>>(new Set());
  
  // Citation selection state
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationSelectorOpen, setCitationSelectorOpen] = useState(false);
  const [citationSearchValue, setCitationSearchValue] = useState("");

  const currentPrompt = prompts[chatStep];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the node position for the current card
  const currentNode = nodes.find(n => n.id === cardId);
  const nodePosition = currentNode?.position;

  // Use the shared save hook
  const { saveCard, isSaving } = useCardSave({
    cardId,
    cardType: chatType,
    projectId,
    nodePosition,
    onUpdateNodeData,
    onAddCard: undefined, // Don't call onSaveCard since we're using the shared save hook
    onDeleteCard: undefined, // Chat experience doesn't need delete functionality
  });

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {

    setChatStep(0);
    setChatAnswers({});
    setChatInput("");
    setSelectedOptions({});
    setShowCustomInput({});
    setUploadedFiles([]);
    uploadedFilesRef.current = [];
    setCurrentTags([]);
    setTagInput("");
    setChatInputs({});
    setChatHistory([{ role: "system", text: prompts[0].prompt }]);
    setFilesByPrompt({}); // Reset filesByPrompt on cardId change
    setCardSaved(false); // Reset saved state
    setSelectedCitation(null); // Reset selected citation
  }, [cardId]);

  // Fetch custom options from backend
  const fetchCustomOptions = useCallback(async (optionType: string) => {
    try {
      const token = getToken();
      if (!token) {
        setUserOptions(prev => ({ ...prev, [optionType]: [] }));
        return;
      }
      setLoadingOptions(prev => ({ ...prev, [optionType]: true }));
      const response = await fetch(`${API_URL}/users/me/custom-options?option_type=${optionType}`, {
        credentials: "include", // Send cookies with request
      });
      if (response.ok) {
        const data = await response.json();
        // Convert UserCustomOptionRead objects to ComboboxOption format
        const options = data.map((option: any) => ({ value: option.value, label: option.value }));
        setUserOptions(prev => ({ ...prev, [optionType]: options }));
      } else {
        setUserOptions(prev => ({ ...prev, [optionType]: [] }));
      }
    } catch (error) {
      setUserOptions(prev => ({ ...prev, [optionType]: [] }));
    } finally {
      setLoadingOptions(prev => ({ ...prev, [optionType]: false }));
    }
  }, []);

  // Fetch custom options when prompts change
  useEffect(() => {
    prompts.forEach(prompt => {
      if (prompt.hasCustomOption) {
        fetchCustomOptions(prompt.id);
      }
    });
  }, [prompts]); // Remove fetchCustomOptions from dependencies since it's stable

  // Fetch existing tags from backend (for all card types)
  const fetchExistingTags = async () => {
    try {
      const token = getToken();
      if (!token) {
        setExistingTags([]);
        return;
      }
      const response = await fetch(`${API_URL}/projects/${projectId}/tags`, {
        credentials: "include", // Send cookies with request
      });
      if (response.ok) {
        const data = await response.json();
        setExistingTags(data.tags || []);
      } else {
        setExistingTags([]);
      }
    } catch {
      setExistingTags([]);
    }
  };
  useEffect(() => { if (projectId) fetchExistingTags(); }, [projectId]);

  // Fetch existing citations
  const fetchCitations = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${API_URL}/citations/?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setCitations(data);
      }
    } catch (error) {
      console.error("Failed to fetch citations:", error);
    }
  };

  // Load citations on mount
  useEffect(() => {
    if (chatType === 'source') {
      fetchCitations();
    }
  }, [projectId, chatType]);

  // Listen for citation updates
  useEffect(() => {
    if (chatType !== 'source') return;
    
    const handleCitationUpdate = () => {
      fetchCitations();
    };
    window.addEventListener('citationUpdate', handleCitationUpdate);
    return () => window.removeEventListener('citationUpdate', handleCitationUpdate);
  }, [projectId, chatType]);

  // Note: Removed auto-advance useEffect to prevent navigation conflicts
  // Citation selection now handles advancement directly in handleCitationSelect

  // Filter citations for search
  const filteredCitations: Citation[] = citations.filter((citation) =>
    citation.text.toLowerCase().includes(citationSearchValue.toLowerCase()) ||
    (citation.credibility && citation.credibility.toLowerCase().includes(citationSearchValue.toLowerCase()))
  );

  // Handle citation selection
  const handleCitationSelect = (citation: Citation) => {
    setSelectedCitation(citation);
    setCitationSelectorOpen(false);
    setCitationSearchValue("");
    
    // Update chat answers with citation data
    setChatAnswers(prev => ({
      ...prev,
      sourceCitation: citation.text,
      sourceCredibility: citation.credibility || "",
      selectedCitationId: citation.id.toString(),
    }));
    
    // Update chat inputs
    setChatInputs(prev => ({
      ...prev,
      sourceCitation: citation.text,
      sourceCredibility: citation.credibility || "",
    }));
    
    // REMOVED: Auto-advancement logic - let user click Continue to proceed
  };

  // Handle citation removal
  const handleCitationRemove = () => {
    setSelectedCitation(null);
    
    // Clear citation data from chat answers
    setChatAnswers(prev => ({
      ...prev,
      sourceCitation: "",
      sourceCredibility: "",
      selectedCitationId: "",
    }));
    
    // Clear citation data from chat inputs
    setChatInputs(prev => ({
      ...prev,
      sourceCitation: "",
      sourceCredibility: "",
    }));
  };

  // Option selection
  const handleOptionSelect = (optionType: string, option: string) => {
    let valueToSave = option;
    // Only save the label part for claimType and similar prompts
    if ((optionType === "claimType" || optionType.endsWith("Type")) && typeof option === "string" && option.includes("–")) {
      valueToSave = option.split("–")[0].trim();
    }
    setSelectedOptions(prev => ({ ...prev, [optionType]: valueToSave }));
    setChatInputs(prev => ({ ...prev, [optionType]: valueToSave }));
    // Also update chatAnswers immediately for option selections
    setChatAnswers(prev => ({ ...prev, [optionType]: valueToSave }));
    setShowCustomInput(prev => ({ ...prev, [optionType]: false }));
  };

  // Back button handler
  const handleBack = () => {
    if (chatStep > 0) {
      let newStep = chatStep - 1;
      
      // Handle special case: if we're going back and would land on credibility step
      // but we have a selected citation, skip to citation step instead
      if (newStep >= 0 && newStep < prompts.length && prompts[newStep].id === 'sourceCredibility' && selectedCitation) {
        newStep = newStep - 1; // Go back one more step to citation
      }
      
      // Ensure we don't go below 0
      if (newStep < 0) newStep = 0;
      
      setChatStep(newStep);
      
      // Rebuild chat history up to the new step
      const newHistory: ChatMessage[] = [];
      for (let i = 0; i <= newStep; i++) {
        if (i === 0) {
          newHistory.push({ role: "system" as const, text: prompts[i].prompt });
        } else {
          let answer = chatAnswers[prompts[i-1].id] || "";
          if (Array.isArray(answer)) {
            answer = answer.join(", ");
          }
          console.log(`Adding answer for prompt ${prompts[i-1].id}:`, answer);
          newHistory.push({ role: "user" as const, text: answer === "" ? "Skipped" : answer });
          newHistory.push({ role: "system" as const, text: prompts[i].prompt });
        }
      }
      setChatHistory(newHistory);
    } else if (chatStep >= prompts.length) {
      // Handle going back from summary screen
      let newStep = prompts.length - 1;
      
      // If we have a selected citation and the last prompt is credibility, go back to citation
      if (selectedCitation && prompts[newStep]?.id === 'sourceCredibility') {
        newStep = newStep - 1;
      }
      
      setChatStep(newStep);
      
      // Rebuild chat history up to the new step
      const newHistory: ChatMessage[] = [];
      for (let i = 0; i <= newStep; i++) {
        if (i === 0) {
          newHistory.push({ role: "system" as const, text: prompts[i].prompt });
        } else {
          let answer = chatAnswers[prompts[i-1].id] || "";
          if (Array.isArray(answer)) {
            answer = answer.join(", ");
          }
          newHistory.push({ role: "user" as const, text: answer === "" ? "Skipped" : answer });
          newHistory.push({ role: "system" as const, text: prompts[i].prompt });
        }
      }
      setChatHistory(newHistory);
    }
  };

  // Chat submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
   
    if (currentPrompt.options && currentPrompt.options.length > 0) {
      const selectedValue = selectedOptions[currentPrompt.id] || "";
      setChatAnswers(prev => ({ ...prev, [currentPrompt.id]: selectedValue }));
      setChatHistory(prev => [...prev, { role: "user", text: selectedValue === "" ? "Skipped" : selectedValue }]);
      setChatInputs(prev => ({ ...prev, [currentPrompt.id]: selectedValue }));
      setFilesByPrompt(prev => ({ ...prev, [currentPrompt.id]: uploadedFiles }));
      setUploadedFiles([]);
      uploadedFilesRef.current = [];
      if (chatStep < prompts.length - 1) {
        let nextStep = chatStep + 1;
        
        // If we're on sourceCitation step and have a selected citation, skip the credibility step
        if (currentPrompt.id === 'sourceCitation' && selectedCitation) {
          nextStep = chatStep + 2; // Skip credibility prompt
        }
        
        if (nextStep <= prompts.length) {
          if (nextStep < prompts.length) {
            setChatStep(nextStep);
            setChatHistory(prev => [...prev, { role: "system", text: prompts[nextStep].prompt }]);
          } else {
            // We've reached the end, go to summary
            setChatStep(prompts.length);
          }
        }
      }
    } else {
      const answerText = chatInputs[currentPrompt.id]?.trim() || "";
      setChatAnswers(prev => ({ ...prev, [currentPrompt.id]: answerText }));
      setChatHistory(prev => [...prev, { role: "user", text: answerText === "" ? "Skipped" : answerText }]);
      setChatInputs(prev => ({ ...prev, [currentPrompt.id]: answerText }));
      setFilesByPrompt(prev => ({ ...prev, [currentPrompt.id]: uploadedFiles }));
      setUploadedFiles([]);
      uploadedFilesRef.current = [];
      if (chatStep < prompts.length - 1) {
        let nextStep = chatStep + 1;
        
        // If we're on sourceCitation step and have a selected citation, skip the credibility step
        if (currentPrompt.id === 'sourceCitation' && selectedCitation) {
          nextStep = chatStep + 2; // Skip credibility prompt
        }
        
        if (nextStep <= prompts.length) {
          if (nextStep < prompts.length) {
            setChatStep(nextStep);
            setChatHistory(prev => [...prev, { role: "system", text: prompts[nextStep].prompt }]);
          } else {
            // We've reached the end, go to summary
            setChatStep(prompts.length);
          }
        }
      }
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => {
      const newFiles = [...prev, ...files];
      uploadedFilesRef.current = newFiles; // Keep ref in sync
      return newFiles;
    });
  };
  // Delete uploaded file
  const handleDeleteImage = (imageIndex: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, index) => index !== imageIndex);
      uploadedFilesRef.current = newFiles; // Keep ref in sync
      return newFiles;
    });
  };
  // Tag handlers (for source chat)
  const handleDeleteTag = (tagToDelete: string) => {
    // Start animation
    setDeletingTags(prev => new Set(prev).add(tagToDelete));
    
    // Remove tag after animation completes
    setTimeout(() => {
      setCurrentTags(prev => prev.filter(tag => tag !== tagToDelete));
      setDeletingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagToDelete);
        return newSet;
      });
    }, 200); // Match the CSS transition duration
  };
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    filterTagSuggestions(value);
    setShowTagSuggestions(value.length > 0);
  };
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        const newTags = [...currentTags, tagInput.trim()];
        setCurrentTags(newTags);
        setTagInput("");
        setShowTagSuggestions(false);
        setFilteredTagSuggestions([]);
      }
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
      setFilteredTagSuggestions([]);
    }
  };
  const handleTagSuggestionClick = (suggestion: string) => {
    const newTags = [...currentTags, suggestion];
    setCurrentTags(newTags);
    setTagInput("");
    setShowTagSuggestions(false);
    setFilteredTagSuggestions([]);
  };
  // Tag suggestion filter
  const filterTagSuggestions = (input: string) => {
    if (!input.trim()) {
      setFilteredTagSuggestions([]);
      return;
    }
    const allExistingTags = existingTags;
    const filtered = allExistingTags.filter(tag => 
      tag.toLowerCase().includes(input.toLowerCase()) && 
      !currentTags.includes(tag)
    );
    setFilteredTagSuggestions(filtered);
  };

  // Handle final submission for all card types using shared save hook
  const handleFinalSubmit = async () => {
    // Include tags in the final submission
    const finalAnswers = { ...chatAnswers };
    if (currentTags.length > 0) {
      finalAnswers.topicalTags = currentTags;
    }
    // Aggregate all files from filesByPrompt
    const allFiles: File[] = Object.values(filesByPrompt).flat();
    

    
    try {
      await saveCard({
        cardId,
        chatAnswers: finalAnswers,
        uploadedFiles: allFiles,
      });
    } catch (error) {
      console.error("Failed to save card:", error);
      toast.error("Failed to save card: " + (error as Error).message);
    }
  };

  // Handle save for other card types using shared save hook
  const handleSaveCard = async () => {
    if (chatStep === 0 && !(chatInputs[currentPrompt.id]?.trim())) {

      toast.error("Please enter your content before continuing!");
      return;
    }
    
    // Update chatAnswers with current input for all card types
    const updatedChatAnswers = { ...chatAnswers };
    
    // For question cards, we need to save the current input if we're on the last step
    if (chatType === 'question' && chatStep === prompts.length - 1) {
      updatedChatAnswers[currentPrompt.id] = chatInputs[currentPrompt.id] || "";
    }
    // For claim cards, save the current input if we're on the last step
    if (chatType === 'claim' && chatStep === prompts.length - 1) {
      updatedChatAnswers[currentPrompt.id] = chatInputs[currentPrompt.id] || "";
    }
    
    // For insight and thought cards, update chatAnswers with current input
    if (chatType === 'insight' || chatType === 'thought') {
      updatedChatAnswers[currentPrompt.id] = chatInputs[currentPrompt.id] || "";
    }
    
    // Set topicalTags as array
    if (currentTags.length > 0) {
      updatedChatAnswers.topicalTags = currentTags;
    }
    // Use uploadedFilesRef.current for insight and thought cards (files uploaded in chat)
    // Use filesByPrompt for other card types (files uploaded per prompt)
    let filesToUpload: File[] = [];
    if (chatType === 'insight' || chatType === 'thought') {
      filesToUpload = uploadedFilesRef.current;
    } else {
      const allFiles = Object.values(filesByPrompt).flat();
      filesToUpload = allFiles.filter(f => f instanceof File);
    }
    

    

    
    try {
      await saveCard({
        cardId,
        chatAnswers: updatedChatAnswers,
        uploadedFiles: filesToUpload,
      });
      
      // Mark card as saved and close the panel
      setCardSaved(true);
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to save card:", error);
      toast.error("Failed to save card: " + (error as Error).message);
    }
  };

  // Mapping from chatType to the main text prompt id
  const mainTextPromptId: Record<string, string> = {
    source: 'sourceContent',
    question: 'questionText',
    insight: 'insightText',
    thought: 'thoughtText',
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-28" ref={chatContainerRef}>
       
        <div className="space-y-3 mb-6">
          {chatHistory.map((msg, i) => {
            // Find the prompt id for this user message
            let promptId: string | undefined = undefined;
            if (msg.role === "user") {
              // User messages alternate with system prompts, so index in prompts is (i-1)/2
              const promptIdx = Math.floor((i - 1) / 2);
              if (promptIdx >= 0 && promptIdx < prompts.length) {
                promptId = prompts[promptIdx].id;
              }
            }
            return (
              <div key={i} className={`flex items-center gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    msg.role === "system"
                      ? "text-gray-700 bg-gray-100 rounded-lg px-3 py-2 w-fit"
                      : (() => {
                          const colorVars = {
                            source: 'bg-[var(--color-source-100)]',
                            question: 'bg-[var(--color-question-100)]',
                            insight: 'bg-[var(--color-insight-100)]',
                            thought: 'bg-[var(--color-thought-100)]',
                            claim: 'bg-[var(--color-claim-100)]',
                          };
                          return `${colorVars[chatType] || 'bg-primary/10'} text-primary rounded-lg px-3 py-2 w-fit`;
                        })()
                  }
                >
                  {/* Main text with paragraph breaks for system messages */}
                  {msg.text && msg.role === "system"
                    ? msg.text.split(/\n\n/).map((para, idx) => (
                        <p key={idx} style={{ marginBottom: idx < msg.text.split(/\n\n/).length - 1 ? '1em' : 0 }}>{para.split(/\n/).map((line, i) => (
                          <React.Fragment key={i}>{line}{i < para.split(/\n/).length - 1 && <br />}</React.Fragment>
                        ))}</p>
                      ))
                    : msg.text && <div>{msg.text}</div>
                  }
                  {/* If user message and files were uploaded for this prompt, show them */}
                  {msg.role === "user" && promptId && filesByPrompt[promptId] && filesByPrompt[promptId].length > 0 && (
                    <div className="mt-2 space-y-1">
                      {/* Images as small thumbnails */}
                      <div className="flex flex-wrap gap-2">
                        {filesByPrompt[promptId].filter(f => f.type.startsWith('image/')).map((file, idx) => {
                          const url = URL.createObjectURL(file);
                          return (
                            <img
                              key={idx}
                              src={url}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded border"
                              style={{ display: 'inline-block' }}
                            />
                          );
                        })}
                      </div>
                      {/* Non-image files as chips (not removable) */}
                      <div className="flex flex-col gap-1 mt-1">
                        {filesByPrompt[promptId].filter(f => !f.type.startsWith('image/')).map((file, idx) => (
                          <FileChip key={idx} fileUrl={file.name} filename={file.name} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {chatStep < prompts.length && currentPrompt && (
          <div className="space-y-3">
            {(() => {
              // If we're on the credibility step and we have a selected citation, skip it
              if (currentPrompt.id === 'sourceCredibility' && selectedCitation) {
                return null;
              }
        
          
              if (currentPrompt.options && currentPrompt.options.length > 0) {
                const selectedValue = selectedOptions[currentPrompt.id] || "";
                // Check for grouped options
                const isGrouped = Array.isArray(currentPrompt.options) && currentPrompt.options[0] && typeof currentPrompt.options[0] === 'object' && 'group' in currentPrompt.options[0];
                if (isGrouped) {
                  return (
                    <div className="space-y-2">
                      {Array.isArray(currentPrompt.options) && (currentPrompt.options[0] as any)?.group
                        ? (
                            (currentPrompt.options as { group: string; options: (string | { label: string })[] }[]).map((groupObj, groupIdx) => (
                              <div key={groupIdx} className={groupIdx > 0 ? "mt-4" : ""}>
                                <div className="text-xs text-gray-500 font-semibold mb-2 pl-1">{groupObj.group}</div>
                                {groupObj.options.map((option: string | { label: string }, optIdx: number) => {
                                  if (typeof option === 'string') {
                                    const [main, ...descParts] = option.split(' – ');
                                    const description = descParts.join(' – ');
                                    const isSelected = selectedOptions[currentPrompt.id] === main.trim();
                                    return (
                                      <Button
                                        key={option}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        aria-pressed={isSelected}
                                        onClick={() => handleOptionSelect(currentPrompt.id, option)}
                                        className={`w-full text-left px-4 py-5 mb-2 border rounded-lg transition-colors ${isSelected ? 'bg-primary text-white font-bold border-primary ring-2 ring-primary/50' : ''}`}
                                      >
                                        <div>
                                          {description ? (
                                            <>
                                              <strong className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>{main}</strong>
                                              <span className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}> – {description}</span>
                                            </>
                                          ) : (
                                            <span className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>{main}</span>
                                          )}
                                        </div>
                                      </Button>
                                    );
                                  } else {
                                    // Option is an object (for future compatibility)
                                    return (
                                      <Button
                                        key={option.label}
                                        type="button"
                                        variant={selectedOptions[currentPrompt.id] === option.label ? "default" : "outline"}
                                        aria-pressed={selectedOptions[currentPrompt.id] === option.label}
                                        onClick={() => handleOptionSelect(currentPrompt.id, option.label)}
                                        className={`w-full text-left px-4 py-5 mb-2 border rounded-lg transition-colors ${selectedOptions[currentPrompt.id] === option.label ? 'bg-primary text-white font-bold border-primary ring-2 ring-primary/50' : ''}`}
                                      >
                                        <div>
                                          <strong className={`text-sm ${selectedOptions[currentPrompt.id] === option.label ? 'text-white' : 'text-foreground'}`}>{option.label}</strong>
                                        </div>
                                      </Button>
                                    );
                                  }
                                })}
                              </div>
                            ))
                          )
                        : null}
                    </div>
                  );
                } else {
                  // FLAT OPTIONS BLOCK
                  return (
                    <div className="grid grid-cols-1 gap-2">
                      {(currentPrompt.options as (string | { label: string })[]).map((o) => {
                        if (typeof o === 'string') {
                          const [main, ...descParts] = o.split(' – ');
                          const description = descParts.join(' – ');
                          const isSelected = selectedValue === main.trim();
                          return (
                            <Button
                              key={o}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              aria-pressed={isSelected}
                              onClick={() => handleOptionSelect(currentPrompt.id, o)}
                              className={`w-full text-left px-4 py-5 mb-2 border rounded-lg transition-colors ${isSelected ? 'bg-primary text-white font-bold border-primary ring-2 ring-primary/50' : ''}`}
                            >
                              <div>
                                {description ? (
                                  <>
                                    <strong className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>{main}</strong>
                                    <span className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}> – {description}</span>
                                  </>
                                ) : (
                                  <span className={`text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>{main}</span>
                                )}
                              </div>
                            </Button>
                          );
                        } else {
                          return (
                            <Button
                              key={o.label}
                              type="button"
                              variant={selectedValue === o.label ? "default" : "outline"}
                              aria-pressed={selectedValue === o.label}
                              onClick={() => handleOptionSelect(currentPrompt.id, o.label)}
                              className={`w-full text-left px-4 py-5 mb-2 border rounded-lg transition-colors ${selectedValue === o.label ? 'bg-primary text-white font-bold border-primary ring-2 ring-primary/50' : ''}`}
                            >
                              <div>
                                <strong className={`text-sm ${selectedValue === o.label ? 'text-white' : 'text-foreground'}`}>{o.label}</strong>
                              </div>
                            </Button>
                          );
                        }
                      })}
                      {currentPrompt.hasCustomOption && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={selectedValue && userOptions[currentPrompt.id]?.some(o => o.value === selectedValue) ? "default" : "outline"}
                              aria-pressed={!!(selectedValue && userOptions[currentPrompt.id]?.some(o => o.value === selectedValue))}
                              className={`w-full text-left px-4 py-5 mb-2 border rounded-lg transition-colors ${selectedValue && userOptions[currentPrompt.id]?.some(o => o.value === selectedValue) ? 'bg-primary text-white font-bold border-primary ring-2 ring-primary/50' : ''}`}
                            >
                              {selectedValue && userOptions[currentPrompt.id]?.some(o => o.value === selectedValue) ? selectedValue : "Add your own..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-92 min-w-[200px] p-0 z-[110]">
                            <Command>
                              <CommandInput
                                placeholder={loadingOptions[currentPrompt.id] ? "Loading..." : "Type or select..."}
                                value={inputValue[currentPrompt.id] || ""}
                                onValueChange={value => setInputValue({ ...inputValue, [currentPrompt.id]: value })}
                                className="h-9"
                              />
                              <CommandList>
                                <CommandEmpty className="px-4 py-2">No custom options found.</CommandEmpty>
                                <CommandGroup>
                                  {userOptions[currentPrompt.id]?.filter(option => option.label.toLowerCase().includes(inputValue[currentPrompt.id]?.toLowerCase()) || option.value.toLowerCase().includes(inputValue[currentPrompt.id]?.toLowerCase())).map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.value}
                                      onSelect={() => {
                                        setInputValue({ ...inputValue, [currentPrompt.id]: "" });
                                        handleOptionSelect(currentPrompt.id, option.value);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", selectedValue === option.value ? "opacity-100" : "opacity-0")}/>
                                      {option.label}
                                    </CommandItem>
                                  ))}
                                  {inputValue[currentPrompt.id] && !userOptions[currentPrompt.id]?.some(option => option.label.toLowerCase() === inputValue[currentPrompt.id]?.toLowerCase() || option.value.toLowerCase() === inputValue[currentPrompt.id]?.toLowerCase()) && (
                                    <CommandItem
                                      key={inputValue[currentPrompt.id] || ""}
                                      value={inputValue[currentPrompt.id] || ""}
                                      onSelect={async () => {
                                        setInputValue({ ...inputValue, [currentPrompt.id]: "" });
                                        // Save new custom option to backend
                                        if (
                                          inputValue[currentPrompt.id] &&
                                          !currentPrompt.options.some((o: string) => o === inputValue[currentPrompt.id]) &&
                                          !userOptions[currentPrompt.id]?.some((o: { value: string }) => o.value === inputValue[currentPrompt.id])
                                        ) {
                                          setSavingOption((prev) => ({ ...prev, [currentPrompt.id]: true }));
                                          try {
                                            const res = await fetch(`${API_URL}/users/me/custom-options`, {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                              },
                                              credentials: "include", // Send cookies with request
                                              body: JSON.stringify({ option_type: currentPrompt.id, value: inputValue[currentPrompt.id] }),
                                            });
                                            if (res.ok) {
                                              setUserOptions((prev) => ({
                                                ...prev,
                                                [currentPrompt.id]: [...(prev[currentPrompt.id] || []), { value: inputValue[currentPrompt.id], label: inputValue[currentPrompt.id] }],
                                              }));
                                            }
                                          } catch {}
                                          setSavingOption((prev) => ({ ...prev, [currentPrompt.id]: false }));
                                        }
                                        handleOptionSelect(currentPrompt.id, inputValue[currentPrompt.id] || "");
                                      }}
                                    >
                                      <Check className="mr-2 h-4 w-4 opacity-0" />
                                      {savingOption[currentPrompt.id] ? "Saving..." : `Add "${inputValue[currentPrompt.id]}"`}
                                    </CommandItem>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  );
                }
              } else if (currentPrompt.id === mainTextPromptId[chatType]) {
                // Textarea + file upload for the main text prompt of each card type
                return (
                  <div className="space-y-4">
                    <textarea
                      value={chatInputs[currentPrompt.id] || ""}
                      onChange={e => setChatInputs(prev => ({ ...prev, [currentPrompt.id]: e.target.value }))}
                      placeholder={
                        chatType === 'source' ? "Paste or type the content from your source..." :
                        chatType === 'question' ? "Type your research question here..." :
                        chatType === 'insight' ? "Describe the insight or pattern you noticed..." :
                        chatType === 'thought' ? "Share your thought..." :
                        ""
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] resize-y"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx,audio/mp3,audio/wav,audio/m4a,audio/ogg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm"
                      >
                        + Add Files & Images
                      </Button>
                      {uploadedFiles.length > 0 && (
                        <span className="text-xs text-gray-500">{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected</span>
                      )}
                    </div>
                    {/* Show uploaded files/images */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-2">
                        {/* Images as previews */}
                        {uploadedFiles.filter(f => f.type.startsWith('image/')).map((file, idx) => {
                          const url = URL.createObjectURL(file);
                          return (
                            <div key={idx} className="relative mb-3">
                              <img
                                src={url}
                                alt={file.name}
                                className="w-full h-auto rounded border"
                                style={{ objectFit: 'contain' }}
                              />
                              <button
                                onClick={() => handleDeleteImage(uploadedFiles.findIndex(f => f === file))}
                                className="absolute top-1 right-1 bg-white border border-gray-300 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-200 shadow-md"
                                title="Delete file"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                        {/* Non-image files as chips with remove button */}
                        {uploadedFiles.filter(f => !f.type.startsWith('image/')).map((file, idx) => {
                          // Use icon/color logic from FileUploadSection
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          let icon = null;
                          if (ext === "pdf") icon = <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.828A2 2 0 0 0 19.414 7.414l-5.828-5.828A2 2 0 0 0 12.172 1H6zm7 1.414L18.586 7H15a2 2 0 0 1-2-2V3.414z"/></svg>;
                          else if (["doc", "docx"].includes(ext || "")) icon = <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.828A2 2 0 0 0 19.414 7.414l-5.828-5.828A2 2 0 0 0 12.172 1H6zm7 1.414L18.586 7H15a2 2 0 0 1-2-2V3.414z"/></svg>;
                          else if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) icon = <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>;
                          else icon = <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>;
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 w-full">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded flex items-center justify-center bg-gray-100">
                                  {icon}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteImage(uploadedFiles.findIndex(f => f === file))}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove file"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else if (currentPrompt.id === 'topicalTags') {
                // Tags input for all card types
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentTags.map((tag, index) => (
                        <span
                          key={index}
                          className={`bg-primary-200 text-foreground px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-all duration-200 ease-in-out ${
                            deletingTags.has(tag) 
                              ? "opacity-0 scale-75 transform" 
                              : "opacity-100 scale-100"
                          }`}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag)}
                            className="text-primary-600 hover:text-primary-800 text-xs font-bold hover:bg-primary-300/50 rounded-full transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={tagInput || ''}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Type a tag and press Enter..."
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                      {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                        <div className="absolute z-102 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
                             style={{ bottom: '100%', marginBottom: '4px' }}>
                          {filteredTagSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                              onClick={() => handleTagSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // Textarea for all other text input prompts
                return (
                  <div className="space-y-2">
                    {/* Citation selection for sourceCitation prompt */}
                    {currentPrompt.id === 'sourceCitation' && chatType === 'source' && (
                      <div className="space-y-3">
                        {/* Show selected citation or citation selection button */}
                        {selectedCitation ? (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{selectedCitation.text}</p>
                              {selectedCitation.credibility && (
                                <p className="text-xs text-gray-600 mt-1">Credibility: {selectedCitation.credibility}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCitationRemove}
                              className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          citations.length > 0 && (
                            <Popover open={citationSelectorOpen} onOpenChange={setCitationSelectorOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full">
                                  Add Existing Citation
                                </Button>
                              </PopoverTrigger>
                            <PopoverContent className="w-96 p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search citations..."
                                  value={citationSearchValue}
                                  onValueChange={setCitationSearchValue}
                                />
                                <CommandList className="max-h-[500px]">
                                  <CommandEmpty>No citations found.</CommandEmpty>
                                  <CommandGroup>
                                    {filteredCitations.map((citation: Citation, index: number) => (
                                      <React.Fragment key={citation.id}>
                                        <CommandItem
                                          value={citation.text}
                                          onSelect={() => handleCitationSelect(citation)}
                                          className="py-3"
                                        >
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">{citation.text}</p>
                                            {citation.credibility && (
                                              <p className="text-xs text-gray-600">Credibility: {citation.credibility}</p>
                                            )}
                                          </div>
                                          <Check className={cn("ml-2 h-4 w-4", selectedCitation !== null && (selectedCitation as Citation).id === citation.id ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                        {index < filteredCitations.length - 1 && (
                                          <div className="h-px bg-gray-200 mx-2" />
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )
                        )}
                        
                        {/* Citation textarea - only show if no citation is selected */}
                        {!selectedCitation && (
                    <textarea
                      value={chatInputs[currentPrompt.id] || ""}
                      onChange={e => setChatInputs(prev => ({ ...prev, [currentPrompt.id]: e.target.value }))}
                      placeholder={`Enter your ${promptTitles[currentPrompt.id] || currentPrompt.id.toLowerCase()}...`}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] resize-y"
                    />
                        )}
                      </div>
                    )}
                    
                    {/* Regular textarea for other prompts */}
                    {currentPrompt.id !== 'sourceCitation' && (
                      <textarea
                        value={chatInputs[currentPrompt.id] || ""}
                        onChange={e => setChatInputs(prev => ({ ...prev, [currentPrompt.id]: e.target.value }))}
                        placeholder={`Enter your ${promptTitles[currentPrompt.id] || currentPrompt.id.toLowerCase()}...`}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] resize-y"
                      />
                    )}
                  </div>
                );
              }
            })()}
          </div>
        )}
        {chatType === 'source' && chatStep >= prompts.length && (
          <div className="mt-4">
            <div className="font-semibold mb-3">Here's what you've captured:</div>
            <div className="space-y-3 bg-gray-100 p-4 rounded-lg">
              {prompts.map((prompt, index) => {
                const answer = chatAnswers[prompt.id] || "";
                if (answer === "") return null;
                
                // Check if this is the source content prompt and if there are files
                const isSourceContent = prompt.id === 'sourceContent';
                const allFiles: File[] = Object.values(filesByPrompt).flat();
                const hasFiles = isSourceContent && allFiles.length > 0;
                
                return (
                  <div key={index} className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{promptTitles[prompt.id]}:</span>
                    <span className="text-sm text-gray-900">{answer}</span>
                    {hasFiles && (
                      <div className="mt-2 space-y-1">
                        {/* Images as small thumbnails - same as chat responses */}
                        <div className="flex flex-wrap gap-2">
                          {allFiles.filter(f => f.type.startsWith('image/')).map((file, idx) => {
                            const url = URL.createObjectURL(file);
                            return (
                              <img
                                key={idx}
                                src={url}
                                alt={file.name}
                                className="w-20 h-20 object-cover rounded border"
                                style={{ display: 'inline-block' }}
                              />
                            );
                          })}
                        </div>
                        {/* Non-image files as chips - same as chat responses */}
                        <div className="flex flex-col gap-1 mt-1">
                          {allFiles.filter(f => !f.type.startsWith('image/')).map((file, idx) => (
                            <FileChip key={idx} fileUrl={file.name} filename={file.name} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {currentTags.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentTags.map((tag, index) => (
                      <span key={index} className="bg-primary-200 text-foreground px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      {/* Sticky action buttons at the bottom */}
      {chatStep < prompts.length && (
        <form
          onSubmit={e => {
            e.preventDefault();
            
            // Prevent multiple saves
            if (cardSaved) {
              return;
            }
            
            if (
              ((chatType === 'question' || chatType === 'claim') && chatStep === prompts.length - 1) ||
              ((chatType === 'insight' || chatType === 'thought') && chatStep === prompts.length - 1)
            ) {
              handleSaveCard();
              return; // Prevent form submission from continuing
            } else if (chatType === 'source' && chatStep === prompts.length - 1) {
              // For source cards, advance to summary screen
              setChatStep(chatStep + 1);
              // Don't add any additional system message - just show the summary
            } else {
              handleChatSubmit(e);
            }
          }}
          className="sticky bottom-0 left-0 right-0 bg-white pt-2 z-10 border-t flex gap-3 p-4"
        >
          {chatStep > 0 && (
            <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={chatStep === 0 && chatType === 'question' && !(chatInputs[currentPrompt.id]?.trim()) || isSaving || cardSaved}
            className={`flex-1 ${chatStep === 0 && chatType === 'question' && !(chatInputs[currentPrompt.id]?.trim()) || cardSaved ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : cardSaved ? "Saved!" : (
              ((chatType === 'question' || chatType === 'claim') && chatStep === prompts.length - 1)
                ? "Done"
                : ((chatType === 'insight' || chatType === 'thought') && chatStep === prompts.length - 1)
                  ? "Done"
                  : "Continue"
            )}
          </Button>
        </form>
      )}
      {chatType === 'source' && chatStep >= prompts.length && (
        <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 z-10 border-t flex gap-3 p-4">
          <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button type="button" onClick={handleFinalSubmit} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : "Done"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatExperienceBase; 