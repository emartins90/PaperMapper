import React, { useState, useMemo } from "react";
import SourceMaterialCard from "./canvas-cards/SourceMaterialCard";
import QuestionCard from "./canvas-cards/QuestionCard";
import InsightCard from "./canvas-cards/InsightCard";
import ThoughtCard from "./canvas-cards/ThoughtCard";
import ClaimCard from "./canvas-cards/ClaimCard";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Badge } from "./ui/badge";
import { 
  LuCircleHelp, 
  LuBookOpen, 
  LuLightbulb, 
  LuMessageCircle,  
  LuSpeech,
  LuX,
  LuListFilter
} from "react-icons/lu";

interface CardListPanelProps {
  nodes: any[];
  onClose: () => void;
  onCardClick: (cardId: string, cardType: string) => void;
  selectedCardId?: string;
}

export default function CardListPanel({ nodes, onClose, onCardClick, selectedCardId }: CardListPanelProps) {
  // Add search state
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

  // Group cards by type
  const groupedCards = nodes.reduce((groups, card) => {
    const type = card.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(card);
    return groups;
  }, {} as Record<string, any[]>);

  // Define card type labels and order
  const cardTypeLabels = {
    insight: 'Insights',
    question: 'Questions', 
    thought: 'Thoughts',
    source: 'Source Materials',
    claim: 'Claims',
  };

  // Define the order we want to display card types
  const cardTypeOrder = ['claim','question', 'source', 'insight', 'thought'];

  // Priority order for question cards
  const questionPriorityOrder = {
    high: 0,
    medium: 1,
    low: 2,
    '': 3, // none
    undefined: 3,
    null: 3,
  };

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

  // Filter nodes by search term and tags
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

  // Group filtered cards by type
  const groupedFilteredCards = filteredNodes.reduce((groups, card) => {
    const type = card.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(card);
    return groups;
  }, {} as Record<string, any[]>);

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

  // Check if there are any cards
  const hasNoCardsInProject = nodes.length === 0;
  const hasNoFilteredResults = filteredNodes.length === 0 && nodes.length > 0;
  
  if (hasNoCardsInProject) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX size={20} />
          </Button>
        </div>
        <div className="p-4">
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
  
  if (hasNoFilteredResults) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX size={20} />
          </Button>
        </div>
        {/* Search bar and filter */}
        <div className="p-4 pb-0 mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              className="pr-8"
              placeholder="Search cards..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
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
              {selectedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {/* Selected tags as chips below search bar */}
        {selectedTags.length > 0 && (
          <div className="px-4 pt-2 pb-0 flex flex-wrap gap-2">
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
        {/* Empty state */}
        <div className="p-4">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No cards found</p>
            <p className="text-xs text-gray-400">Try a different search term or filter</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <LuX size={20} />
        </Button>
      </div>
      {/* Search bar and filter */}
      <div className="p-4 pb-0 mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            className="pr-8"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
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
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded focus:outline-none"
                  onClick={() => setSelectedTypes([])}
                >
                  Unselect All
                </button>
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
            {selectedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
              
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {/* Selected tags as chips below search bar */}
      {selectedTags.length > 0 && (
        <div className="px-4 pt-2 pb-0 flex flex-wrap gap-2">
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
      {/* Card list */}
      <div className="p-4 pt-2 space-y-6">
        {cardTypeOrder.map((cardType) => {
          const cards = groupedFilteredCards[cardType];
          if (!cards || cards.length === 0) return null;

          // Sort question cards by priority
          let sortedCards = cards;
          if (cardType === "question") {
            sortedCards = [...cards].sort((a, b) => {
              const aPriority = ((a.data.priority || "") as string).toLowerCase() as keyof typeof questionPriorityOrder;
              const bPriority = ((b.data.priority || "") as string).toLowerCase() as keyof typeof questionPriorityOrder;
              return (questionPriorityOrder[aPriority] ?? 3) - (questionPriorityOrder[bPriority] ?? 3);
            });
          }

          return (
            <div key={cardType} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {cardTypeLabels[cardType as keyof typeof cardTypeLabels]} ({cards.length})
              </h3>
              <div className="space-y-3">
                {sortedCards.map((card: any) => {
                  // Create props for the card component
                  const cardProps = {
                    id: card.id,
                    data: {
                      ...card.data,
                      onOpen: () => {
                        onCardClick(card.id, card.type);
                      },
                      onFileClick: undefined // Disable file clicking in the panel
                    }
                  };
                  
                  const isSelected = selectedCardId === card.id;
                  
                  // Get the appropriate ring color for each card type
                  const getRingColor = (cardType: string) => {
                    switch (cardType) {
                      case 'source':
                        return 'ring-source-300';
                      case 'question':
                        return 'ring-question-300';
                      case 'insight':
                        return 'ring-insight-300';
                      case 'thought':
                        return 'ring-thought-300';
                      case 'claim':
                        return 'ring-claim-300';
                      default:
                        return 'ring-gray-300';
                    }
                  };
                  
                  return (
                    <div 
                      key={card.id} 
                      className={`relative cursor-pointer hover:shadow-lg transition-shadow rounded-xl w-full ${
                        isSelected ? `ring-1  ${getRingColor(card.type)}` : ''
                      }`}
                      onClick={() => onCardClick(card.id, card.type)}
                    >
                      {/* Render the appropriate card component */}
                      {card.type === 'source' && <SourceMaterialCard {...cardProps} showHandles={false} width="w-full" showArrow={false} showShadow={false} />}
                      {card.type === 'question' && <QuestionCard {...cardProps} showHandles={false} width="w-full" showArrow={false} showShadow={false} />}
                      {card.type === 'insight' && <InsightCard {...cardProps} showHandles={false} width="w-full" showArrow={false} showShadow={false} />}
                      {card.type === 'thought' && <ThoughtCard {...cardProps} showHandles={false} width="w-full" showArrow={false} showShadow={false} />}
                      {card.type === 'claim' && <ClaimCard {...cardProps} showHandles={false} width="w-full" showArrow={false} showShadow={false} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 