import React, { useRef, useEffect, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import SourceMaterialCard from "../canvas-cards/SourceMaterialCard";
import QuestionCard from "../canvas-cards/QuestionCard";
import InsightCard from "../canvas-cards/InsightCard";
import ThoughtCard from "../canvas-cards/ThoughtCard";
import ClaimCard from "../canvas-cards/ClaimCard";
import { useDraggable } from '@dnd-kit/core';

interface HierarchyNode {
  id: string;
  type: string;
  data: any;
  hierarchyLevel: number;
  isExpanded: boolean;
  hasChildren: boolean;
  children?: HierarchyNode[];
}

interface DraggableCardProps {
  id: string;
  children: React.ReactNode;
  cardData: any;
  isActive: boolean;
  isInStructure: boolean;
}

function DraggableCard({ id, children, cardData, isActive, isInStructure }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id,
    data: cardData,
    disabled: isInStructure
  });

  return (
    <div
      ref={setNodeRef}
      {...(!isInStructure ? listeners : {})}
      {...(!isInStructure ? attributes : {})}
      className={`${
        isInStructure 
          ? 'cursor-not-allowed'
          : (isDragging ? 'opacity-50 cursor-grabbing' : 'opacity-100 cursor-grab')
      }`}
    >
      {children}
    </div>
  );
}

interface HierarchyExpansionPanelProps {
  rootNode: HierarchyNode;
  children: HierarchyNode[];
  onToggleExpansion: (nodeId: string) => void;
  activeCardId?: string | null;
  isCondensed?: boolean;
}

