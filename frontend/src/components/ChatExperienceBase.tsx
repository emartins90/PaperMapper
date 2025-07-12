import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileListDisplay } from "./FileListDisplay";
import { uploadFilesForCardType, CardType } from "./useFileUploadHandler";
import FileChip from "./FileChip";

interface ChatExperienceBaseProps {
  cardId: string;
  projectId: number;
  nodes: any[];
  onSaveCard?: (data: { cardId: string; chatAnswers: any; uploadedFiles: File[] }) => void;
  prompts: any[];
  promptTitles: { [key: string]: string };
  chatType: CardType;
  onUpdateNodeData?: (nodeId: string, data: any) => void;
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
  onSaveCard,
  prompts,
  promptTitles,
  chatType,
  onUpdateNodeData,
}) => {
  const [chatStep, setChatStep] = useState(0);
  const [chatAnswers, setChatAnswers] = useState<{ [key: string]: string }>({});
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
  const currentPrompt = prompts[chatStep];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    console.log("cardId changed, resetting state. New cardId:", cardId);
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
        headers: { Authorization: `Bearer ${token}` },
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
  }, [prompts, fetchCustomOptions]);

  // Fetch existing tags from backend (for source chat)
  const fetchExistingTags = async () => {
    if (chatType !== 'source') return;
    try {
      const token = getToken();
      if (!token) {
        setExistingTags([]);
        return;
      }
      const response = await fetch(`${API_URL}/projects/${projectId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
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
  useEffect(() => { if (chatType === 'source' && projectId) fetchExistingTags(); }, [chatType, projectId]);

  // Option selection
  const handleOptionSelect = (option: string) => {
    setSelectedOptions(prev => ({ ...prev, [currentPrompt.id]: option }));
    setChatInputs(prev => ({ ...prev, [currentPrompt.id]: option }));
    setShowCustomInput(prev => ({ ...prev, [currentPrompt.id]: false }));
  };

  // Back button handler
  const handleBack = () => {
    if (chatStep > 0) {
      const newStep = chatStep - 1;
      setChatStep(newStep);
      // Rebuild chat history up to the new step
      const newHistory: ChatMessage[] = [];
      for (let i = 0; i <= newStep; i++) {
        if (i === 0) {
          newHistory.push({ role: "system" as const, text: prompts[i].prompt });
        } else {
          const answer = chatAnswers[prompts[i-1].id] || "";
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
        const nextStep = chatStep + 1;
        setChatStep(nextStep);
        setChatHistory(prev => [...prev, { role: "system", text: prompts[nextStep].prompt }]);
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
        const nextStep = chatStep + 1;
        setChatStep(nextStep);
        setChatHistory(prev => [...prev, { role: "system", text: prompts[nextStep].prompt }]);
      }
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log("handleFileUpload called with files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    setUploadedFiles(prev => {
      const newFiles = [...prev, ...files];
      console.log("Updated uploadedFiles state:", newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
      uploadedFilesRef.current = newFiles; // Keep ref in sync
      return newFiles;
    });
  };
  // Delete uploaded file
  const handleDeleteImage = (imageIndex: number) => {
    console.log("handleDeleteImage called with index:", imageIndex);
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, index) => index !== imageIndex);
      console.log("After deletion, uploadedFiles state:", newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
      uploadedFilesRef.current = newFiles; // Keep ref in sync
      return newFiles;
    });
  };
  // Tag handlers (for source chat)
  const handleDeleteTag = (tagToDelete: string) => {
    setCurrentTags(prev => prev.filter(tag => tag !== tagToDelete));
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

  // Handle final submission for source material
  const handleSourceFinalSubmit = () => {
    // Include tags in the final submission
    const finalAnswers = { ...chatAnswers };
    if (currentTags.length > 0) {
      finalAnswers.topicalTags = currentTags.join(", ");
    }
    // Aggregate all files from filesByPrompt
    const allFiles: File[] = Object.values(filesByPrompt).flat();
    if (onSaveCard) onSaveCard({ cardId, chatAnswers: finalAnswers, uploadedFiles: allFiles });
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
                <div className={`${msg.role === "system" ? "text-gray-700 bg-gray-100 rounded-lg px-3 py-2 w-fit" : "text-primary bg-primary/10 rounded-lg px-3 py-2 w-fit"} ${msg.role === "user" ? "self-end" : ""}`}>
                  {/* Main text */}
                  {msg.text && <div>{msg.text}</div>}
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
        {chatStep < prompts.length && (
          <div className="space-y-3">
            {(() => {
              if (currentPrompt.options && currentPrompt.options.length > 0) {
                const defaultOptions: ComboboxOption[] = currentPrompt.options.map((o: any) => ({ value: o, label: o }));
                const customOptions: ComboboxOption[] = userOptions[currentPrompt.id] || [];
                const allCustomOptions = customOptions.filter(co => !defaultOptions.some(do_ => do_.value === co.value));
                const selectedValue = selectedOptions[currentPrompt.id] || "";
                const filteredOptions = inputValue[currentPrompt.id]
                  ? allCustomOptions.filter(option => option.label.toLowerCase().includes(inputValue[currentPrompt.id]?.toLowerCase()) || option.value.toLowerCase().includes(inputValue[currentPrompt.id]?.toLowerCase()))
                  : allCustomOptions;
                const showCustomOption = inputValue[currentPrompt.id] && !allCustomOptions.some(option => option.label.toLowerCase() === inputValue[currentPrompt.id]?.toLowerCase() || option.value.toLowerCase() === inputValue[currentPrompt.id]?.toLowerCase());
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      {defaultOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={selectedValue === option.value ? "default" : "outline"}
                          aria-pressed={selectedValue === option.value}
                          onClick={() => handleOptionSelect(option.value)}
                          className={`text-left py-5 border rounded-lg transition-colors ${selectedValue === option.value ? 'bg-blue-600 text-white font-bold border-blue-700 ring-2 ring-blue-400' : ''}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                      {currentPrompt.hasCustomOption && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={selectedValue && allCustomOptions.some(o => o.value === selectedValue) ? "default" : "outline"}
                              aria-pressed={!!(selectedValue && allCustomOptions.some(o => o.value === selectedValue))}
                              className={`text-left py-5 border rounded-lg transition-colors ${selectedValue && allCustomOptions.some(o => o.value === selectedValue) ? 'bg-blue-600 text-white font-bold border-blue-700 ring-2 ring-blue-400' : ''}`}
                            >
                              {selectedValue && allCustomOptions.some(o => o.value === selectedValue) ? selectedValue : "Add your own..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-92 min-w-[200px] p-0 z-[10000]">
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
                                  {filteredOptions.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.value}
                                      onSelect={() => {
                                        setInputValue({ ...inputValue, [currentPrompt.id]: "" });
                                        handleOptionSelect(option.value);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", selectedValue === option.value ? "opacity-100" : "opacity-0")} />
                                      {option.label}
                                    </CommandItem>
                                  ))}
                                  {showCustomOption && (
                                    <CommandItem
                                      key={inputValue[currentPrompt.id] || ""}
                                      value={inputValue[currentPrompt.id] || ""}
                                      onSelect={async () => {
                                        setInputValue({ ...inputValue, [currentPrompt.id]: "" });
                                        // Save new custom option to backend
                                        if (
                                          inputValue[currentPrompt.id] &&
                                          !defaultOptions.some((o) => o.value === inputValue[currentPrompt.id]) &&
                                          !customOptions.some((o) => o.value === inputValue[currentPrompt.id])
                                        ) {
                                          setSavingOption((prev) => ({ ...prev, [currentPrompt.id]: true }));
                                          try {
                                            const res = await fetch(`${API_URL}/users/me/custom-options`, {
                                              method: "POST",
                                              headers: {
                                                "Content-Type": "application/json",
                                                Authorization: getToken() ? `Bearer ${getToken()}` : "",
                                              },
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
                                        handleOptionSelect(inputValue[currentPrompt.id] || "");
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
                  </div>
                );
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-y"
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
                        + Add Files or Images
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
                                onClick={() => handleDeleteImage(idx)}
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
                                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
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
              } else if (chatType === 'source' && currentPrompt.id === 'topicalTags') {
                // Tags input for source chat
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentTags.map((tag, index) => (
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
                    <div className="relative">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Type a tag and press Enter..."
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      />
                      {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
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
                    <textarea
                      value={chatInputs[currentPrompt.id] || ""}
                      onChange={e => setChatInputs(prev => ({ ...prev, [currentPrompt.id]: e.target.value }))}
                      placeholder={`Enter your ${promptTitles[currentPrompt.id] || currentPrompt.id.toLowerCase()}...`}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
                    />
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
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
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
            console.log("Form submitted, chatType:", chatType, "chatStep:", chatStep, "prompts.length:", prompts.length);
            console.log("onSaveCard exists:", !!onSaveCard);
            console.log("chatInputs:", chatInputs);
            console.log("currentPrompt.id:", currentPrompt.id);
            
            if ((chatType === 'question' && chatStep === prompts.length - 1) || chatType === 'insight' || chatType === 'thought') {
              console.log("Should call onSaveCard");
              if (chatStep === 0 && !(chatInputs[currentPrompt.id]?.trim())) {
                console.log("Input is empty, showing error");
                toast.error("Please enter your content before continuing!");
                return;
              }
              
              // For insight and thought cards, update chatAnswers with current input
              const updatedChatAnswers = { ...chatAnswers };
              if (chatType === 'insight' || chatType === 'thought') {
                updatedChatAnswers[currentPrompt.id] = chatInputs[currentPrompt.id] || "";
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
              console.log("Calling onSaveCard with:", { cardId, chatAnswers: updatedChatAnswers, uploadedFiles: filesToUpload });
              console.log("uploadedFiles details:", { length: uploadedFiles.length, files: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) });
              console.log("uploadedFiles array is valid:", Array.isArray(uploadedFiles));
              console.log("uploadedFiles elements are File objects:", uploadedFiles.every(f => f instanceof File));
              console.log("uploadedFilesRef.current details:", { length: uploadedFilesRef.current.length, files: uploadedFilesRef.current.map(f => ({ name: f.name, size: f.size, type: f.type })) });
              if (onSaveCard) {
                // For insight and thought cards, always pass files to onSaveCard to be uploaded after backend record is created
                // This prevents the issue where files get uploaded to the initial empty record instead of the final one
                if (chatType === 'insight' || chatType === 'thought') {
                  console.log("Insight/thought card - passing files to onSaveCard for upload after backend record creation");
                  onSaveCard({ cardId, chatAnswers: updatedChatAnswers, uploadedFiles: filesToUpload });
                } else {
                  // For other card types, check if it's an existing card with content
                  const node = nodes.find((n: any) => n.id === cardId);
                  let backendId;
                  switch (chatType as CardType) {
                    case "source": backendId = node?.data?.sourceMaterialId; break;
                    case "question": backendId = node?.data?.questionId; break;
                    case "insight": backendId = node?.data?.insightId; break;
                    case "thought": backendId = node?.data?.thoughtId; break;
                    default: backendId = undefined;
                  }
                  
                  // Check if this is an existing card with content (not just an empty record)
                  const hasContent = node?.data?.insight || node?.data?.thought || node?.data?.question || node?.data?.source;
                  
                  if (backendId && uploadedFilesRef.current.length > 0 && hasContent) {
                    // For existing cards with content, upload files immediately
                    console.log("Existing card with content - uploading files immediately");
                    uploadFilesForCardType(
                      chatType as CardType,
                      backendId,
                      uploadedFilesRef.current,
                      node?.data?.files || [],
                      (newFiles: string[]) => {
                        // Update node data in parent
                        if (typeof onUpdateNodeData === 'function') {
                          onUpdateNodeData(cardId, { files: newFiles });
                        }
                        // Call onSaveCard with new files
                        onSaveCard({ cardId, chatAnswers: { ...updatedChatAnswers, files: newFiles }, uploadedFiles: [] });
                      }
                    ).catch((err) => {
                      toast.error("Failed to upload files: " + err.message);
                      onSaveCard({ cardId, chatAnswers: updatedChatAnswers, uploadedFiles: [] });
                    });
                  } else {
                    // For new cards or cards without content, call onSaveCard directly
                    console.log("New card or card without content - passing files to onSaveCard");
                    onSaveCard({ cardId, chatAnswers: updatedChatAnswers, uploadedFiles: filesToUpload });
                  }
                }
              }
              return; // Prevent form submission from continuing
            } else if (chatType === 'source' && chatStep === prompts.length - 1) {
              setChatStep(chatStep + 1);
            } else {
              console.log("Calling handleChatSubmit");
              handleChatSubmit(e);
            }
          }}
          className="sticky bottom-0 left-0 right-0 bg-white pt-2 z-10 border-t flex justify-center gap-2 p-4"
        >
          {chatStep > 0 && (
            <Button type="button" variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={chatStep === 0 && chatType === 'question' && !(chatInputs[currentPrompt.id]?.trim())}
            className={chatStep === 0 && chatType === 'question' && !(chatInputs[currentPrompt.id]?.trim()) ? "opacity-50 cursor-not-allowed" : ""}
          >
            {(chatType === 'question' && chatStep === prompts.length - 1) || chatType === 'insight' || chatType === 'thought' ? "Done" : "Continue"}
          </Button>
        </form>
      )}
      {chatType === 'source' && chatStep >= prompts.length && (
        <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 z-10 border-t flex justify-center gap-2 p-4">
          <Button type="button" variant="secondary" onClick={() => setChatStep(chatStep - 1)}>
            Back
          </Button>
          <Button type="button" onClick={handleSourceFinalSubmit}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatExperienceBase; 