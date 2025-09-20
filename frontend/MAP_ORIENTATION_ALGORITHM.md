# Map Orientation Detection Algorithm

## Overview

This document describes the algorithm used to detect the orientation of mind maps in the Paper Mapper application. The algorithm analyzes card positions and connections to determine whether a map is primarily horizontal, vertical, or mixed, which is then used to generate appropriate hierarchical outlines.

## Problem Statement

Mind maps can have different organizational patterns:
- **Horizontal maps**: Root nodes arranged left-to-right, with children branching vertically
- **Vertical maps**: Root nodes arranged top-to-bottom, with children branching horizontally  
- **Mixed maps**: Combination of both patterns at different levels

The challenge is to detect these patterns automatically so that when converting a mind map to a vertical hierarchy (for the outline view), the order preserves the user's original organizational intent.

## Algorithm Approach

### Multi-Level Orientation Detection

The algorithm analyzes orientation at two levels:
1. **Root Level**: How the main sections/topics are arranged
2. **Children Level**: How sub-items are arranged under each root

### Step 1: Identify Root Nodes

Root nodes are cards that have no incoming connections (i.e., they are the starting points of hierarchies).

```typescript
const identifyRootNodes = (cards: any[], edges: any[]) => {
  const connectedCards = new Set(edges.map(edge => edge.target_card_id));
  return cards.filter(card => !connectedCards.has(parseInt(card.id)));
};
```

### Step 2: Analyze Root Level Orientation

Calculate the spread of root nodes in both X and Y dimensions to determine their primary arrangement.

```typescript
const analyzeRootOrientation = (rootNodes: any[]) => {
  if (rootNodes.length < 2) return 'vertical';
  
  const xSpread = calculateSpread(rootNodes.map(n => n.position_x || 0));
  const ySpread = calculateSpread(rootNodes.map(n => n.position_y || 0));
  
  if (xSpread > ySpread * 1.5) return 'horizontal';
  if (ySpread > xSpread * 1.5) return 'vertical';
  return 'mixed';
};
```

### Step 3: Analyze Children Orientation

For each root node, analyze how its children are arranged relative to the parent.

```typescript
const analyzeChildrenOrientation = (rootNode: any, allCards: any[], edges: any[]) => {
  const children = findConnectedChildren(rootNode, allCards, edges);
  
  if (children.length < 2) return 'vertical';
  
  const xSpread = calculateSpread(children.map(n => n.position_x || 0));
  const ySpread = calculateSpread(children.map(n => n.position_y || 0));
  
  if (xSpread > ySpread * 1.5) return 'horizontal';
  if (ySpread > xSpread * 1.5) return 'vertical';
  return 'mixed';
};
```

### Step 4: Generate Orientation Profile

Combine all analysis results into a comprehensive profile.

```typescript
const calculateMapOrientation = (cards: any[], edges: any[]) => {
  const rootNodes = identifyRootNodes(cards, edges);
  const rootOrientation = analyzeRootOrientation(rootNodes);
  
  const childrenOrientations = rootNodes.map(root => ({
    rootId: root.id,
    childrenOrientation: analyzeChildrenOrientation(root, cards, edges)
  }));

  return {
    rootOrientation,
    childrenOrientations,
    rootNodes
  };
};
```

## File Structure

Create a separate utility file for the orientation detection algorithm:

```
frontend/src/lib/
├── mapOrientation.ts
```

## Implementation

### 1. Create the Utility File

Create `frontend/src/lib/mapOrientation.ts`:

```typescript
export interface Card {
  id: string;
  position_x?: number;
  position_y?: number;
  type?: string;
}

export interface Edge {
  source_card_id: number;
  target_card_id: number;
}

export interface OrientationProfile {
  rootOrientation: 'horizontal' | 'vertical' | 'mixed';
  childrenOrientations: Array<{
    rootId: string;
    childrenOrientation: 'horizontal' | 'vertical' | 'mixed';
  }>;
  rootNodes: Card[];
}

export const calculateMapOrientation = (cards: Card[], edges: Edge[]): OrientationProfile => {
  const rootNodes = identifyRootNodes(cards, edges);
  const rootOrientation = analyzeRootOrientation(rootNodes);
  
  const childrenOrientations = rootNodes.map(root => ({
    rootId: root.id,
    childrenOrientation: analyzeChildrenOrientation(root, cards, edges)
  }));

  return {
    rootOrientation,
    childrenOrientations,
    rootNodes
  };
};

const identifyRootNodes = (cards: Card[], edges: Edge[]): Card[] => {
  const connectedCards = new Set(edges.map(edge => edge.target_card_id));
  return cards.filter(card => !connectedCards.has(parseInt(card.id)));
};

const analyzeRootOrientation = (rootNodes: Card[]): 'horizontal' | 'vertical' | 'mixed' => {
  if (rootNodes.length < 2) return 'vertical';
  
  const xSpread = calculateSpread(rootNodes.map(n => n.position_x || 0));
  const ySpread = calculateSpread(rootNodes.map(n => n.position_y || 0));
  
  if (xSpread > ySpread * 1.5) return 'horizontal';
  if (ySpread > xSpread * 1.5) return 'vertical';
  return 'mixed';
};

const analyzeChildrenOrientation = (rootNode: Card, allCards: Card[], edges: Edge[]): 'horizontal' | 'vertical' | 'mixed' => {
  const children = findConnectedChildren(rootNode, allCards, edges);
  
  if (children.length < 2) return 'vertical';
  
  const xSpread = calculateSpread(children.map(n => n.position_x || 0));
  const ySpread = calculateSpread(children.map(n => n.position_y || 0));
  
  if (xSpread > ySpread * 1.5) return 'horizontal';
  if (ySpread > xSpread * 1.5) return 'vertical';
  return 'mixed';
};

const findConnectedChildren = (rootNode: Card, allCards: Card[], edges: Edge[]): Card[] => {
  const childIds = edges
    .filter(edge => edge.source_card_id === parseInt(rootNode.id))
    .map(edge => edge.target_card_id);
  
  return allCards.filter(card => childIds.includes(parseInt(card.id)));
};

const calculateSpread = (values: number[]): number => {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
};
```

