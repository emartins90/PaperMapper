import React, { useState, useMemo } from "react";
import SourceMaterialCard from "./canvas-cards/SourceMaterialCard";
import QuestionCard from "./canvas-cards/QuestionCard";
import InsightCard from "./canvas-cards/InsightCard";
import ThoughtCard from "./canvas-cards/ThoughtCard";
import ClaimCard from "./canvas-cards/ClaimCard";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MdClose } from "react-icons/md";

interface CardListPanelProps {
  nodes: any[];
  onClose: () => void;
  onCardClick: (cardId: string, cardType: string) => void;
  selectedCardId?: string;
}

export default function CardListPanel({ nodes, onClose, onCardClick, selectedCardId }: CardListPanelProps) {
  // Add search state
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter nodes by search term
  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const lower = searchTerm.toLowerCase();
    return nodes.filter(card => getSearchableText(card).includes(lower));
  }, [nodes, searchTerm]);

  // Group filtered cards by type
  const groupedFilteredCards = filteredNodes.reduce((groups, card) => {
    const type = card.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(card);
    return groups;
  }, {} as Record<string, any[]>);

  // Check if there are any cards
  if (filteredNodes.length === 0) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[999] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <MdClose size={20} />
          </Button>
        </div>
        {/* Search bar */}
        <div className="p-4">
          <div className="relative">
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
                <MdClose size={16} />
              </Button>
            )}
          </div>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No cards found</p>
            <p className="text-xs text-gray-400">Try a different search term</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[9999] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <MdClose size={20} />
        </Button>
      </div>
      {/* Search bar */}
      <div className="p-4 pb-0 mb-3">
        <div className="relative">
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
              <MdClose size={16} />
            </Button>
          )}
        </div>
      </div>
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
                        isSelected ? `ring-2  ${getRingColor(card.type)}` : ''
                      }`}
                      onClick={() => onCardClick(card.id, card.type)}
                    >
                      {/* Render the appropriate card component */}
                      {card.type === 'source' && <SourceMaterialCard {...cardProps} showHandles={false} width="w-full" />}
                      {card.type === 'question' && <QuestionCard {...cardProps} showHandles={false} width="w-full" />}
                      {card.type === 'insight' && <InsightCard {...cardProps} showHandles={false} width="w-full" />}
                      {card.type === 'thought' && <ThoughtCard {...cardProps} showHandles={false} width="w-full" />}
                      {card.type === 'claim' && <ClaimCard {...cardProps} showHandles={false} width="w-full" />}
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