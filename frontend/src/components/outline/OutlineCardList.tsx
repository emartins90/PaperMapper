"use client";

import React, { useState, useEffect, useMemo } from "react";
import SourceMaterialCard from "../canvas-cards/SourceMaterialCard";
import QuestionCard from "../canvas-cards/QuestionCard";
import InsightCard from "../canvas-cards/InsightCard";
import ThoughtCard from "../canvas-cards/ThoughtCard";
import ClaimCard from "../canvas-cards/ClaimCard";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Badge } from "../ui/badge";
import { LuSearch, LuX, LuListFilter, LuSpeech, LuCircleHelp, LuBookOpen, LuLightbulb, LuMessageCircle } from "react-icons/lu";
import { useDraggable } from '@dnd-kit/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Draggable card wrapper
function DraggableCard({ 
  id, 
  children, 
  cardData, 
  isActive, 
  isInStructure 
}: { 
  id: string; 
  children: React.ReactNode; 
  cardData: any; 
  isActive: boolean; 
  isInStructure: boolean; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id,
    data: cardData,
    disabled: isInStructure // Disable dragging if card is in structure
  });

  return (
    <div
      ref={setNodeRef}
      {...(!isInStructure ? listeners : {})} // Only add listeners if not in structure
      {...(!isInStructure ? attributes : {})} // Only add attributes if not in structure
      className={`${
        isInStructure 
          ? 'cursor-not-allowed opacity-40' // Disabled styling
          : (isDragging ? 'opacity-50 cursor-grabbing' : 'opacity-100 cursor-grab') // Normal drag styling
      }`}
    >
      {children}
    </div>
  );
}

interface OutlineCardListProps {
  projectId: number;
  isCondensed?: boolean;
  activeCardId?: string | null;
  sections?: any[]; // Add sections prop to trigger updates
}

