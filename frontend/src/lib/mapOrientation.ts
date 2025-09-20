export interface Card {
  id: string;
  position_x?: number;
  position_y?: number;
  type?: string;
  time_created?: string;
  isResultingClaim?: boolean;
  data?: {
    [key: string]: any;  // Allow other data properties
  };
}

export interface Edge {
  source_card_id: number;
  target_card_id: number;
  target_handle?: string;
}

export interface OrientationProfile {
  rootOrientation: 'horizontal' | 'vertical' | 'mixed';
  childrenOrientations: Array<{
    rootId: string;
    childrenOrientation: 'horizontal' | 'vertical' | 'mixed';
  }>;
  rootNodes: Card[];
  parentChildMap: Map<string, string>;
}

export const calculateMapOrientation = (cards: Card[], edges: Edge[]): OrientationProfile => {
  const { rootNodes, parentChildMap } = identifyRootNodes(cards, edges);
  const rootOrientation = analyzeRootOrientation(rootNodes);
  
  const childrenOrientations = rootNodes
    .map(root => {
      const children = findConnectedChildren(root, cards, edges);
      // Only include orientation if the root has children
      if (children.length === 0) {
        return null;
      }
      return {
        rootId: root.id,
        childrenOrientation: analyzeChildrenOrientation(root, cards, edges)
      };
    })
    .filter(orientation => orientation !== null) as Array<{
      rootId: string;
      childrenOrientation: 'horizontal' | 'vertical' | 'mixed';
    }>;

  return {
    rootOrientation,
    childrenOrientations,
    rootNodes,
    parentChildMap
  };
};

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
  const resultingClaimChildren = connectedResultingClaims.flatMap(claim => {
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
  const allRootNodeIds = new Set([
    ...initialRootNodes.map(node => node.id),
    ...resultingClaimChildren.map(node => node.id)
  ]);

  const rootNodes = cards.filter(card => allRootNodeIds.has(card.id));
  
  return { rootNodes, parentChildMap };
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

const calculateSpread = (values: number[]): number => {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
};
