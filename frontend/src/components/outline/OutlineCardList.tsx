"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LuSearch, LuX, LuListFilter, LuSpeech, LuCircleHelp, LuBookOpen, LuLightbulb, LuMessageCircle, LuChevronUp, LuChevronDown } from "react-icons/lu";
import { useDraggable } from '@dnd-kit/core';
import { calculateMapOrientation, OrientationProfile, Card as OrientationCard, Edge } from "../../lib/mapOrientation";
import { createBestGuessHierarchy, BestGuessResult, HierarchyNode, flattenHierarchyForDisplay } from "../../lib/bestGuessHierarchy";
import HierarchyExpansionPanel from "./HierarchyExpansionPanel";
import { Alert } from "../ui/alert";

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
          ? 'cursor-not-allowed' // Just cursor style
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
  
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Save scroll position before update
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // Restore scroll position after update
  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && scrollPositionRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Save scroll position before sections update
  useEffect(() => {
    saveScrollPosition();
  }, [sections, saveScrollPosition]);

  // Restore scroll position after nodes update
  useEffect(() => {
    restoreScrollPosition();
  }, [nodes, restoreScrollPosition]);
  
  // Sorting state
  const [sortMode, setSortMode] = useState<'type' | 'time' | 'hierarchy'>('hierarchy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cardLinks, setCardLinks] = useState<Edge[]>([]);
  const [bestGuessResult, setBestGuessResult] = useState<BestGuessResult | null>(null);
  
  // Ref to prevent duplicate hierarchy calculations
  const lastHierarchyHashRef = useRef<string>('');

  // State for managing expansion of hierarchy nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Define card type labels (from CardListPanel)
  const cardTypeLabels = {
    insight: 'Insights',
    question: 'Questions', 
    thought: 'Thoughts',
    source: 'Source Materials',
    claim: 'Claims',
  };
  
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
          let cardData: { isResultingClaim?: boolean } = {};
          
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
                      isResultingClaim: cardContent.claim_type === 'Proposal' || cardContent.claim_type === 'Conclusion',
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


          const nodeData = {
            id: card.id,
            type: card.type,
            data: {
              ...cardData,
              cardId: card.id,
              // Include position data from the card
              position_x: card.position_x,
              position_y: card.position_y,
              onOpen: () => {
                // Card opening handler
              },
              onSelect: () => {
                // Card selection handler
              },
              onFileClick: undefined,
            },
            // Add isResultingClaim at the top level for the hierarchy algorithm
            isResultingClaim: cardData.isResultingClaim,
            // Add time_created for sorting
            time_created: card.time_created || new Date().toISOString(),
            // Add outline placement info
            outline_placement: placementMap.get(card.id) || null,
          };



          return nodeData;
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

  // Load card links when hierarchy mode is selected
  useEffect(() => {
    if (sortMode !== 'hierarchy' || !projectId) return;
    
    const loadCardLinks = async () => {
      try {
        const linksRes = await fetch(`${API_URL}/card_links/?project_id=${projectId}`, {
          credentials: "include",
        });
        
        if (linksRes.ok) {
          const links = await linksRes.json();
          const edges: Edge[] = links.map((link: any) => ({
            source_card_id: link.source_card_id,
            target_card_id: link.target_card_id,
          }));
          setCardLinks(edges);
        } else {
          console.error('Failed to load card links:', linksRes.status);
          setCardLinks([]);
        }
      } catch (error) {
        console.error("Error loading card links:", error);
        setCardLinks([]);
      }
    };

    loadCardLinks();
  }, [sortMode, projectId]);

  // Create stable references for orientation calculation
  const orientationCards = useMemo(() => {
    return nodes.map(node => {
      return {
        id: node.id.toString(),
        position_x: node.data?.position_x,
        position_y: node.data?.position_y,
        type: node.type,
        time_created: node.time_created,
        isResultingClaim: node.isResultingClaim,
      };
    });
  }, [nodes]);

  // Calculate best guess hierarchy when hierarchy mode is selected and data is ready
  useEffect(() => {
    if (sortMode !== 'hierarchy') {
      // Don't clear the result when switching away - keep it for when we switch back
      return;
    }
    
    if (orientationCards.length === 0 || cardLinks.length === 0) {
      return; // Don't clear result, just wait for data
    }
    
    // Create a simple hash to prevent duplicate calculations
    const dataHash = `${orientationCards.length}-${cardLinks.length}`;
    
    if (lastHierarchyHashRef.current === dataHash) {
      return; // Skip if we just calculated this
    }
    
    lastHierarchyHashRef.current = dataHash;
    
    // Run the best guess algorithm
    const result = createBestGuessHierarchy(orientationCards, cardLinks);
    
    setBestGuessResult(result);
  }, [sortMode, orientationCards, cardLinks]);

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

  // Sorting functions
  const sortByTime = (cards: any[]) => {
    return [...cards].sort((a, b) => {
      const aTime = new Date(a.time_created).getTime();
      const bTime = new Date(b.time_created).getTime();
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });
  };

  const sortByType = (cards: any[]) => {
    // Group cards by type first - using same order as CardListPanel
    const cardTypeOrder = ['claim', 'question', 'source', 'insight', 'thought'];
    
    // Group cards by type
    const grouped = cards.reduce((groups, card) => {
      const type = card.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(card);
      return groups;
    }, {} as Record<string, any[]>);
    
         // Sort cards within each type by time (respect sortOrder)
     Object.keys(grouped).forEach(type => {
       grouped[type].sort((a: any, b: any) => {
         const aTime = new Date(a.time_created).getTime();
         const bTime = new Date(b.time_created).getTime();
         return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
       });
     });
    
    // Flatten in the correct type order
    const result: any[] = [];
    cardTypeOrder.forEach(type => {
      if (grouped[type]) {
        result.push(...grouped[type]);
      }
    });
    
    return result;
  };

  const sortByHierarchy = (cards: any[], result: BestGuessResult | null) => {
    if (!result) return sortByTime(cards); // Fallback to time sorting
    
    // If the algorithm determined there's no meaningful hierarchy, use the fallback
    if (!result.hasHierarchy) {
      return result.nodes.map(hierarchyNode => {
        // Find the original card data and merge with hierarchy info
        const originalCard = cards.find(card => card.id.toString() === hierarchyNode.id);
        return originalCard || hierarchyNode;
      });
    }
    
    // We have a meaningful hierarchy - flatten it for display
    const flattenedHierarchy = flattenHierarchyForDisplay(result.nodes);
    
    // For hierarchy mode, we need to return a different structure
    // Group by root nodes and their children for expansion panels
    const hierarchyGroups: any[] = [];
    
    result.nodes.forEach(hierarchyNode => {
      if (hierarchyNode.level === 0) { // Root node
        const originalCard = cards.find(card => card.id.toString() === hierarchyNode.id);
        if (originalCard) {
          hierarchyGroups.push({
            ...originalCard,
            hierarchyLevel: hierarchyNode.level,
            isExpanded: expandedNodes.has(hierarchyNode.id),
            hasChildren: hierarchyNode.children.length > 0,
            children: hierarchyNode.children,
            isRootNode: true,
            data: {
              ...originalCard.data,
              outline_placement: originalCard.outline_placement
            }
          });
        }
      }
    });
    
    return hierarchyGroups;
  };

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = nodes;
    
    // Always apply search term filtering
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(card => getSearchableText(card).includes(lower));
    }
    
    // Only apply tag and type filters if not in hierarchy mode
    if (sortMode !== 'hierarchy') {
      // Filter by card type
      if (selectedTypes.length > 0) {
        filtered = filtered.filter(card => selectedTypes.includes(card.type));
      }
      // Filter by tags
      if (selectedTags.length > 0) {
        filtered = filtered.filter(card => {
          const cardTags = Array.isArray(card.data?.tags) ? card.data.tags : (card.data?.tags ? [card.data.tags] : []);
          if (tagFilterMode === "any") {
            return cardTags.some((tag: string) => selectedTags.includes(tag));
          } else {
            return selectedTags.every((tag: string) => cardTags.includes(tag));
          }
        });
      }
    }
    
    // Apply sorting based on selected mode
    switch (sortMode) {
      case 'type':
        return sortByType(filtered);
      case 'time':
        return sortByTime(filtered);
      case 'hierarchy':
        return sortByHierarchy(filtered, bestGuessResult);
      default:
    return filtered;
    }
  }, [nodes, searchTerm, selectedTags, tagFilterMode, selectedTypes, sortMode, sortOrder, bestGuessResult, expandedNodes]);

  // Handle expansion toggle for hierarchy nodes
  const handleToggleExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      // Ensure consistent string comparison
      const nodeIdStr = nodeId.toString();
      if (newSet.has(nodeIdStr)) {
        newSet.delete(nodeIdStr);
      } else {
        newSet.add(nodeIdStr);
      }
      return newSet;
    });
  };

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

  // Clear filters (but not search) when switching to hierarchy mode
  useEffect(() => {
    if (sortMode === 'hierarchy') {
      setSelectedTags([]);
      setSelectedTypes(cardTypeOptions.map(opt => opt.value));
    }
  }, [sortMode]);

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
          {searchTerm && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 h-6 w-6"
              onClick={() => setSearchTerm("")}
              tabIndex={-1}
              aria-label="Clear search"
            >
              <LuX size={16} />
            </Button>
          )}
        </div>
        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative" 
              aria-label="Filter and sort"
            >
              <LuListFilter size={20} />
              {(selectedTags.length > 0 || (selectedTypes.length > 0 && selectedTypes.length < cardTypeOptions.length)) && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full" variant="default">
                  {selectedTags.length + (selectedTypes.length > 0 && selectedTypes.length < cardTypeOptions.length ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-78 shadow-xl">
            <div className="max-h-180 overflow-y-auto space-y-4">
              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-md font-semibold text-foreground">Sort By</label>
                <div className="space-y-2">
                  {[
                    { value: 'hierarchy', label: 'Hierarchically (best guess)' },
                    { value: 'time', label: 'Date/Time Added' },
                    { value: 'type', label: 'Card Type' }
                  ].map(option => (
                    <div key={option.value} className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="sortBy"
                          value={option.value}
                          checked={sortMode === option.value}
                          onChange={(e) => setSortMode(e.target.value as 'type' | 'time' | 'hierarchy')}
                          className="accent-primary"
                        />
                        <span className="text-md">{option.label}</span>
                      </label>
                      {sortMode === option.value && option.value === 'time' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSortOrder('asc')}
                            className={`p-1 rounded-full ${sortOrder === 'asc' ? 'bg-gray-200' : ''}`}
                            aria-label="Sort ascending"
                          >
                            <LuChevronUp className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder('desc')}
                            className={`p-1 rounded-full ${sortOrder === 'desc' ? 'bg-gray-200' : ''}`}
                            aria-label="Sort descending"
                          >
                            <LuChevronDown className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {sortMode === 'hierarchy' && (
                <Alert 
                  className="text-sm bg-insight-100 border-insight-200 text-insight-700"
                >
                  Filters are disabled in hierarchy mode to preserve card relationships
                </Alert>
              )}

              {/* Tags */}
              <div className={sortMode === 'hierarchy' ? 'opacity-50 pointer-events-none' : ''}>
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
              </div>

              {/* Card type filter */}
              <div className={sortMode === 'hierarchy' ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mt-2 mb-4">
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
                              e.target.checked ? [...sel, opt.value] : sel.filter((t: string) => t !== opt.value)
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
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Only show selected tags if not in hierarchy mode */}
      {sortMode !== 'hierarchy' && selectedTags.length > 0 && (
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
      
      {/* Cards list - filtered and sorted */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 px-6 pb-6 overflow-y-auto"
      >
        {sortMode === 'hierarchy' && bestGuessResult?.hasHierarchy ? (
          // Hierarchical expansion panels and standalone root cards
          <div className="space-y-3">
            {filteredAndSortedNodes.map((rootCard: any) => {
              if (!rootCard.isRootNode) return null;
              
              // If root node has no children, render as regular card
              if (!rootCard.hasChildren || rootCard.children?.length === 0) {
                const isInStructure = rootCard.outline_placement != null;
                const isActiveCard = activeCardId === `card-${rootCard.id}`;
                
                const cardProps = {
                  data: {
                    ...rootCard.data,
                    isCondensed,
                    isDisabled: isInStructure,
                    isInStructure,
                  },
                  showHandles: false,
                  width: "w-full",
                  showArrow: false,
                  showShadow: true,
                  showIcon: false,
                };
                
                return (
                  <DraggableCard
                    key={`standalone-${rootCard.id}`} // Add prefix for standalone cards
                    id={`card-${rootCard.id}`}
                    cardData={rootCard.data}
                    isActive={isActiveCard}
                    isInStructure={isInStructure}
                  >
                    {rootCard.type === 'source' && <SourceMaterialCard {...cardProps} />}
                    {rootCard.type === 'question' && <QuestionCard {...cardProps} />}
                    {rootCard.type === 'insight' && <InsightCard {...cardProps} />}
                    {rootCard.type === 'thought' && <ThoughtCard {...cardProps} />}
                    {rootCard.type === 'claim' && <ClaimCard {...cardProps} />}
                  </DraggableCard>
                );
              }
              
                             // Flatten all descendants into a single array for display
               const flattenDescendants = (hierarchyNode: any, currentLevel: number = 1): any[] => {
                 const result: any[] = [];
                 
                 if (hierarchyNode.children && hierarchyNode.children.length > 0) {
                   hierarchyNode.children.forEach((child: any) => {
                     const originalCard = nodes.find(node => node.id.toString() === child.id);
                     if (originalCard) {
                       const childCard = {
                         ...originalCard,
                         hierarchyLevel: currentLevel,
                         isExpanded: expandedNodes.has(child.id.toString()),
                         hasChildren: child.children?.length > 0 || false,
                         children: child.children || [],
                         data: {
                           ...originalCard.data,
                           outline_placement: originalCard.outline_placement
                         }
                       };
                       
                       result.push(childCard);
                       
                       // Recursively add grandchildren and beyond
                       result.push(...flattenDescendants(child, currentLevel + 1));
                     }
                   });
                 }
                 
                 return result;
               };
               
               const childrenCards = flattenDescendants(rootCard);
               
               // Make sure the root node has the correct expansion state
               const rootNodeIdStr = rootCard.id.toString();
               const expandedRootCard = {
                 ...rootCard,
                 isExpanded: expandedNodes.has(rootNodeIdStr)
               };
               
               return (
                 <HierarchyExpansionPanel
                   key={rootCard.id}
                   rootNode={expandedRootCard}
                   children={childrenCards} // eslint-disable-line react/no-children-prop
                   onToggleExpansion={handleToggleExpansion}
                   activeCardId={activeCardId}
                   isCondensed={isCondensed}
                 />
               );
            })}
          </div>
        ) : sortMode === 'type' ? (
          // Grouped by type with section headers
          <div className="space-y-6">
            {(() => {
              // Group filtered cards by type for rendering - using same order as CardListPanel
              const cardTypeOrder = ['claim', 'question', 'source', 'insight', 'thought'];
              
              const grouped = filteredAndSortedNodes.reduce((groups, card) => {
                const type = card.type;
                if (!groups[type]) {
                  groups[type] = [];
                }
                groups[type].push(card);
                return groups;
              }, {} as Record<string, any[]>);

              return cardTypeOrder.map((cardType) => {
                const cards = grouped[cardType];
                if (!cards || cards.length === 0) return null;

                return (
                  <div key={cardType} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {cardTypeLabels[cardType as keyof typeof cardTypeLabels]} ({cards.length})
                    </h3>
                    <div className="space-y-3">
                      {cards.map((card: any) => {
          // Check if this card is in the structure (has an outline_placement)
          const isInStructure = card.outline_placement != null;
          const isActiveCard = activeCardId === `card-${card.id}`;
          
          // Render the appropriate card component with condensed view
          const cardProps = {
            data: {
              ...card.data,
                            isCondensed: isCondensed,
                            isDisabled: isInStructure,
              isInStructure: isInStructure,
            },
            showHandles: false,
            width: "w-full",
            showArrow: false,
            showShadow: true,
                          showIcon: false,
          };
          
          return (
            <DraggableCard
              key={`flat-${card.id}`} // Add prefix for flat list cards
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
              });
            })()}
          </div>
        ) : (
          // Flat list for other sort modes
          <div className="space-y-3">
            {filteredAndSortedNodes.map((card: any) => {
              // Check if this card is in the structure (has an outline_placement)
              const isInStructure = card.outline_placement != null;
              const isActiveCard = activeCardId === `card-${card.id}`;
              
              // Render the appropriate card component with condensed view
              const cardProps = {
                data: {
                  ...card.data,
                  isCondensed: isCondensed,
                  isDisabled: isInStructure,
                  isInStructure: isInStructure,
                },
                showHandles: false,
                width: "w-full",
                showArrow: false,
                showShadow: true,
                showIcon: false,
              };
              
              return (
                <DraggableCard
                  key={`flat-${card.id}`} // Add prefix for flat list cards
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
        )}
      </div>
    </div>
  );
}
