# Best Guess Hierarchy Algorithm - Product Requirements Document

## Overview

This document outlines the requirements for the "Best Guess" hierarchy algorithm in the Paper Mapper outline feature. The algorithm automatically converts a mind map into a vertical hierarchical list while preserving the user's original organizational intent.

## Problem Statement

Users create mind maps with cards and connections, but when viewing the outline, they need a clean vertical hierarchy. The challenge is to automatically determine:
1. Which cards are root nodes (top-level items)
2. How to order root nodes based on map orientation
3. How to order child nodes within each hierarchy
4. How to handle cases with insufficient connections

## Algorithm Flow

### Step 1: Check for Sufficient Edges
**Purpose**: Determine if there are enough connections to build a meaningful hierarchy

**Criteria**:
- Count total edges in the map
- Calculate edge-to-card ratio
- If ratio < 0.3 (fewer than 30% of possible connections), fall back to time-based ordering

**Implementation**:
```typescript
const hasSufficientEdges = (cards: Card[], edges: Edge[]): boolean => {
  const maxPossibleEdges = cards.length * (cards.length - 1);
  const actualEdges = edges.length;
  const edgeRatio = actualEdges / maxPossibleEdges;
  return edgeRatio >= 0.3;
};
```

### Step 2: Identify Root Nodes
**Purpose**: Find cards that serve as the top level of hierarchies

**Root Node Criteria**:
1. **Cards with no incoming connections** (primary criteria)
2. **Initial claims** (always considered root nodes)
3. **Questions without incoming connections** (likely root nodes)

**Implementation**:
```typescript
const identifyRootNodes = (cards: Card[], edges: Edge[]): Card[] => {
  const connectedCards = new Set(edges.map(edge => edge.target_card_id));
  
  return cards.filter(card => {
    // No incoming connections
    const hasIncoming = connectedCards.has(parseInt(card.id));
    
    // Always root if it's a claim
    const isClaim = card.type === 'claim';
    
    // Root if question with no incoming connections
    const isQuestionRoot = card.type === 'question' && !hasIncoming;
    
    return !hasIncoming || isClaim || isQuestionRoot;
  });
};
```

### Step 3: Check Orientation
**Purpose**: Determine the primary orientation of the mind map to inform ordering

**Process**:
- Use the existing map orientation detection algorithm
- Analyze root node arrangement (horizontal vs vertical)
- Store orientation profile for use in ordering

**Output**: `OrientationProfile` with root orientation and children orientations

### Step 4: Order Root Nodes
**Purpose**: Determine the display order of root nodes based on map orientation

**Ordering Rules**:
- **Horizontal maps**: Sort by X position (left-to-right)
- **Vertical maps**: Sort by Y position (top-to-bottom)
- **Mixed maps**: Use primary orientation or fall back to time-based

**Implementation**:
```typescript
const orderRootNodes = (rootNodes: Card[], orientation: string): Card[] => {
  switch (orientation) {
    case 'horizontal':
      return rootNodes.sort((a, b) => (a.position_x || 0) - (b.position_x || 0));
    case 'vertical':
      return rootNodes.sort((a, b) => (a.position_y || 0) - (b.position_y || 0));
    default:
      return rootNodes.sort((a, b) => new Date(a.time_created).getTime() - new Date(b.time_created).getTime());
  }
};
```

### Step 5: Build Child Hierarchies
**Purpose**: For each root node, determine the order and hierarchy of its children

**Process**:
1. Find all children of each root node
2. Apply orientation-based ordering to children
3. Recursively build sub-hierarchies for multi-level structures
4. Limit to 4 levels of hierarchy (as specified in requirements)

**Implementation**:
```typescript
const buildChildHierarchy = (
  rootNode: Card, 
  allCards: Card[], 
  edges: Edge[], 
  orientation: string,
  currentLevel: number = 1
): HierarchyNode => {
  const children = findConnectedChildren(rootNode, allCards, edges);
  
  if (children.length === 0 || currentLevel >= 4) {
    return { ...rootNode, children: [] };
  }
  
  const orderedChildren = orderChildren(children, orientation);
  
  return {
    ...rootNode,
    children: orderedChildren.map(child => 
      buildChildHierarchy(child, allCards, edges, orientation, currentLevel + 1)
    )
  };
};
```

