import { calculateMapOrientation, OrientationProfile, Card, Edge } from './mapOrientation';

export interface HierarchyNode extends Card {
  level: number;
  isExpanded: boolean;
  children: HierarchyNode[];
}

export interface CrossLink {
  source: Card;
  target: Card;
  reason: 'already-assigned' | 'cross-link';
  targetHandle: string;
  orientation?: 'horizontal' | 'vertical' | 'mixed';
}

export interface Cycle {
  node: Card;
  reason: 'cycle-detected';
  path: string[];
}

export interface BestGuessResult {
  hasHierarchy: boolean;
  nodes: HierarchyNode[];
  totalCards: number;
  edgeCount: number;
  orientation?: OrientationProfile;
  fallbackReason?: 'insufficient_edges' | 'no_position_data' | 'no_cards';
  crossLinks?: CrossLink[];
  cycles?: Cycle[];
}

/**
 * Main best guess hierarchy algorithm
 */
export const createBestGuessHierarchy = (cards: Card[], edges: Edge[]): BestGuessResult => {
  // Step 1: Basic validation
  if (cards.length === 0) {
    return {
      hasHierarchy: false,
      nodes: [],
      totalCards: 0,
      edgeCount: 0,
      fallbackReason: 'no_cards'
    };
  }

  // Step 2: Check for sufficient edges
  if (!hasSufficientEdges(cards, edges)) {
    return {
      hasHierarchy: false,
      nodes: createTimeBasedList(cards),
      totalCards: cards.length,
      edgeCount: edges.length,
      fallbackReason: 'insufficient_edges'
    };
  }

  // Step 3: Check for position data
  const cardsWithPositions = cards.filter(c => c.position_x != null && c.position_y != null);
  if (cardsWithPositions.length === 0) {
    return {
      hasHierarchy: false,
      nodes: createTimeBasedList(cards),
      totalCards: cards.length,
      edgeCount: edges.length,
      fallbackReason: 'no_position_data'
    };
  }

  // Step 4: Calculate map orientation
  const orientation = calculateMapOrientation(cards, edges);

  // Step 5: Build hierarchy with cross-link and cycle detection
  const { hierarchyNodes, crossLinks, cycles } = buildHierarchyWithDetection(cards, edges, orientation);

  return {
    hasHierarchy: true,
    nodes: hierarchyNodes,
    totalCards: cards.length,
    edgeCount: edges.length,
    orientation,
    crossLinks,
    cycles
  };
};

/**
 * Check if there are sufficient edges to build a meaningful hierarchy
 */
const hasSufficientEdges = (cards: Card[], edges: Edge[]): boolean => {
  // Need at least 2 cards to have any meaningful hierarchy
  if (cards.length < 2) return false;
  
  // Need at least 1 edge to create any hierarchy
  if (edges.length === 0) return false;
  
  // Calculate edge ratio - we need at least 20% connectivity for meaningful hierarchy
  // This is more lenient than the PRD's 30% to account for typical mind map sparsity
  const maxPossibleEdges = cards.length * (cards.length - 1) / 2; // Undirected graph
  const actualEdges = edges.length;
  const edgeRatio = actualEdges / maxPossibleEdges;
  
  // Minimum thresholds:
  // - At least 1 edge per 3 cards, OR
  // - At least 20% connectivity ratio
  const minEdgesPerCard = cards.length / 3;
  
  return actualEdges >= minEdgesPerCard || edgeRatio >= 0.2;
};

/**
 * Create a time-based flat list when hierarchy isn't possible
 */
const createTimeBasedList = (cards: Card[]): HierarchyNode[] => {
  return cards
    .sort((a, b) => {
      const aTime = new Date(a.time_created || 0).getTime();
      const bTime = new Date(b.time_created || 0).getTime();
      return bTime - aTime; // Newest first
    })
    .map(card => ({
      ...card,
      level: 0,
      isExpanded: false,
      children: []
    }));
};

/**
 * Get valid target handles based on orientation
 */
const getValidTargetHandles = (orientation: 'horizontal' | 'vertical' | 'mixed'): string[] => {
  switch (orientation) {
    case 'vertical':
      return ['top']; // Only top is valid for vertical flow
    case 'horizontal':
      return ['left']; // Only left is valid for horizontal flow
    case 'mixed':
      return ['top', 'left']; // Both could be valid
    default:
      return ['top'];
  }
};

/**
 * Check if a connection is a cross-link based on handle position
 */