export default function OutlineCardList({ projectId, isCondensed = true, activeCardId, sections }: OutlineCardListProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Tag filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>("any");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  
  // Card type filter state
  const cardTypeOptions = [
    { value: 'claim', label: 'Claim', icon: LuSpeech, color: 'bg-claim-100', text: 'text-claim-700' },
    { value: 'question', label: 'Question', icon: LuCircleHelp, color: 'bg-question-100', text: 'text-question-700' },
    { value: 'source', label: 'Source', icon: LuBookOpen, color: 'bg-source-100', text: 'text-source-700' },
    { value: 'insight', label: 'Insight', icon: LuLightbulb, color: 'bg-insight-100', text: 'text-insight-700' },
    { value: 'thought', label: 'Thought', icon: LuMessageCircle, color: 'bg-thought-100', text: 'text-thought-700' },
  ];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(cardTypeOptions.map(opt => opt.value));
  const [deletingTags, setDeletingTags] = useState<Set<string>>(new Set());

  // Create a stable reference for card placements that only changes when placements actually change
  const cardPlacementsHash = useMemo(() => {
    if (!sections) return null;
    
    // Extract all card placements from sections and subsections
    const allPlacements = new Map();
    sections.forEach((section: any) => {
      section.card_placements?.forEach((placement: any) => {
        allPlacements.set(placement.card_id, placement);
      });
      // Also check subsections
      section.subsections?.forEach((subsection: any) => {
        subsection.card_placements?.forEach((placement: any) => {
          allPlacements.set(placement.card_id, placement);
        });
      });
    });
    
    // Create a hash of all placement IDs and their section IDs for comparison
    // This only changes when card placements are added, removed, or moved between sections
    return Array.from(allPlacements.entries())
      .map(([cardId, placement]) => `${cardId}:${placement.section_id}`)
      .sort()
      .join('|');
  }, [sections]);

  // Load cards from backend when projectId changes or when card placements change
  useEffect(() => {
    if (!projectId) return;
    
    const loadCards = async () => {
      try {
        setLoading(true);
        
        // Load cards from backend
        const cardsRes = await fetch(`${API_URL}/cards/?project_id=${projectId}`, {
          credentials: "include",
        });
        
        if (!cardsRes.ok) throw new Error("Failed to load cards");
        const cards = await cardsRes.json();
        
        // Extract placement data from sections prop
        const placementMap = new Map();
        if (sections) {
          sections.forEach((section: any) => {
            section.card_placements?.forEach((placement: any) => {
              placementMap.set(placement.card_id, placement);
            });
            // Also check subsections
            section.subsections?.forEach((subsection: any) => {
              subsection.card_placements?.forEach((placement: any) => {
                placementMap.set(placement.card_id, placement);
              });
            });
          });
        }
        
        // Convert backend cards to ReactFlow nodes (similar to Canvas)
        const loadedNodes = await Promise.all(cards.map(async (card: any) => {
          let cardData = {};
          
          // For all card types, we need to fetch the actual data using data_id
          if (card.data_id) {
            try {
              // Determine the correct endpoint based on card type
              let dataEndpoint = '';
              switch (card.type) {
                case 'source':
                  dataEndpoint = `${API_URL}/source_materials/${card.data_id}`;
                  break;
                case 'question':
                  dataEndpoint = `${API_URL}/questions/${card.data_id}`;
                  break;
                case 'insight':
                  dataEndpoint = `${API_URL}/insights/${card.data_id}`;
                  break;
                case 'thought':
                  dataEndpoint = `${API_URL}/thoughts/${card.data_id}`;
                  break;
                case 'claim':
                  dataEndpoint = `${API_URL}/claims/${card.data_id}`;
                  break;
                default:
                  console.warn(`Unknown card type: ${card.type}`);
                  break;
              }
              
              if (dataEndpoint) {
                const dataRes = await fetch(dataEndpoint, {
                  credentials: "include",
                });
                if (dataRes.ok) {
                  const cardContent = await dataRes.json();
                  
                  // Map the backend field names to the expected card component field names
                  let mappedData = { ...cardContent };
                  
                  if (card.type === 'question') {
                    mappedData = {
                      ...cardContent,
                      question: cardContent.question_text,
                      questionFormatted: cardContent.question_text_formatted,
                    };
                  } else if (card.type === 'insight') {
                    mappedData = {
                      ...cardContent,
                      insight: cardContent.insight_text,
                      insightFormatted: cardContent.insight_text_formatted,
                    };
                  } else if (card.type === 'thought') {
                    mappedData = {
                      ...cardContent,
                      thought: cardContent.thought_text,
                      thoughtFormatted: cardContent.thought_text_formatted,
                    };
                  } else if (card.type === 'claim') {
                    mappedData = {
                      ...cardContent,
                      claim: cardContent.claim_text,
                      claimFormatted: cardContent.claim_text_formatted,
                    };
                  } else if (card.type === 'source') {
                    // Fetch citation text if citation_id exists
                    let citationText = '';
                    if (cardContent.citation_id) {
                      try {
                        const citationRes = await fetch(`${API_URL}/citations/${cardContent.citation_id}`, {
                          credentials: "include",
                        });
                        if (citationRes.ok) {
                          const citation = await citationRes.json();
                          citationText = citation.text;
                        }
                      } catch (error) {
                        console.error('Error loading citation:', error);
                      }
                    }
                    
                    mappedData = {
                      ...cardContent,
                      text: cardContent.content,
                      contentFormatted: cardContent.content_formatted,
                      summary: cardContent.summary,
                      summaryFormatted: cardContent.summary_formatted,
                      thesisSupport: cardContent.argument_type,
                      source: citationText,
                      credibility: cardContent.notes,
                      sourceFunction: cardContent.function,
                    };
                  }
                  
                  // Create fileEntries with original filenames (same logic as Canvas component)
                  const fileUrls = cardContent.files ? cardContent.files.split(',').filter((url: string) => url.trim()) : [];
                  const fileFilenames = cardContent.file_filenames ? cardContent.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                  
                  const fileEntries = fileUrls.map((url: string, index: number) => ({
                    url,
                    filename: fileFilenames[index] || "file",
                    type: ""
                  }));
                  
                  cardData = {
                    ...mappedData,
                    tags: cardContent.tags || [],
                    files: fileUrls,
                    fileEntries: fileEntries,
                  };
                }
              }
            } catch (error) {
              console.error(`Error loading ${card.type} data:`, error);
            }
          }
          
          return {
            id: card.id,
            type: card.type,
            data: {
              ...cardData,
              cardId: card.id,
              onOpen: () => {
                console.log("Opening card:", card.id, card.type);
              },
              onSelect: () => {
                console.log("Selecting card:", card.id, card.type);
              },
              onFileClick: undefined,
            },
            // Add time_created for sorting
            time_created: card.time_created || new Date().toISOString(),
            // Add outline placement info
            outline_placement: placementMap.get(card.id) || null,
          };
        }));
        
        // Sort by time created (newest first)
        loadedNodes.sort((a, b) => new Date(b.time_created).getTime() - new Date(a.time_created).getTime());
        
        setNodes(loadedNodes);
      } catch (error) {
        console.error("Error loading cards:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [projectId, cardPlacementsHash]); // Only depend on the hash of card placements

  // Gather all unique tags from all cards
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach(card => {
      if (Array.isArray(card.data?.tags)) {
        card.data.tags.forEach((tag: string) => tagSet.add(tag));
      } else if (card.data?.tags) {
        tagSet.add(card.data.tags);
      }
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // Helper: get searchable text for each card
  const getSearchableText = (card: any) => {
    const tags = Array.isArray(card.data.tags) ? card.data.tags.join(", ") : (card.data.tags || "");
    if (card.type === 'source') {
      const summary = card.data.summary || "";
      const text = card.data.text || "";
      return `${summary} ${tags} ${text}`.toLowerCase();
    }
    if (card.type === 'question') {
      return `${card.data.question || ""} ${tags}`.toLowerCase();
    }
    if (card.type === 'insight') {
      return `${card.data.insight || ""} ${tags}`.toLowerCase();
    }
    if (card.type === 'thought') {
      return `${card.data.thought || ""} ${tags}`.toLowerCase();
    }
    if (card.type === 'claim') {
      return `${card.data.claim || ""} ${tags}`.toLowerCase();
    }
    return tags.toLowerCase();
  };

  // Filter nodes by search term, tags, and card type
  const filteredNodes = useMemo(() => {
    let filtered = nodes;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(card => getSearchableText(card).includes(lower));
    }
    // Filter by card type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(card => selectedTypes.includes(card.type));
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(card => {
        const cardTags = Array.isArray(card.data?.tags) ? card.data.tags : (card.data?.tags ? [card.data.tags] : []);
        if (tagFilterMode === "any") {
          // OR logic: at least one tag matches
          return cardTags.some((tag: string) => selectedTags.includes(tag));
        } else {
          // AND logic: all selected tags must be present
          return selectedTags.every(tag => cardTags.includes(tag));
        }
      });
    }
    return filtered;
  }, [nodes, searchTerm, selectedTags, tagFilterMode, selectedTypes]);

  // Handle tag deletion with animation
  const handleRemoveTag = (tagToRemove: string) => {
    // Start animation
    setDeletingTags(prev => new Set(prev).add(tagToRemove));
    
    // Remove tag after animation completes
    setTimeout(() => {
      setSelectedTags(sel => sel.filter(t => t !== tagToRemove));
      setDeletingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagToRemove);
        return newSet;
      });
    }, 200); // Match the CSS transition duration
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Card List</h2>
          <p className="text-sm text-gray-600">
            Drag and drop cards into sections to add them to your outline.
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Card List</h2>
          <p className="text-sm text-gray-600">
            Drag and drop cards into sections to add them to your outline.
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No cards yet</p>
            <p className="text-xs text-gray-400">Add a card to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Card List</h2>
        <p className="text-sm text-gray-600">
          Drag and drop cards into sections to add them to your outline.
        </p>
      </div>
      
      {/* Search bar and filter */}
      <div className="px-6 pb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            className="pr-8"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <LuSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative" aria-label="Filter by tags">
              <LuListFilter size={20} />
              {(selectedTags.length > 0 || (selectedTypes.length > 0 && selectedTypes.length < cardTypeOptions.length)) && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full" variant="default">
                  {selectedTags.length + (selectedTypes.length > 0 && selectedTypes.length < cardTypeOptions.length ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-78 shadow-xl">
            <div className="max-h-180 overflow-y-auto space-y-1">
              <label className="text-md font-semibold text-foreground">Tags</label>
              {allTags.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-14 mb-3">
                    <ToggleGroup type="single" value={tagFilterMode} onValueChange={val => val && setTagFilterMode(val as 'any' | 'all')} className="w-full">
                      <ToggleGroupItem value="any" aria-label="Match any" className="flex-1">Match Any</ToggleGroupItem>
                      <ToggleGroupItem value="all" aria-label="Match all" className="flex-1">Match All</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="max-h-80 overflow-y-scroll scroll-container">
                    {allTags.map(tag => (
                      <label key={tag} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={e => {
                            setSelectedTags(sel =>
                              e.target.checked ? [...sel, tag] : sel.filter(t => t !== tag)
                            );
                          }}
                          className="accent-primary"
                        />
                        <span className="text-md">{tag}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 my-2">No tags available</div>
              )}
              {/* Card type filter below tags */}
              <div className="flex items-center justify-between mt-6 mb-4">
                <label className="text-md font-semibold text-foreground block">Card Types</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded focus:outline-none"
                    onClick={() => setSelectedTypes(cardTypeOptions.map(opt => opt.value))}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded focus:outline-none"
                    onClick={() => setSelectedTypes([])}
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cardTypeOptions.map(opt => {
                  const Icon = opt.icon;
                  const checked = selectedTypes.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-1 cursor-pointer px-2 py-1 rounded-full font-medium text-sm transition-colors ${opt.color} ${opt.text} ${checked ? '' : 'opacity-60'} select-none w-28 justify-center`}
                      style={{ minWidth: '7rem', userSelect: 'none', boxShadow: 'none' }}
                      onDoubleClick={() => setSelectedTypes([opt.value])}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          setSelectedTypes(sel =>
                            e.target.checked ? [...sel, opt.value] : sel.filter(t => t !== opt.value)
                          );
                        }}
                        className="accent-primary mr-1"
                        style={{ display: 'none' }}
                      />
                      <span className={`flex items-center gap-1 ${opt.text}`}>
                        <Icon size={18} className={`shrink-0 ${opt.text}`} />
                        <span className={opt.text}>{opt.label}</span>
                      </span>
                      {checked && (
                        <span className={`ml-1 text-xs ${opt.text}`}>✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Selected tags as chips below search bar */}
      {selectedTags.length > 0 && (
        <div className="px-6 pb-3 flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <Badge 
              key={tag} 
              variant="outline" 
              className={`flex items-center gap-1 px-2 py-2 rounded-full transition-all duration-200 ease-in-out ${
                deletingTags.has(tag) 
                  ? "opacity-0 scale-75 transform" 
                  : "opacity-100 scale-100"
              }`}
            >
              {tag}
              <button
                type="button"
                className="ml-1 text-gray-400 hover:text-gray-700 focus:outline-none hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <LuX size={14} />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Cards list - simple chronological order */}
      <div className="flex-1 px-6 pb-6 space-y-3 overflow-y-auto">
        {filteredNodes.map((card: any) => {
          // Check if this card is in the structure (has an outline_placement)
          const isInStructure = card.outline_placement != null;
          const isActiveCard = activeCardId === `card-${card.id}`;
          
          // Render the appropriate card component with condensed view
          const cardProps = {
            data: {
              ...card.data,
              isCondensed: isCondensed, // Use the prop instead of hardcoded true
              isDisabled: isInStructure, // Disable cards that are in structure
              isInStructure: isInStructure,
            },
            showHandles: false,
            width: "w-full",
            showArrow: false,
            showShadow: true,
            showIcon: false, // Hide the icon in outline view
          };
          
          return (
            <DraggableCard
              key={card.id}
              id={`card-${card.id}`}
              cardData={card.data}
              isActive={isActiveCard}
              isInStructure={isInStructure}
            >
              {card.type === 'source' && <SourceMaterialCard {...cardProps} />}
              {card.type === 'question' && <QuestionCard {...cardProps} />}
              {card.type === 'insight' && <InsightCard {...cardProps} />}
              {card.type === 'thought' && <ThoughtCard {...cardProps} />}
              {card.type === 'claim' && <ClaimCard {...cardProps} />}
            </DraggableCard>
          );
        })}
      </div>
    </div>
  );
}