## Fallback Strategy

### Insufficient Edges Scenario
When there are too few connections to build a meaningful hierarchy:

**Display Strategy**:
- Show all cards in a single flat list
- Order by time created (newest first)
- No expansion panels or indentation
- Simple card type grouping (optional)

**Implementation**:
```typescript
const createTimeBasedList = (cards: Card[]): Card[] => {
  return cards
    .sort((a, b) => new Date(b.time_created).getTime() - new Date(a.time_created).getTime())
    .map(card => ({ ...card, level: 0, isExpanded: false }));
};
```

## Data Structures

### HierarchyNode Interface
```typescript
interface HierarchyNode {
  id: string;
  type: string;
  title: string;
  level: number;
  isExpanded: boolean;
  children: HierarchyNode[];
  position_x?: number;
  position_y?: number;
  time_created: string;
}
```

### Algorithm Result Interface
```typescript
interface HierarchyResult {
  hasHierarchy: boolean;
  rootNodes: HierarchyNode[];
  totalCards: number;
  edgeCount: number;
  orientation?: OrientationProfile;
}
```

## UI Requirements

### Hierarchy Display
- **Root nodes**: Always visible, with expansion/collapse controls
- **Child nodes**: Indented based on hierarchy level (max 4 levels)
- **Expansion panels**: Only for nodes with children
- **Visual indicators**: Show hierarchy depth with indentation

### Indentation Rules
- Level 0 (root): Top of expansion panel when collapsed
- Level 1: First card in expanded panel. No indentation
- Level 2: 12px indentation
- Level 3: 24px indentation

### Expansion Controls
- **Expandable nodes**: Show chevron/arrow icon
- **Leaf nodes**: No expansion control

## Performance Considerations

### Edge Case Handling
- **Empty maps**: Show empty state message
- **Single card**: Display as root node
- **Disconnected components**: Treat each as separate root hierarchy

### Optimization
- **Memoization**: Cache hierarchy calculations
- **Lazy loading**: Only calculate visible levels
- **Debouncing**: Prevent excessive recalculations during rapid changes

## Success Metrics

### Algorithm Effectiveness
- **Hierarchy accuracy**: How well the generated hierarchy matches user intent
- **Edge utilization**: Percentage of connections used in hierarchy
- **Fallback frequency**: How often the time-based fallback is used

### User Experience
- **Load time**: Algorithm execution time (target: <300ms for 1000 cards)
- **Visual clarity**: Hierarchy depth and indentation effectiveness
- **Navigation ease**: Expansion/collapse interaction smoothness

## Future Enhancements

### Phase 2 Features
- **User overrides**: Allow manual hierarchy adjustments
- **Smart grouping**: Group cards by type when connections are sparse
- **Visual feedback**: Show detected orientation in UI
- **Custom rules**: User-defined root node identification rules

### Phase 3 Features
- **Machine learning**: Learn from user hierarchy preferences
- **Pattern recognition**: Detect common mind map patterns
- **Auto-suggestions**: Suggest hierarchy improvements
- **Export options**: Export hierarchy to different formats

## Implementation Priority

### Phase 1 (MVP)
1. Basic edge detection and root node identification
2. Simple orientation-based ordering
3. 4-level hierarchy with indentation
4. Time-based fallback for insufficient edges

### Phase 2 (Enhanced)
1. Improved child ordering algorithms
2. Better handling of mixed orientations
3. Visual hierarchy indicators
4. Performance optimizations

### Phase 3 (Advanced)
1. User customization options
2. Machine learning improvements
3. Advanced pattern recognition
4. Export and sharing features

## Technical Dependencies

### Required
- Map orientation detection algorithm
- Card and edge data structures
- React state management for hierarchy
- CSS for indentation and expansion panels

### Optional
- Web Workers for large dataset processing
- Local storage for user preferences
- Analytics for algorithm effectiveness tracking