const isCrossLink = (parent: Card, child: Card, orientation: 'horizontal' | 'vertical' | 'mixed', edges: Edge[]): boolean => {
  const edge = edges.find(e => 
    e.source_card_id === parseInt(parent.id) && 
    e.target_card_id === parseInt(child.id)
  );
  
  if (!edge || !edge.target_handle) return false;
  
  const validHandles = getValidTargetHandles(orientation);
  return !validHandles.includes(edge.target_handle);
};

/**
 * Order root nodes based on detected orientation
 */
const orderRootNodes = (rootNodes: Card[], orientation: 'horizontal' | 'vertical' | 'mixed', edges: Edge[], parentChildMap: Map<string, string>): Card[] => {
  console.log('DEBUG: Starting root node ordering with:', rootNodes.map(n => ({
    id: n.id,
    type: n.type,
    isResultingClaim: n.isResultingClaim
  })));

  console.log('DEBUG: Parent-child relationships:', Array.from(parentChildMap.entries()));

  // Create a map of parent claim to its children using the parentChildMap
  const parentToChildrenMap = new Map<string, Card[]>();
  parentChildMap.forEach((parentId, childId) => {
    const childCard = rootNodes.find(card => card.id === childId);
    if (childCard) {
      if (!parentToChildrenMap.has(parentId)) {
        parentToChildrenMap.set(parentId, []);
      }
      parentToChildrenMap.get(parentId)!.push(childCard);
    }
  });

  console.log('DEBUG: Parent to children map:', Array.from(parentToChildrenMap.entries()).map(([parentId, children]) => ({
    parentId,
    childrenIds: children.map(c => c.id)
  })));

  // Sort the root nodes based on orientation
  const sortedRoots = [...rootNodes].sort((a, b) => {
  switch (orientation) {
    case 'horizontal':
        return (a.position_x || 0) - (b.position_x || 0);
    case 'vertical':
        return (a.position_y || 0) - (b.position_y || 0);
    default:
      // For mixed orientation, fall back to time-based ordering
        const aTime = new Date(a.time_created || 0).getTime();
        const bTime = new Date(b.time_created || 0).getTime();
        return aTime - bTime; // Oldest first for roots
    }
  });

  // Create final ordered list with children after their parents
  const orderedNodes: Card[] = [];
  const processedNodes = new Set<string>();

  sortedRoots.forEach(node => {
    if (!processedNodes.has(node.id)) {
      orderedNodes.push(node);
      processedNodes.add(node.id);

      // If this is a resulting claim with children, add them immediately after
      const children = parentToChildrenMap.get(node.id);
      if (children) {
        children.forEach(child => {
          if (!processedNodes.has(child.id)) {
            orderedNodes.push(child);
            processedNodes.add(child.id);
          }
        });
      }
    }
  });

  console.log('DEBUG: Final ordered root nodes:', orderedNodes.map(n => ({
    id: n.id,
    type: n.type,
    isResultingClaim: n.isResultingClaim,
    isChildOf: Array.from(parentToChildrenMap.entries())
      .find(([_, children]) => children.some(c => c.id === n.id))?.[0] || null
  })));

  return orderedNodes;
};

/**
 * Order children based on their spatial arrangement
 */
const orderChildren = (children: Card[], orientation: 'horizontal' | 'vertical' | 'mixed'): Card[] => {
  switch (orientation) {
    case 'horizontal':
      return [...children].sort((a, b) => (a.position_x || 0) - (b.position_x || 0));
    case 'vertical':
      return [...children].sort((a, b) => (a.position_y || 0) - (b.position_y || 0));
    default:
      // For mixed or unknown orientation, use time-based ordering
      return [...children].sort((a, b) => {
        const aTime = new Date(a.time_created || 0).getTime();
        const bTime = new Date(b.time_created || 0).getTime();
        return aTime - bTime;
      });
  }
};

/**
 * Find all cards that are direct children of a given node
 */
const findConnectedChildren = (parentNode: Card, allCards: Card[], edges: Edge[]): Card[] => {
  const childIds = edges
    .filter(edge => edge.source_card_id === parseInt(parentNode.id))
    .map(edge => edge.target_card_id);

  return allCards.filter(card => childIds.includes(parseInt(card.id)));
};

/**
 * Find the original root node that a resulting claim came from
 */