export default function HierarchyExpansionPanel({
  rootNode,
  children,
  onToggleExpansion,
  activeCardId,
  isCondensed = true
}: HierarchyExpansionPanelProps) {
  
  // Store refs for each card to measure their heights
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Store calculated line positions
  const [lines, setLines] = useState<Array<{
    type: 'outer' | 'inner';
    startY: number;
    endY: number;
    left: string;
  }>>([]);

  const registerCardRef = (id: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefs.current.set(id, element);
    } else {
      cardRefs.current.delete(id);
    }
  };

  // Calculate the Y position for a card (sum of all previous cards' heights)
  const calculateCardY = (cardId: string): number => {
    const cardIndex = children.findIndex(c => c.id.toString() === cardId.toString());
    if (cardIndex === -1) return 0;

    let totalHeight = 0;
    for (let i = 0; i < cardIndex; i++) {
      const prevCard = children[i];
      const prevCardElement = cardRefs.current.get(prevCard.id.toString());
      if (prevCardElement) {
        totalHeight += prevCardElement.offsetHeight + 12; // Add margin-bottom
      }
    }
    return totalHeight;
  };

  // Calculate line positions when cards are rendered and when expansion state changes
  useEffect(() => {
    const calculateLines = () => {
      const newLines: Array<{
        type: 'outer' | 'inner';
        startY: number;
        endY: number;
        left: string;
      }> = [];

      // Find all Level 1 children (direct children of root)
      const level1Cards = children.filter(child => child.hierarchyLevel === 1);

      // For each Level 1 card, create its branch lines
      level1Cards.forEach(level1Card => {
        // Recursively find all descendants of this level 1 card
        const getAllDescendants = (node: HierarchyNode): HierarchyNode[] => {
          const descendants: HierarchyNode[] = [];
          if (node.children) {
            node.children.forEach(child => {
              descendants.push(child);
              descendants.push(...getAllDescendants(child));
            });
          }
          return descendants;
        };

        const allDescendants = getAllDescendants(level1Card);
        
        if (allDescendants.length > 0) {
          // Find all cards that belong to this branch (including the level 1 card itself)
          const branchCards = [level1Card, ...allDescendants];
          const branchCardIds = new Set(branchCards.map(c => c.id.toString()));
          
          // Find the last card in this branch by looking at the flattened children array
          const lastCardInBranch = [...children].reverse().find(c => branchCardIds.has(c.id.toString()));
          
          if (lastCardInBranch) {
            const level1Element = cardRefs.current.get(level1Card.id.toString());
            const lastCardElement = cardRefs.current.get(lastCardInBranch.id.toString());
            
            if (level1Element && lastCardElement) {
              // Calculate outer line position - goes from level 1 to the very last descendant
              const startY = calculateCardY(level1Card.id) + level1Element.offsetHeight;
              const endY = calculateCardY(lastCardInBranch.id) + lastCardElement.offsetHeight - 4;
              
              newLines.push({
                type: 'outer',
                startY,
                endY,
                left: '12px'
              });

              // Add inner lines for deeper levels
              // Find all level 2 cards that have children in the flattened children array
              const level2CardsWithChildren = children.filter(child => 
                child.hierarchyLevel === 2 && child.hasChildren
              );

              level2CardsWithChildren.forEach(level2Card => {
                // Find all descendants of this level 2 card by looking at the original hierarchy structure
                const level2Descendants = getAllDescendants(level2Card);
                const level2BranchCards = [level2Card, ...level2Descendants];
                const level2BranchCardIds = new Set(level2BranchCards.map(c => c.id.toString()));
                
                // Find the last card in this level 2 branch
                const lastLevel2Card = [...children].reverse().find(c => level2BranchCardIds.has(c.id.toString()));
                
                if (lastLevel2Card) {
                  const firstLevel2Element = cardRefs.current.get(level2Card.id.toString());
                  const lastLevel2Element = cardRefs.current.get(lastLevel2Card.id.toString());
                  
                  if (firstLevel2Element && lastLevel2Element) {
                    // Calculate inner line position
                    const innerStartY = calculateCardY(level2Card.id) + firstLevel2Element.offsetHeight - 4;
                    const innerEndY = calculateCardY(lastLevel2Card.id) + lastLevel2Element.offsetHeight - 4;
                    
                    newLines.push({
                      type: 'inner',
                      startY: innerStartY,
                      endY: innerEndY,
                      left: '42px'
                    });
                  }
                }
              });
            }
          }
        }
      });

      setLines(newLines);
    };

    // Wait for next frame to ensure all cards are rendered
    requestAnimationFrame(calculateLines);
  }, [children, rootNode.isExpanded]);

  const renderCard = (node: HierarchyNode, level?: number) => {
    const isInStructure = node.data?.outline_placement != null;
    const isActiveCard = activeCardId === `card-${node.id}`;
    
    const actualLevel = node.hierarchyLevel ?? level ?? 0;
    
    const getIndentation = (level: number) => {
      switch (level) {
        case 0: return ''; // Root level - no margin
        case 1: return ''; // Level 1 - no margin
        case 2: return 'ml-8'; // Level 2 - 32px indentation
        case 3: return 'ml-14'; // Level 3 - 56px indentation
        default: return 'ml-14'; // Level 4+ - same as level 3
      }
    };

    const indentClass = getIndentation(actualLevel);
    
    const cardProps = {
      data: {
        ...node.data,
        isCondensed,
        isDisabled: isInStructure,
        isInStructure,
      },
      showHandles: false,
      width: "w-full",
      showArrow: false,
      showShadow: true,
      showIcon: false
    };

    return (
      <div 
        key={`${node.id}-${actualLevel}`} // Add level to ensure uniqueness
        className={`relative ${indentClass}`}
        ref={(el) => registerCardRef(node.id.toString(), el)}
      >
        <div className="mb-3">
          <DraggableCard
            key={`draggable-${node.id}-${actualLevel}`} // Add unique key
            id={`card-${node.id}`}
            cardData={node.data}
            isActive={isActiveCard}
            isInStructure={isInStructure}
          >
            {node.type === 'source' && <SourceMaterialCard {...cardProps} />}
            {node.type === 'question' && <QuestionCard {...cardProps} />}
            {node.type === 'insight' && <InsightCard {...cardProps} />}
            {node.type === 'thought' && <ThoughtCard {...cardProps} />}
            {node.type === 'claim' && <ClaimCard {...cardProps} />}
          </DraggableCard>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-[10px] p-1 mb-3">
      {/* Root node - always visible */}
      {renderCard(rootNode, 0)}
      
      {/* Collapse/Expand button */}
      {rootNode.hasChildren && (
        <div className="flex items-center justify-center gap-1 py-2">
          <button
            onClick={() => onToggleExpansion(rootNode.id)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <LuChevronDown 
              className={`w-6 h-6 transition-transform ${
                rootNode.isExpanded ? 'rotate-180' : ''
              }`}
            />
            <span className="text-xs font-medium">
              {rootNode.isExpanded ? 'Collapse' : 'Expand'}
            </span>
          </button>
        </div>
      )}
      
      {/* Children - only visible when expanded */}
      {rootNode.isExpanded && children.length > 0 && (
        <div className="relative space-y-0">
          {/* Render branch lines */}
          {lines.map((line, index) => (
            <div
              key={`${line.type}-${index}`}
              className="absolute w-px bg-gray-300"
              style={{
                left: line.left,
                top: `${line.startY}px`,
                height: `${line.endY - line.startY}px`,
              }}
            >
              {/* Only circle at end of line */}
              <div className="absolute w-2 h-2 bg-gray-300 rounded-full left-[-3px] bottom-[-4px]" />
            </div>
          ))}
          
          {/* Render all children */}
          {children.map((child) => renderCard(child))}
        </div>
      )}
    </div>
  );
} 
