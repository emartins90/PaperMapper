import React from "react";
import SourceMaterialCard from "./canvas-cards/SourceMaterialCard";
import QuestionCard from "./canvas-cards/QuestionCard";
import InsightCard from "./canvas-cards/InsightCard";
import ThoughtCard from "./canvas-cards/ThoughtCard";
import ClaimCard from "./canvas-cards/ClaimCard";
import { Button } from "./ui/button";
import { MdClose } from "react-icons/md";

interface CardListPanelProps {
  nodes: any[];
  onClose: () => void;
  onCardClick: (cardId: string, cardType: string) => void;
  selectedCardId?: string;
}

export default function CardListPanel({ nodes, onClose, onCardClick, selectedCardId }: CardListPanelProps) {
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
  const cardTypeOrder = ['insight', 'question', 'thought', 'source', 'claim'];

  // Check if there are any cards
  if (nodes.length === 0) {
    return (
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-lg border-r border-gray-200 z-[9999] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <MdClose size={20} />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No cards created yet</p>
            <p className="text-xs text-gray-400">Use the bottom navigation to add your first card</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-lg border-r border-gray-200 z-[9999] overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Card List</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <MdClose size={20} />
        </Button>
      </div>
      
      <div className="p-4 space-y-6">
        {cardTypeOrder.map((cardType) => {
          const cards = groupedCards[cardType];
          if (!cards || cards.length === 0) return null;

          return (
            <div key={cardType} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {cardTypeLabels[cardType as keyof typeof cardTypeLabels]} ({cards.length})
              </h3>
              <div className="space-y-3">
                {cards.map((card: any) => {
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
                      className={`relative cursor-pointer hover:shadow-lg transition-shadow rounded-xl ${
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