const findOriginalRoot = (resultingClaim: Card, allCards: Card[], edges: Edge[], initialRootNodes: Card[]): Card | null => {
  // Find what connects TO this resulting claim
  const incomingEdges = edges.filter(edge => edge.target_card_id === parseInt(resultingClaim.id));
  
  for (const edge of incomingEdges) {
    const sourceCard = allCards.find(card => parseInt(card.id) === edge.source_card_id);
    if (sourceCard) {
      // If the source is an initial root node, we found it
      if (initialRootNodes.some(root => root.id === sourceCard.id)) {
        return sourceCard;
      }
      // Otherwise, recursively search up the chain
      const ancestorRoot = findOriginalRoot(sourceCard, allCards, edges, initialRootNodes);
      if (ancestorRoot) {
        return ancestorRoot;
      }
    }
  }
  
  return null;
};

/**
 * Identify potential root nodes for the hierarchy.
 * This function identifies nodes that are:
 * 1. Not connected to any other node (no incoming edges)
 * 2. Claims that are not resulting claims (their children are roots)
 * 3. Questions that are not connected to any other node (their children are roots)
 */
const identifyRootNodes = (cards: Card[], edges: Edge[]): { rootNodes: Card[], parentChildMap: Map<string, string> } => {
  const connectedCards = new Set(edges.map(edge => edge.target_card_id));
  
  // First, identify initial root nodes
  const initialRootNodes = cards.filter(card => {
    // No incoming connections
    const hasIncoming = connectedCards.has(parseInt(card.id));
    
    // Root if:
    // 1. No incoming connections, OR
    // 2. It's a regular claim (not a resulting claim), OR
    // 3. It's a resulting claim with no incoming connections, OR
    // 4. It's a question with no incoming connections
    const isRegularClaim = card.type === 'claim' && !card.isResultingClaim;
    const isResultingClaimWithNoIncoming = card.type === 'claim' && card.isResultingClaim && !hasIncoming;
    const isQuestionRoot = card.type === 'question' && !hasIncoming;
    

    
    return !hasIncoming || isRegularClaim || isResultingClaimWithNoIncoming || isQuestionRoot;
  });

  // Find all resulting claims that DO have incoming connections
  const connectedResultingClaims = cards.filter(card => 
    card.type === 'claim' && 
    card.isResultingClaim && 
    connectedCards.has(parseInt(card.id))
  );

  // Get children of connected resulting claims as new root nodes
  // Track which child came from which ORIGINAL root (not just immediate parent)
  const parentChildMap = new Map<string, string>(); // childId -> originalRootId
  const childrenOfResultingClaims = connectedResultingClaims.flatMap(claim => {
    const children = findConnectedChildren(claim, cards, edges);
    children.forEach(child => {
      // Find the original root that this resulting claim came from
      const originalRoot = findOriginalRoot(claim, cards, edges, initialRootNodes);
      if (originalRoot) {
        parentChildMap.set(child.id, originalRoot.id);
      }
    });
    return children;
  });

  // Combine initial root nodes with children of resulting claims (as new root nodes)
  // Use Set to remove any duplicates
  const allRootNodes = new Set([
    ...initialRootNodes,
    ...childrenOfResultingClaims
  ].map(node => node.id));

  const rootNodes = cards.filter(card => allRootNodes.has(card.id));
  
  return { rootNodes, parentChildMap };
};

/**
 * Build hierarchy with cross-link and cycle detection
 */
const buildHierarchyWithDetection = (
  cards: Card[], 
  edges: Edge[], 
  orientation: OrientationProfile
): { hierarchyNodes: HierarchyNode[]; crossLinks: CrossLink[]; cycles: Cycle[] } => {
  const processedCards = new Set<string>();
  const crossLinks: CrossLink[] = [];
  const cycles: Cycle[] = [];
  
  // Order root nodes by orientation using the parent-child map
  const orderedRoots = orderRootNodes(orientation.rootNodes, orientation.rootOrientation, edges, orientation.parentChildMap);
  
  // Build hierarchy for each root
  const hierarchyNodes = orderedRoots.map(root => {


    // Add root node to processed cards to prevent duplication
    processedCards.add(root.id);
    
    // Create new visited set for each root's traversal
    const visitedInThisRoot = new Set<string>();
    return buildChildHierarchyWithDetection(
      root,
      cards,
      edges,
      orientation,
      processedCards,
      crossLinks,
      cycles,
      visitedInThisRoot,
      0
    );
  });

  // Add any remaining cards that aren't in the hierarchy
  const unusedCards = cards
    .filter(card => !processedCards.has(card.id))
    .map(card => ({
      ...card,
      level: 0,
      isExpanded: false,
      children: []
    }));

  return {
    hierarchyNodes: [...hierarchyNodes, ...unusedCards],
    crossLinks,
    cycles
  };
};

