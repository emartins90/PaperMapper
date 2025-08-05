import React from "react";
import { Button } from "./ui/button";
import SourceMaterialCard from "./canvas-cards/SourceMaterialCard";
import QuestionCard from "./canvas-cards/QuestionCard";
import InsightCard from "./canvas-cards/InsightCard";
import ThoughtCard from "./canvas-cards/ThoughtCard";
import ClaimCard from "./canvas-cards/ClaimCard";

interface LinkedCardsTabProps {
  openCard: { id: string; type: string } | null;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  panelJustOpened?: boolean; // Add panelJustOpened prop
}

export default function LinkedCardsTab({ openCard, nodes, edges, onEdgesChange, onClose, panelJustOpened }: LinkedCardsTabProps) {
  return (
    <div className="space-y-4">
      <div>
        {(() => {
          // Find edges connected to the current card
          const connectedEdges = edges.filter(edge => 
            edge.source === openCard?.id || edge.target === openCard?.id
          );
          
          // Get connected card IDs
          const connectedCardIds = connectedEdges.map(edge => 
            edge.source === openCard?.id ? edge.target : edge.source
          );
          
          // Get connected card data
          const connectedCards = nodes.filter(node => 
            connectedCardIds.includes(node.id)
          );
          
          if (connectedCards.length === 0) {
            return (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-2">No cards connected yet</p>
                <p className="text-xs text-gray-400">Drag from connection points on cards to create links</p>
              </div>
            );
          }
          
          // Group cards by type
          const groupedCards = connectedCards.reduce((groups, card) => {
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

          // Check if there's only one card type
          const cardTypes = Object.keys(groupedCards);
          const showLabels = cardTypes.length > 1;

          return (
            <div className="space-y-6">
              {cardTypeOrder.map((cardType) => {
                const cards = groupedCards[cardType];
                if (!cards || cards.length === 0) return null;

                return (
                  <div key={cardType} className="space-y-3">
                    {showLabels && (
                      <h3 className="text-sm font-semibold text-gray-700">
                        {cardTypeLabels[cardType as keyof typeof cardTypeLabels]}
                      </h3>
                    )}
                    <div className="space-y-3">
                      {(cards as any[]).map((card: any) => {
                        const edge = connectedEdges.find(e => 
                          (e.source === openCard?.id && e.target === card.id) ||
                          (e.source === card.id && e.target === openCard?.id)
                        );
                        
                        // Create props for the card component
                        const cardProps = {
                          id: card.id,
                          data: {
                            ...card.data,
                            onOpen: () => {
                              // Open the connected card in the side panel
                              onClose?.(); // Close current panel
                              setTimeout(() => {
                                // Small delay to ensure current panel closes
                                const event = new CustomEvent('openCard', {
                                  detail: { id: card.id, type: card.type }
                                });
                                window.dispatchEvent(event);
                              }, 100);
                            },
                            cardId: card.id, // Add cardId to identify this card
                            panelJustOpened: panelJustOpened, // Add panelJustOpened to prevent hover flicker
                            // Add unlink button as part of card data
                            actionButton: (
                              <Button
                                onClick={() => {
                                  if (onEdgesChange && edge) {
                                    onEdgesChange([{
                                      type: 'remove',
                                      id: edge.id
                                    }]);
                                  }
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 h-6 text-xs"
                                title="Remove connection"
                              >
                                Unlink
                              </Button>
                            )
                          }
                        };
                        
                        return (
                          <div key={card.id}>
                            {/* Render the appropriate card component */}
                            {card.type === 'source' && <SourceMaterialCard {...cardProps} showHandles={false} width="w-full" openCard={openCard} showShadow={false} />}
                            {card.type === 'question' && <QuestionCard {...cardProps} showHandles={false} width="w-full" openCard={openCard} showShadow={false} />}
                            {card.type === 'insight' && <InsightCard {...cardProps} showHandles={false} width="w-full" openCard={openCard} showShadow={false} />}
                            {card.type === 'thought' && <ThoughtCard {...cardProps} showHandles={false} width="w-full" openCard={openCard} showShadow={false} />}
                            {card.type === 'claim' && <ClaimCard {...cardProps} showHandles={false} width="w-full" openCard={openCard} showShadow={false} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="font-medium">To create a connection:</li>
          <li className="pb-2">• Drag from connection points on any card to create links</li>
          <li className="font-medium">To delete a connection: </li>
          <li>• Click "unlink" on a card above </li>
          <li>• Or select the connection on the canvas and press backspace/delete on your keyboard.</li>
        </ul>
      </div>
    </div>
  );
} 