### 2. Import and Use in Outline Component

In `frontend/src/components/outline/Outline.tsx`:

```typescript
import { calculateMapOrientation, OrientationProfile, Card, Edge } from '../../lib/mapOrientation';

// Add to component state
const [orientationProfile, setOrientationProfile] = useState<OrientationProfile | null>(null);

// Add calculation effect
useEffect(() => {
  if (sections.length > 0) {
    const allCards: Card[] = sections.flatMap(section => 
      (section.card_placements || []).map(placement => ({
        id: placement.card?.id?.toString() || '',
        position_x: placement.card?.position_x,
        position_y: placement.card?.position_y,
        type: placement.card?.type,
      }))
    );

    const allEdges: Edge[] = sections.flatMap(section => 
      (section.card_placements || []).flatMap(placement => 
        (placement.card?.outgoing_links || []).map(link => ({
          source_card_id: parseInt(placement.card?.id || '0'),
          target_card_id: link.target_card_id
        }))
      )
    );

    if (allCards.length > 0) {
      const orientation = calculateMapOrientation(allCards, allEdges);
      setOrientationProfile(orientation);
    }
  }
}, [sections]);

// Use in hierarchy generation
const generateHierarchy = useCallback((cards: Card[]) => {
  if (!orientationProfile) return cards;
  
  // Sort root nodes by root orientation
  const sortedRoots = sortByOrientation(orientationProfile.rootNodes, orientationProfile.rootOrientation);
  
  // Sort children by their specific orientation
  const hierarchy = sortedRoots.map(root => ({
    ...root,
    children: sortChildrenByOrientation(
      root.children, 
      orientationProfile.childrenOrientations.find(co => co.rootId === root.id)?.childrenOrientation || 'vertical'
    )
  }));
  
  return hierarchy;
}, [orientationProfile]);
```

## Performance Characteristics

### Time Complexity
- **Overall**: O(n log n) where n is the number of cards
- **Root identification**: O(n)
- **Root orientation analysis**: O(r) where r is number of root nodes
- **Children analysis**: O(r × c) where c is average children per root
- **Sorting**: O(n log n)

### Performance Estimates
- **50 cards**: 5-15ms (imperceptible)
- **100 cards**: 15-30ms (still instant)
- **1000 cards**: 100-300ms (slight delay)

## Real-World Examples

### Research Paper (Horizontal Root, Vertical Children)
```
Root Orientation: Horizontal
- Introduction ← → Literature Review ← → Methodology

Children Orientation: Vertical (for each root)
- Introduction:
  - Hook (top)
  - Background (middle)
  - Thesis Statement (bottom)
```

### Decision Tree (Vertical Root, Horizontal Children)
```
Root Orientation: Vertical
- Main Question (top)
- Decision Point (middle)
- Outcomes (bottom)

Children Orientation: Horizontal
- Yes ← → No (side by side)
```

### Mixed Project
```
Root Orientation: Horizontal
- Phase 1 ← → Phase 2 ← → Phase 3

Children Orientation: Mixed
- Phase 1: Vertical (tasks stacked)
- Phase 2: Horizontal (parallel processes)
- Phase 3: Vertical (final steps)
```

## Benefits

1. **Modular Design**: Algorithm is separated into its own utility file
2. **Reusable**: Can be imported and used in other components
3. **Type Safe**: Full TypeScript support with proper interfaces
4. **Testable**: Easy to unit test the orientation detection logic
5. **Maintainable**: Clear separation of concerns
6. **Preserves User Intent**: Maintains the logical flow the user originally intended
7. **Handles Complex Layouts**: Works with any combination of orientations
8. **Session-Based**: Calculated once per session, no database storage needed
9. **Automatic Updates**: Recalculates when the map structure changes
10. **Performance**: Fast enough to run on every outline page load

## Future Enhancements

- **Incremental Updates**: Only recalculate affected parts when small changes occur
- **Web Workers**: Move calculation to background thread for very large maps
- **Caching**: Store results in database for very large projects
- **Machine Learning**: Learn from user patterns to improve detection accuracy
- **Configuration**: Allow users to override detected orientation
- **Visualization**: Show detected orientation in the UI for user feedback