const buildChildHierarchyWithDetection = (
  rootNode: Card,
  allCards: Card[],
  edges: Edge[],
  orientation: OrientationProfile,
  processedCards: Set<string>,
  crossLinks: CrossLink[],
  cycles: Cycle[],
  visitedInThisRoot: Set<string>,
  currentLevel: number = 0
): HierarchyNode => {
  // Check for cycles within this root's traversal
  if (visitedInThisRoot.has(rootNode.id)) {
    cycles.push({
      node: rootNode,
      reason: 'cycle-detected',
      path: Array.from(visitedInThisRoot)
    });
    return {
      ...rootNode,
      level: currentLevel,
      isExpanded: false,
      children: []
    };
  }

  // Add to this root's visited set
  visitedInThisRoot.add(rootNode.id);

  // If this is a resulting claim with incoming connections, don't process any children
  // as they will be handled as root nodes
  if (rootNode.type === 'claim' && 
      rootNode.isResultingClaim && 
      edges.some(e => e.target_card_id === parseInt(rootNode.id))) {
    return {
      ...rootNode,
      level: currentLevel,
      isExpanded: currentLevel === 0,
      children: [] // Force empty children array
    };
  }

  // Find direct children
  const children = findConnectedChildren(rootNode, allCards, edges);
  const validChildren: Card[] = [];

  for (const child of children) {

    // Check for cycles
    if (visitedInThisRoot.has(child.id)) {
      cycles.push({
        node: child,
        reason: 'cycle-detected',
        path: Array.from(visitedInThisRoot)
      });
      continue;
    }

    // Check if already processed in another hierarchy
    if (processedCards.has(child.id)) {
      crossLinks.push({
        source: rootNode,
        target: child,
        reason: 'already-assigned',
        targetHandle: edges.find(e => 
          e.source_card_id === parseInt(rootNode.id) && 
          e.target_card_id === parseInt(child.id)
        )?.target_handle || 'unknown'
      });
      continue;
    }

    // Check for cross-links based on handle position
    const childOrientation = orientation.childrenOrientations.find(
      co => co.rootId === rootNode.id
    )?.childrenOrientation || 'vertical';

    if (isCrossLink(rootNode, child, childOrientation, edges)) {
      crossLinks.push({
        source: rootNode,
        target: child,
        reason: 'cross-link',
        targetHandle: edges.find(e => 
          e.source_card_id === parseInt(rootNode.id) && 
          e.target_card_id === parseInt(child.id)
        )?.target_handle || 'unknown',
        orientation: childOrientation
      });
    } else {
      validChildren.push(child);
      processedCards.add(child.id);
    }
  }

  // Order children based on their orientation
  const orderedChildren = orderChildren(validChildren, orientation.childrenOrientations.find(
    co => co.rootId === rootNode.id
  )?.childrenOrientation || 'vertical');

  // Recursively build hierarchy for valid children
  const childHierarchies = orderedChildren.map(child =>
    buildChildHierarchyWithDetection(
      child,
      allCards,
      edges,
      orientation,
      processedCards,
      crossLinks,
      cycles,
      visitedInThisRoot,
      currentLevel + 1
    )
  );

  return {
    ...rootNode,
    level: currentLevel,
    isExpanded: currentLevel === 0, // Expand root nodes by default
    children: childHierarchies
  };
};

/**
 * Flatten hierarchy into a display list with proper visual levels
 * - Level 0: Root nodes
 * - Level 1: First children (no indentation in expansion)
 * - Level 2: Second level children (first indentation)
 * - Level 3: Third level children (second indentation)
 * - Level 4+: All flattened to same indentation as level 3
 */
export const flattenHierarchyForDisplay = (nodes: HierarchyNode[]): HierarchyNode[] => {
  const result: HierarchyNode[] = [];
  
  const flatten = (node: HierarchyNode, currentLevel: number = 0) => {
    // Cap visual level at 3 (for indentation purposes)
    const visualLevel = Math.min(currentLevel, 3);
    
    const displayNode: HierarchyNode = {
      ...node,
      level: visualLevel,
      // Keep original children for expansion logic, but don't include in flat list
      children: node.children
    };
    
    result.push(displayNode);
    
    // If node is expanded, add its children to the flat list
    if (node.isExpanded && node.children.length > 0) {
      node.children.forEach(child => flatten(child, currentLevel + 1));
    }
  };
  
  nodes.forEach(node => flatten(node));
  return result;
}; 