"use client";
import React, { useCallback, useState, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  addEdge,
  Connection,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";

import QuestionCard from "../components/canvas-cards/QuestionCard";
import SourceMaterialCard from "../components/canvas-cards/SourceMaterialCard";
import InsightCard from "../components/canvas-cards/InsightCard";
import ThoughtCard from "../components/canvas-cards/ThoughtCard";
import ClaimCard from "../components/canvas-cards/ClaimCard";
import BottomNav from "@/components/BottomNav";
import { SidePanelBase } from "../components/side-panel";
import { FullscreenFileViewer } from "./canvas-add-files/FullscreenFileViewer";
import { uploadFilesForCardType, CardType } from "../components/useFileUploadHandler";
import { useGuidedExperience } from "./useGuidedExperience";


// Ghost node component
const GhostNode = ({ data }: { data: { type: "source" | "question" | "insight" | "thought" | "claim" } }) => {
  const getGhostClasses = (nodeType: "source" | "question" | "insight" | "thought" | "claim") => {
    const baseClasses = "w-48 h-25 opacity-70 rounded-xl flex items-center justify-center text-xs font-bold pointer-events-none bg-white/80";
    
    const typeClasses = {
      source: "border-2 border-dashed border-blue-400 text-blue-400", // Blue
      question: "border-2 border-dashed border-orange-400 text-orange-400", // Orange
      insight: "border-2 border-dashed border-purple-400 text-purple-400", // Purple
      thought: "border-2 border-dashed border-teal-400 text-teal-400", // Teal
      claim: "border-2 border-dashed border-pink-400 text-pink-400", // Pink
    };

    return `${baseClasses} ${typeClasses[nodeType]}`;
  };

  const getGhostText = (nodeType: "source" | "question" | "insight" | "thought" | "claim") => {
    const texts = {
      source: "Source Material",
      question: "Question",
      insight: "Insight",
      thought: "Thought",
      claim: "Claim",
    };
    return texts[nodeType];
  };

  return (
    <div className={getGhostClasses(data.type)}>
      {getGhostText(data.type)}
    </div>
  );
};

interface CanvasProps {
  projectId?: number;
  onAddSourceMaterial?: () => void;
  onAddQuestion?: () => void;
  onAddInsight?: () => void;
  onAddThought?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define nodeTypes outside the component
const nodeTypes = {
  question: QuestionCard,
  source: SourceMaterialCard,
  insight: InsightCard,
  thought: ThoughtCard,
  claim: ClaimCard,
  ghost: GhostNode,
};

// Helper to determine file type from filename or entry
function getFileTypeFromEntry(entry: any): 'image' | 'pdf' | 'audio' | 'other' {
  if (!entry || !entry.filename) return 'other';
  const ext = entry.filename.split('.').pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return 'image';
  if (ext === "pdf") return 'pdf';
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return 'audio';
  return 'other';
}

export default function CanvasInner({ projectId }: CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();

  // State for placing mode
  const [placingNodeType, setPlacingNodeType] = useState<null | "source" | "question" | "insight" | "thought" | "claim">(null);
  const [ghostNodeId] = useState(() => `ghost-${crypto.randomUUID()}`);

  // State for open card
  const [openCard, setOpenCard] = useState<{ id: string; type: string } | null>(null);
  // State for drawer tabs (per card type)
  const [sourceTab, setSourceTab] = useState("info");
  const [questionTab, setQuestionTab] = useState("info");
  const [insightTab, setInsightTab] = useState("info");
  const [thoughtTab, setThoughtTab] = useState("info");
  const [claimTab, setClaimTab] = useState("info");

  // Guided experience state with persistence
  const { guided, setGuided, loading: guidedLoading, error: guidedError } = useGuidedExperience();

  // Track which card (if any) is in chat mode
  const [chatActiveCardId, setChatActiveCardId] = useState<string | null>(null);

  // Add timeout ref for position saving
  const positionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen file viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'image' | 'pdf' | 'other' | 'audio'>('image');

  // Track which cards are being deleted
  const [deletingCards, setDeletingCards] = useState<Set<string>>(new Set());

  // Track selected card
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Load cards from backend when projectId changes
  useEffect(() => {
    if (!projectId) return;
    
    const loadCards = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const res = await fetch(`${API_URL}/cards/?project_id=${projectId}`, {
          credentials: "include", // Send cookies with request
        });
        
        if (!res.ok) throw new Error("Failed to load cards");
        const cards = await res.json();
        
        // Convert backend cards to ReactFlow nodes
        const loadedNodes = await Promise.all(cards.map(async (card: any) => {
          let cardData = {};
          
          // If it's a source card, load the source material data
          if (card.type === "source" && card.data_id) {
            try {
              const smRes = await fetch(`${API_URL}/source_materials/${card.data_id}`, {
                credentials: "include", // Send cookies with request
              });
              if (smRes.ok) {
                const sourceMaterial = await smRes.json();
                
                // If there's a citation ID, fetch the citation text
                let citationText = "";
                let citationCredibility = "";
                if (sourceMaterial.citation_id) {
                  try {
                    const citationRes = await fetch(`${API_URL}/citations/${sourceMaterial.citation_id}`, {
                      credentials: "include", // Send cookies with request
                    });
                    if (citationRes.ok) {
                      const citation = await citationRes.json();
                      citationText = citation.text || "";
                      citationCredibility = citation.credibility || "";
                    }
                  } catch (err) {
                    console.error("Failed to load citation:", err);
                  }
                }
                
                // Create fileEntries with original filenames
                const fileUrls = sourceMaterial.files ? sourceMaterial.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = sourceMaterial.file_filenames ? sourceMaterial.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));
                
                cardData = {
                  tags: Array.isArray(sourceMaterial.tags) ? sourceMaterial.tags : (sourceMaterial.tags ? [sourceMaterial.tags] : []),
                  text: sourceMaterial.content || "",
                  thesisSupport: sourceMaterial.argument_type || "",
                  source: citationText || sourceMaterial.source || "",
                  credibility: citationCredibility || sourceMaterial.credibility || "",
                  summary: sourceMaterial.summary,
                  sourceFunction: sourceMaterial.function,
                  additionalNotes: sourceMaterial.notes || "",
                  sourceMaterialId: sourceMaterial.id,
                  projectId: sourceMaterial.project_id,
                  citationId: sourceMaterial.citation_id,
                  files: fileUrls,
                  fileEntries: fileEntries,
                };
              }
            } catch (err) {
              console.error("Failed to load source material:", err);
            }
          } else if (card.type === "question" && card.data_id) {
            // For question cards, load the question data
            try {
              const questionRes = await fetch(`${API_URL}/questions/${card.data_id}`, {
                credentials: "include", // Send cookies with request
              });
              if (questionRes.ok) {
                const question = await questionRes.json();
                // Create fileEntries with original filenames
                const fileUrls = question.files ? question.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = question.file_filenames ? question.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));
                
                cardData = {
                  tags: Array.isArray(question.tags) ? question.tags : (question.tags ? [question.tags] : []),
                  question: question.question_text || "",
                  category: question.category || "",
                  status: question.status || "unexplored",
                  priority: question.priority || "",
                  questionId: question.id,
                  projectId: question.project_id,
                  files: fileUrls,
                  fileEntries: fileEntries,
                };
              }
            } catch (err) {
              console.error("Failed to load question:", err);
              // Fallback to default data
              cardData = {
                question: "What is your research question?",
                status: "unexplored",
                priority: "",
                files: [],
              };
            }
          } else if (card.type === "insight" && card.data_id) {
            // For insight cards, load the insight data
            try {
              const insightRes = await fetch(`${API_URL}/insights/${card.data_id}`, {
                credentials: "include", // Send cookies with request
              });
              if (insightRes.ok) {
                const insight = await insightRes.json();
                // Create fileEntries with original filenames
                const fileUrls = insight.files ? insight.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = insight.file_filenames ? insight.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));
                
                cardData = {
                  tags: Array.isArray(insight.tags) ? insight.tags : (insight.tags ? [insight.tags] : []),
                  insight: insight.insight_text || "",
                  sourcesLinked: insight.sources_linked || "0 Sources Linked",
                  insightType: insight.insight_type || "",
                  insightId: insight.id,
                  projectId: insight.project_id,
                  files: fileUrls,
                  fileEntries: fileEntries,
                };
              }
            } catch (err) {
              console.error("Failed to load insight:", err);
              // Fallback to default data
              cardData = {
                insight: "What insight connects your sources?",
                sourcesLinked: "0 Sources Linked",
                files: [],
              };
            }
          } else if (card.type === "thought" && card.data_id) {
            // For thought cards, load the thought data
            try {
              const thoughtRes = await fetch(`${API_URL}/thoughts/${card.data_id}`, {
                credentials: "include", // Send cookies with request
              });
              if (thoughtRes.ok) {
                const thought = await thoughtRes.json();
                // Create fileEntries with original filenames
                const fileUrls = thought.files ? thought.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = thought.file_filenames ? thought.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));
                
                cardData = {
                  tags: Array.isArray(thought.tags) ? thought.tags : (thought.tags ? [thought.tags] : []),
                  thought: thought.thought_text || "",
                  thoughtId: thought.id,
                  projectId: thought.project_id,
                  files: fileUrls,
                  fileEntries: fileEntries,
                };
              }
            } catch (err) {
              console.error("Failed to load thought:", err);
              // Fallback to default data
              cardData = {
                thought: "What are your thoughts on this?",
                files: [],
              };
            }
          } else if (card.type === "claim" && card.data_id) {
            // For claim cards, load the claim data
            try {
              const claimRes = await fetch(`${API_URL}/claims/${card.data_id}`, {
                credentials: "include", // Send cookies with request
              });
              if (claimRes.ok) {
                const claim = await claimRes.json();
                // Create fileEntries with original filenames
                const fileUrls = claim.files ? claim.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = claim.file_filenames ? claim.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));
                
                cardData = {
                  tags: Array.isArray(claim.tags) ? claim.tags : (claim.tags ? [claim.tags] : []),
                  claim: claim.claim_text || "",
                  claimType: claim.claim_type || undefined,
                  claimId: claim.id,
                  projectId: claim.project_id,
                  files: fileUrls,
                  fileEntries: fileEntries,
                };
              }
            } catch (err) {
              console.error("Failed to load claim:", err);
              // Fallback to default data
              cardData = {
                claim: "What is your claim?",
                files: [],
              };
            }
          } else {
            // For other card types, use default data
            cardData = {
              insight: card.type === "insight" ? "What insight connects your sources?" : "",
              sourcesLinked: card.type === "insight" ? "0 Sources Linked" : "",
              thought: card.type === "thought" ? "What are your thoughts on this?" : "",
              files: [],
            };
          }
          
          return {
            id: card.id.toString(),
            type: card.type,
            position: { x: card.position_x || 0, y: card.position_y || 0 },
            data: cardData,
          };
        }));
        
        setNodes(loadedNodes);
        
        // Load card links
        const linksRes = await fetch(`${API_URL}/card_links/?project_id=${projectId}`, {
          credentials: "include", // Send cookies with request
        });
        if (linksRes.ok) {
          const links = await linksRes.json();
      
          const loadedEdges = links.map((link: any) => ({
            id: link.id.toString(),
            source: link.source_card_id.toString(),
            target: link.target_card_id.toString(),
            sourceHandle: link.source_handle,
            targetHandle: link.target_handle,
            type: 'default',
          }));
      
          setEdges(loadedEdges);
        } else {
          console.error('Failed to load card links:', linksRes.status, linksRes.statusText);
        }
      } catch (err) {
        console.error("Failed to load cards:", err);
      }
    };
    
    loadCards();
  }, [projectId]);

  // Reset tab to first when switching cards
  useEffect(() => {
    if (openCard && nodes.find(n => n.id === openCard.id)?.type === "source") {
      setSourceTab("content");
    } else if (openCard && nodes.find(n => n.id === openCard.id)?.type === "question") {
      setQuestionTab("info");
    } else if (openCard && nodes.find(n => n.id === openCard.id)?.type === "claim") {
      setClaimTab("info");
    }
  }, [openCard?.id]); // Only run when the card ID changes, not when nodes change

  // Exit chat experience if guided is turned off
  useEffect(() => {
    if (!guided) {
      setChatActiveCardId(null);
    }
  }, [guided]);

  // Handler to open a card
  const handleOpenCard = useCallback((id: string, type: string) => {
    setOpenCard({ id, type });
  }, []);

  // Handler for file click from SourceMaterialCard
  const handleFileClick = (fileUrl: string, fileType: 'image' | 'pdf' | 'other') => {
    setViewerFile(fileUrl);
    setViewerType(fileType);
    setViewerOpen(true);
  };

  // Handler for file click from side panel
  const handleSidePanelFileClick = (fileUrl: string, entry: any) => {
    setViewerFile(fileUrl);
    setViewerType(getFileTypeFromEntry(entry));
    setViewerOpen(true);
  };

  // Handler for centering on a card and opening its side panel
  const handleCardClick = useCallback((cardId: string, cardType: string) => {
    // Find the card in the nodes array
    const card = nodes.find(node => node.id === cardId);
    if (!card) return;

    // Use ReactFlow's fitView to center the specific node
    fitView({
      nodes: [card],
      duration: 800,
      padding: 0.1,
      minZoom: 0.3,
      maxZoom: 1,
    });

    // Open the side panel for the card
    setOpenCard({ id: cardId, type: cardType });
  }, [nodes, fitView]);

  // Handle card selection
  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  // Helper to inject onOpen and onFileClick into node data
  const nodesWithOpen = useMemo(() =>
    nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onOpen: () => handleOpenCard(node.id, node.type || ''),
        onFileClick: handleFileClick,
        onSelect: () => handleCardSelect(node.id), // Add selection handler
        cardType: node.type || 'source', // Add cardType to data for FileListDisplay
        isDeleting: deletingCards.has(node.id), // Add deletion state
        isSelected: selectedCardId === node.id, // Add selected state
      },
    })),
    [nodes, handleOpenCard, handleFileClick, handleCardSelect, deletingCards, selectedCardId]
  );

  // Mouse move handler for ghost
  const onPaneMouseMove = useCallback((evt: React.MouseEvent) => {
    if (!placingNodeType) return;
    const projectedPos = screenToFlowPosition({
      x: evt.clientX,
      y: evt.clientY,
    });
    // Update the ghost node position in the nodes array
    setNodes((nds) => {
      const ghostNode = nds.find(n => n.id === ghostNodeId);
      if (ghostNode) {
        return nds.map(n => 
          n.id === ghostNodeId 
            ? { ...n, position: projectedPos }
            : n
        );
      }
      return nds;
    });
  }, [placingNodeType, screenToFlowPosition, ghostNodeId]);

  // Click to place node
  const onPaneClick = useCallback(async (evt: React.MouseEvent) => {
    if (!placingNodeType) return;
    // Get the exact mouse position in ReactFlow coordinates
    const clickPosition = screenToFlowPosition({
      x: evt.clientX,
      y: evt.clientY,
    });
    
    // Generate a new id for the new node
    const newId = crypto.randomUUID();
    
    // Always create empty card first
    let cardId = newId;
    // Only declare savedCitation and sourceMaterialId in the source branch
    if (placingNodeType === "source") {
      // For source cards, don't create backend record immediately - wait for user to save content
      setNodes((nds) => {
        const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
        const newNode = {
          id: cardId,
          type: placingNodeType,
          position: clickPosition,
          data: {
            tags: [],
            text: "",
            thesisSupport: "",
            source: "",
            credibility: "",
            summary: "",
            sourceFunction: "",
            additionalNotes: "",
            files: [],
            sourceMaterialId: null, // Will be set when user saves content
            projectId,
            citationId: null, // Will be set when user saves content
          },
        };
        return [...nodesWithoutGhost, newNode];
      });
      setOpenCard({ id: cardId, type: placingNodeType });
      if (guided) {
        setChatActiveCardId(cardId);
      }
      setPlacingNodeType(null);
      return;
    } else if (placingNodeType === "insight") {
      // For insight cards, don't create backend record immediately - wait for user to save content
      setNodes((nds) => {
        const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
        const newNode = {
          id: cardId,
          type: placingNodeType,
          position: clickPosition,
          data: {
            insight: "",
            sourcesLinked: "0 Sources Linked",
            files: [],
            insightId: null, // Will be set when user saves content
            projectId,
          },
        };
        return [...nodesWithoutGhost, newNode];
      });
      setOpenCard({ id: cardId, type: placingNodeType });
      if (guided) {
        setChatActiveCardId(cardId);
      }
      setPlacingNodeType(null);
      return;
    } else if (placingNodeType === "thought") {
      // For thought cards, don't create backend record immediately - wait for user to save content
      setNodes((nds) => {
        const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
        const newNode = {
          id: cardId,
          type: placingNodeType,
          position: clickPosition,
          data: {
            thought: "",
            files: [],
            thoughtId: null, // Will be set when user saves content
            projectId,
          },
        };
        return [...nodesWithoutGhost, newNode];
      });
      setOpenCard({ id: cardId, type: placingNodeType });
      if (guided) {
        setChatActiveCardId(cardId);
      }
      setPlacingNodeType(null);
      return;
    } else if (placingNodeType === "question") {
      // For question cards, don't create backend record immediately - wait for user to save content
      setNodes((nds) => {
        const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
        const newNode = {
          id: cardId,
          type: placingNodeType,
          position: clickPosition,
          data: {
            question: "",
            category: "",
            status: "unexplored",
            priority: "",
            questionId: null, // Will be set when user saves content
            projectId,
            files: [],
          },
        };
        return [...nodesWithoutGhost, newNode];
      });
      setOpenCard({ id: cardId, type: placingNodeType });
      if (guided) {
        setChatActiveCardId(cardId);
      }
      setPlacingNodeType(null);
      return;
    } else if (placingNodeType === "claim") {
      // For claim cards, don't create backend record immediately - wait for user to save content
      setNodes((nds) => {
        const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
        const newNode = {
          id: cardId,
          type: placingNodeType,
          position: clickPosition,
          data: {
            claim: "",
            files: [],
            claimId: null, // Will be set when user saves content
            projectId,
          },
        };
        return [...nodesWithoutGhost, newNode];
      });
      setOpenCard({ id: cardId, type: placingNodeType });
      if (guided) {
        setChatActiveCardId(cardId);
      }
      setPlacingNodeType(null);
      return;
    }
    
    // Create empty node data based on type
    const emptyNodeData = {
      source: {
        tags: [],
        text: "",
        thesisSupport: "",
        source: "",
        credibility: "",
        summary: "",
        sourceFunction: "",
        additionalNotes: "",
        files: [],
        sourceMaterialId: null,
        projectId,
        citationId: null,
      },
      question: {
        question: "",
        category: "",
        status: "unexplored",
        priority: "",
        questionId: null,
        projectId,
        files: [],
      },
      insight: {
        insight: "",
        sourcesLinked: "",
        files: [],
      },
      thought: {
        thought: "",
        files: [],
      },
      claim: {
        claim: "",
        files: [],
      },
    };
    
    setNodes((nds) => {
      // Remove the ghost node
      const nodesWithoutGhost = nds.filter(n => n.id !== ghostNodeId);
      // Add the new node at the exact click position
      const newNode = {
        id: cardId,
        type: placingNodeType,
        position: clickPosition,
        data: emptyNodeData[placingNodeType],
      };
      return [...nodesWithoutGhost, newNode];
    });
    
    setOpenCard({ id: cardId, type: placingNodeType });
    
    // If guided mode is on and it's a source or question card, start chat
    if (guided && (placingNodeType === "source" || placingNodeType === "question")) {
      setChatActiveCardId(cardId);
    }
    
    setPlacingNodeType(null);
  }, [placingNodeType, ghostNodeId, screenToFlowPosition, guided, projectId]);

  // Handlers for add buttons
  const startPlacingSource = useCallback(() => {
    setPlacingNodeType("source");
    // Add ghost node (position will be set by mouse move)
    setNodes((nds) => [
      ...nds,
      {
        id: ghostNodeId,
        type: "ghost",
        position: { x: 0, y: 0 }, // Will be updated immediately by mouse move
        data: { type: "source" },
      },
    ]);
  }, [ghostNodeId]);

  const startPlacingQuestion = useCallback(() => {
    setPlacingNodeType("question");
    // Add ghost node (position will be set by mouse move)
    setNodes((nds) => [
      ...nds,
      {
        id: ghostNodeId,
        type: "ghost",
        position: { x: 0, y: 0 }, // Will be updated immediately by mouse move
        data: { type: "question" },
      },
    ]);
  }, [ghostNodeId]);

  const startPlacingInsight = useCallback(() => {
    setPlacingNodeType("insight");
    // Add ghost node (position will be set by mouse move)
    setNodes((nds) => [
      ...nds,
      {
        id: ghostNodeId,
        type: "ghost",
        position: { x: 0, y: 0 }, // Will be updated immediately by mouse move
        data: { type: "insight" },
      },
    ]);
  }, [ghostNodeId]);

  const startPlacingThought = useCallback(() => {
    setPlacingNodeType("thought");
    // Add ghost node (position will be updated immediately by mouse move)
    setNodes((nds) => [
      ...nds,
      {
        id: ghostNodeId,
        type: "ghost",
        position: { x: 0, y: 0 }, // Will be updated immediately by mouse move
        data: { type: "thought" },
      },
    ]);
  }, [ghostNodeId]);

  const startPlacingClaim = useCallback(() => {
    setPlacingNodeType("claim");
    // Add ghost node (position will be updated immediately by mouse move)
    setNodes((nds) => [
      ...nds,
      {
        id: ghostNodeId,
        type: "ghost",
        position: { x: 0, y: 0 }, // Will be updated immediately by mouse move
        data: { type: "claim" },
      },
    ]);
  }, [ghostNodeId]);

  const onNodesChange = useCallback(
    async (changes: NodeChange[]) => {
      // Find removed node IDs
      const removedNodeIds = changes
        .filter(change => change.type === 'remove')
        .map(change => change.id);
      
      // Find position change updates
      const positionChanges = changes.filter(change => change.type === 'position' && change.position);
      
      // For each removed node, send DELETE to backend
      if (removedNodeIds.length > 0) {
        for (const nodeId of removedNodeIds) {
          try {
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/cards/${nodeId}`, {
              method: "DELETE",
              headers: {
                Authorization: token ? `Bearer ${token}` : "",
              },
            });
          } catch (err) {
            console.error("Failed to delete card from backend:", err);
          }
        }
      }
      
      // For position changes, only save when dragging ends (not during drag)
      if (positionChanges.length > 0) {
        // Clear any existing timeout
        if (positionSaveTimeoutRef.current) {
          clearTimeout(positionSaveTimeoutRef.current);
        }
        
        // Set a new timeout to save the position after dragging stops
        positionSaveTimeoutRef.current = setTimeout(async () => {
          for (const change of positionChanges) {
            if ('id' in change && change.id && 'position' in change && change.position) {
              try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_URL}/cards/${change.id}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                  },
                  body: JSON.stringify({
                    position_x: change.position.x,
                    position_y: change.position.y,
                  }),
                });
                
                if (!response.ok) {
                  console.error(`Failed to save position for card ${change.id}:`, response.status, response.statusText);
                }
              } catch (err) {
                console.error("Failed to save card position in backend:", err);
              }
            }
          }
        }, 500); // Save position 500ms after last drag movement
      }
      
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        // Check if any node was removed and matches the openCard
        if (openCard && removedNodeIds.includes(openCard.id)) {
          setOpenCard(null);
        }
        return updatedNodes;
      });
    },
    [openCard]
  );
  const onEdgesChange = useCallback(
    async (changes: EdgeChange[]) => {
      // Apply changes to local state first
      setEdges((eds) => applyEdgeChanges(changes, eds));
      
      // Handle deletions in backend
      for (const change of changes) {
        if (change.type === 'remove' && change.id) {
          // Skip temporary edges (they haven't been saved to backend yet)
          if (change.id.startsWith('temp-')) {
    
            continue;
          }
          
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/card_links/${change.id}`, {
              method: "DELETE",
              headers: {
                Authorization: token ? `Bearer ${token}` : "",
              },
            });
            
            if (!res.ok) {
              console.error("Failed to delete connection from backend:", change.id);
              // Optionally revert the local change if backend deletion failed
            } else {
      
            }
          } catch (err) {
            console.error("Failed to delete connection:", err);
            // Optionally revert the local change if backend deletion failed
          }
        }
      }
    },
    []
  );

  const onConnect = useCallback(
    async (params: Connection) => {
      // Prevent duplicate connections between the same two cards
      const alreadyConnected = edgesRef.current.some(
        edge =>
          (edge.source === params.source && edge.target === params.target) ||
          (edge.source === params.target && edge.target === params.source)
      );
      if (alreadyConnected) {
        toast.error("These cards are already connected.");
        return;
      }
      if (params.source && params.target && params.sourceHandle && params.targetHandle && projectId) {
        
        // Add edge to local state immediately for responsive UI
        const newEdge = {
          id: `temp-${Date.now()}`, // Temporary ID
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          type: 'default',
        };
        setEdges((eds) => addEdge(newEdge, eds));
        
        // Save to backend
        try {
          const token = localStorage.getItem("token");
          const linkPayload = {
            source_card_id: parseInt(params.source),
            target_card_id: parseInt(params.target),
            source_handle: params.sourceHandle,
            target_handle: params.targetHandle,
            project_id: projectId,
          };
          
          const res = await fetch(`${API_URL}/card_links/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(linkPayload),
          });
          
          if (res.ok) {
            const savedLink = await res.json();
            // Update the edge with the real ID from backend
            setEdges((eds) => 
              eds.map(edge => 
                edge.id === newEdge.id 
                  ? { ...edge, id: savedLink.id.toString() }
                  : edge
              )
            );
          } else {
            const errorText = await res.text();
            console.error("Failed to save connection:", res.status, errorText);
            // If save failed, remove the edge
            setEdges((eds) => eds.filter(edge => edge.id !== newEdge.id));
          }
        } catch (err) {
          console.error("Failed to save connection:", err);
          // If save failed, remove the edge
          setEdges((eds) => eds.filter(edge => edge.id !== newEdge.id));
        }
      } else {
  
      }
    },
    [projectId],
  );

  const isValidConnection = useCallback((connection: Connection) => {
    // Allow connections between any handles
    return true;
  }, []);

  // Log body overflow when drawer opens/closes
  useEffect(() => {
    // Workaround: Remove aria-hidden from React Flow renderer when drawer is open
    if (openCard) {
      const renderer = document.querySelector('.react-flow__renderer');
      if (renderer && renderer.hasAttribute('aria-hidden')) {
        renderer.removeAttribute('aria-hidden');
      }
    }
  }, [openCard]);

  // Save card to backend after chat
  const handleSaveCard = async ({ cardId, chatAnswers, uploadedFiles }: { cardId: string; chatAnswers: any; uploadedFiles: File[] }) => {
    const node = nodes.find(n => n.id === cardId);
    if (!node || !projectId) {
      return;
    }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let backendId: number | undefined;
    let cardPayload: any = {};
    let updatedNodeData: any = {};
    let cardType: CardType = node.type as CardType;
    let files: string[] = [];

    try {
      const token = localStorage.getItem("token");
      // 1. Create or update the backend record for each card type
      if (cardType === "source") {
        
        let citationId = node.data.citationId; // Keep existing citationId if updating
        
        // Check if source already exists (has sourceMaterialId) or needs to be created
        if (node.data.sourceMaterialId) {
          // Update existing source material
          const sourceMaterialPayload = {
            content: chatAnswers.sourceContent,
            summary: chatAnswers.summary,
            tags: Array.isArray(chatAnswers.topicalTags) ? chatAnswers.topicalTags : (chatAnswers.topicalTags ? [chatAnswers.topicalTags] : []),
            argument_type: chatAnswers.argumentType,
            function: chatAnswers.sourceFunction,
            notes: '',
          };
          const smRes = await fetch(`${API_URL}/source_materials/${node.data.sourceMaterialId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(sourceMaterialPayload),
          });
          if (!smRes.ok) throw new Error("Failed to update source material");
          backendId = node.data.sourceMaterialId;
        } else {
          // Create new source material
          // Create citation
          const citationPayload = {
            text: chatAnswers.sourceContent || "Source content",
            credibility: chatAnswers.sourceCredibility || "",
            project_id: projectId,
          };
          const citationRes = await fetch(`${API_URL}/citations/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(citationPayload),
          });
          if (!citationRes.ok) throw new Error("Failed to create citation");
          const savedCitation = await citationRes.json();
          citationId = savedCitation.id; // Set citationId for new source materials
          
          // Dispatch citation update event to refresh source list
          window.dispatchEvent(new CustomEvent('citationUpdate'));
          
          // Create source material
          const sourceMaterialPayload = {
            project_id: projectId,
            citation_id: savedCitation.id,
            content: chatAnswers.sourceContent,
            summary: chatAnswers.summary,
            tags: Array.isArray(chatAnswers.topicalTags) ? chatAnswers.topicalTags : (chatAnswers.topicalTags ? [chatAnswers.topicalTags] : []),
            argument_type: chatAnswers.argumentType,
            function: chatAnswers.sourceFunction,
            files: "",
            notes: '',
          };
          const smRes = await fetch(`${API_URL}/source_materials/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(sourceMaterialPayload),
          });
          if (!smRes.ok) throw new Error("Failed to save source material");
          const savedSM = await smRes.json();
          backendId = savedSM.id;
          
          // Dispatch source material update event to refresh source list
          console.log('Canvas handleSaveCard: Dispatching sourceMaterialUpdate event');
          window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
        }
        
        updatedNodeData = {
          ...node.data,
          ...chatAnswers,
          sourceMaterialId: backendId,
          citationId: citationId,
          tags: Array.isArray(chatAnswers.topicalTags) ? chatAnswers.topicalTags : (chatAnswers.topicalTags ? [chatAnswers.topicalTags] : []),
          text: chatAnswers.sourceContent || "",
          thesisSupport: chatAnswers.argumentType || "",
          source: chatAnswers.sourceCitation || "",
          credibility: chatAnswers.sourceCredibility || "",
          summary: chatAnswers.summary,
          sourceFunction: chatAnswers.sourceFunction,
          additionalNotes: "",
        };
        cardPayload = {
          type: node.type,
          data_id: backendId,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
      } else if (cardType === "question") {
        // Check if question already exists (has questionId) or needs to be created
        if (node.data.questionId) {
          // Update existing question
          const questionPayload = {
            question_text: chatAnswers.questionText && chatAnswers.questionText.trim() !== '' && chatAnswers.questionText !== 'Skipped' ? chatAnswers.questionText : null,
            category: chatAnswers.questionFunction && chatAnswers.questionFunction.trim() !== '' && chatAnswers.questionFunction !== 'Skipped' ? chatAnswers.questionFunction : null,
            priority: chatAnswers.questionPriority && chatAnswers.questionPriority.trim() !== '' && chatAnswers.questionPriority !== 'Skipped' ? chatAnswers.questionPriority : null,
          };
          const questionRes = await fetch(`${API_URL}/questions/${node.data.questionId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(questionPayload),
          });
          if (!questionRes.ok) throw new Error("Failed to update question");
          backendId = node.data.questionId;
        } else {
          // Create new question
          const questionPayload = {
            project_id: projectId,
            question_text: chatAnswers.questionText && chatAnswers.questionText.trim() !== '' && chatAnswers.questionText !== 'Skipped' ? chatAnswers.questionText : null,
            category: chatAnswers.questionFunction && chatAnswers.questionFunction.trim() !== '' && chatAnswers.questionFunction !== 'Skipped' ? chatAnswers.questionFunction : null,
            status: "unexplored",
            priority: chatAnswers.questionPriority && chatAnswers.questionPriority.trim() !== '' && chatAnswers.questionPriority !== 'Skipped' ? chatAnswers.questionPriority : null,
            files: "",
          };
          const questionRes = await fetch(`${API_URL}/questions/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(questionPayload),
          });
          if (!questionRes.ok) throw new Error("Failed to save question");
          const savedQuestion = await questionRes.json();
          backendId = savedQuestion.id;
        }
        
        updatedNodeData = {
          ...node.data,
          questionId: backendId,
          question: chatAnswers.questionText || "",
          category: chatAnswers.questionFunction || "",
          status: "unexplored",
          priority: chatAnswers.questionPriority || "",
        };
        cardPayload = {
          type: node.type,
          data_id: backendId,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
      } else if (cardType === "insight") {
        // Check if insight already exists (has insightId) or needs to be created
        if (node.data.insightId) {
          // Update existing insight
          const insightPayload = {
            insight_text: chatAnswers.insightText || "",
            sources_linked: node.data.sourcesLinked || "0 Sources Linked",
            insight_type: chatAnswers.insightType || "",
          };
          const insightRes = await fetch(`${API_URL}/insights/${node.data.insightId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(insightPayload),
          });
          if (!insightRes.ok) throw new Error("Failed to update insight");
          backendId = node.data.insightId;
        } else {
          // Create new insight
          const insightPayload = {
            project_id: projectId,
            insight_text: chatAnswers.insightText || "",
            sources_linked: node.data.sourcesLinked || "0 Sources Linked",
            insight_type: chatAnswers.insightType || "",
            files: "",
          };
          const insightRes = await fetch(`${API_URL}/insights/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(insightPayload),
          });
          if (!insightRes.ok) throw new Error("Failed to save insight");
          const savedInsight = await insightRes.json();
          backendId = savedInsight.id;
        }
        
        updatedNodeData = {
          ...node.data,
          insightId: backendId,
          insight: chatAnswers.insightText || "",
          insightType: chatAnswers.insightType || "",
        };
        cardPayload = {
          type: node.type,
          data_id: backendId,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
      } else if (cardType === "thought") {
        // Check if thought already exists (has thoughtId) or needs to be created
        if (node.data.thoughtId) {
          // Update existing thought
          const thoughtPayload = {
            thought_text: chatAnswers.thoughtText || "",
          };
          const thoughtRes = await fetch(`${API_URL}/thoughts/${node.data.thoughtId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(thoughtPayload),
          });
          if (!thoughtRes.ok) throw new Error("Failed to update thought");
          backendId = node.data.thoughtId;
        } else {
          // Create new thought
          const thoughtPayload = {
            project_id: projectId,
            thought_text: chatAnswers.thoughtText || "",
            files: "",
          };
          const thoughtRes = await fetch(`${API_URL}/thoughts/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(thoughtPayload),
          });
          if (!thoughtRes.ok) throw new Error("Failed to save thought");
          const savedThought = await thoughtRes.json();
          backendId = savedThought.id;
        }
        
        updatedNodeData = {
          ...node.data,
          thoughtId: backendId,
          thought: chatAnswers.thoughtText || "",
        };
        cardPayload = {
          type: node.type,
          data_id: backendId,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
      } else if (cardType === "claim") {
        // Check if claim already exists (has claimId) or needs to be created
        if (node.data.claimId) {
          // Update existing claim
          const claimPayload = {
            claim_text: chatAnswers.claimText || "",
          };
          const claimRes = await fetch(`${API_URL}/claims/${node.data.claimId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(claimPayload),
          });
          if (!claimRes.ok) throw new Error("Failed to update claim");
          backendId = node.data.claimId;
        } else {
          // Create new claim
          const claimPayload = {
            project_id: projectId,
            claim_text: chatAnswers.claimText || "",
            files: "",
          };
          const claimRes = await fetch(`${API_URL}/claims/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(claimPayload),
          });
          if (!claimRes.ok) throw new Error("Failed to save claim");
          const savedClaim = await claimRes.json();
          backendId = savedClaim.id;
        }
        
        updatedNodeData = {
          ...node.data,
          claimId: backendId,
          claim: chatAnswers.claimText || "",
        };
        cardPayload = {
          type: node.type,
          data_id: backendId,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
      }

      // 2. Upload files using the unified handler if any (AFTER backendId is available)
      
      // For all card types, upload files to the backend record (newly created or existing)
      if (uploadedFiles && uploadedFiles.length > 0 && backendId) {
        await uploadFilesForCardType(
          cardType,
          backendId,
          uploadedFiles,
          [], // always start with empty for new cards
          (newFiles: string[], newFileEntries: any[]) => {
            files = newFiles;
            updatedNodeData.files = files;
            updatedNodeData.fileEntries = newFileEntries;
          }
        );
      } else {
        // For other card types, check if files are in chatAnswers.files as a fallback
        let filesToUpload = uploadedFiles;
        let filesFromChatAnswers = false;
        if ((!uploadedFiles || uploadedFiles.length === 0) && chatAnswers.files && chatAnswers.files.length > 0) {
          
          // Check if chatAnswers.files contains URLs (strings) or File objects
          if (typeof chatAnswers.files[0] === 'string') {
            files = chatAnswers.files;
            updatedNodeData.files = files;
            filesFromChatAnswers = true;
                      } else if (chatAnswers.files[0] instanceof File) {
            filesToUpload = chatAnswers.files;
          }
        }
        
        if (filesToUpload.length > 0 && backendId && !filesFromChatAnswers) {
          await uploadFilesForCardType(
            cardType,
            backendId,
            filesToUpload,
            [], // always start with empty for new cards
            (newFiles: string[], newFileEntries: any[]) => {
              files = newFiles;
              updatedNodeData.files = files;
              updatedNodeData.fileEntries = newFileEntries;
            }
          );
        } else if (!filesFromChatAnswers) {
          files = [];
          updatedNodeData.files = files;
        }
      }

      // 3. Create the card
      const res = await fetch(`${API_URL}/cards/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(cardPayload),
      });
      if (!res.ok) throw new Error("Failed to save card");
      const savedCard = await res.json();
      setNodes((nds) => {
        const filtered = nds.filter(n => n.id !== cardId && n.id !== savedCard.id);
        const updatedNode = {
          ...node,
          id: savedCard.id.toString(),
          data: updatedNodeData,
        };
        return [...filtered, updatedNode];
      });
      setOpenCard({ id: savedCard.id.toString(), type: node.type || "source" });
              if (cardType === "source") setSourceTab("content");
        if (cardType === "question") setQuestionTab("info");
        if (cardType === "insight") setInsightTab("info");
        if (cardType === "thought") setThoughtTab("info");
        if (cardType === "claim") setClaimTab("info");
      setChatActiveCardId(null);
    } catch (err) {
      alert("Failed to save card: " + (err as Error).message);
    }
  };

  // Handle deleting cards (both saved and unsaved)
  const handleDeleteCard = useCallback(async (cardId: string) => {
    const node = nodes.find(n => n.id === cardId);
    if (!node) return;
    
    // Add card to deleting set
    setDeletingCards(prev => new Set(prev).add(cardId));
    
    try {
      const token = localStorage.getItem("token");
      
      // Check if this is a saved card (has integer ID)
      // UUIDs will have letters, so we check if the entire string is a number
      const isSavedCard = /^\d+$/.test(cardId);
      
      if (isSavedCard) {
        // For saved cards, delete the Card record from backend
        await fetch(`${API_URL}/cards/${cardId}`, {
          method: "DELETE",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
      } else {
        // For unsaved cards, delete the underlying data based on card type
        if (node.type === "source" && node.data.sourceMaterialId) {
          // Delete source material (this will cascade to citation)
          await fetch(`${API_URL}/source_materials/${node.data.sourceMaterialId}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        } else if (node.type === "question" && node.data.questionId) {
          // Delete question
          await fetch(`${API_URL}/questions/${node.data.questionId}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        } else if (node.type === "insight" && node.data.insightId) {
          // Delete insight
          await fetch(`${API_URL}/insights/${node.data.insightId}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        } else if (node.type === "thought" && node.data.thoughtId) {
          // Delete thought
          await fetch(`${API_URL}/thoughts/${node.data.thoughtId}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        } else if (node.type === "claim" && node.data.claimId) {
          // Delete claim
          await fetch(`${API_URL}/claims/${node.data.claimId}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
        }
      }
      
    } catch (err) {
      console.error("Failed to delete card data from backend:", err);
    } finally {
      // Remove card from deleting set
      setDeletingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
    }
    
    // Remove the node from the canvas
    setNodes((nds) => nds.filter(n => n.id !== cardId));
    
    // Close the panel if this card was open
    if (openCard && openCard.id === cardId) {
      setOpenCard(null);
      setChatActiveCardId(null);
    }
  }, [nodes, openCard]);

  // Handle saving unsaved cards
  const handleAddCard = useCallback(async (cardId: string) => {
    const node = nodes.find(n => n.id === cardId);
    if (!node || !projectId) return;
    
    try {
      const token = localStorage.getItem("token");
      
      if (node.type === "source") {
        // Create citation
        const citationPayload = {
          text: node.data.text || "",
          credibility: node.data.credibility || "",
          project_id: projectId,
        };
        const citationRes = await fetch(`${API_URL}/citations/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(citationPayload),
        });
        const savedCitation = await citationRes.json();
        
        // Dispatch citation update event to refresh source list
        window.dispatchEvent(new CustomEvent('citationUpdate'));
        
        // Create source material
        const sourceMaterialPayload = {
          project_id: projectId,
          citation_id: savedCitation.id,
          content: node.data.text || "",
          summary: node.data.summary || "",
          tags: Array.isArray(node.data.tags) ? node.data.tags : (node.data.tags ? [node.data.tags] : []),
          argument_type: node.data.thesisSupport || "",
          function: node.data.sourceFunction || "",
          files: Array.isArray(node.data.files) ? node.data.files.join(',') : "",
          notes: node.data.additionalNotes || "",
        };
        const smRes = await fetch(`${API_URL}/source_materials/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(sourceMaterialPayload),
        });
        const savedSM = await smRes.json();
        
        // Dispatch source material update event to refresh source list
        console.log('Canvas handleAddCard: Dispatching sourceMaterialUpdate event');
        window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
        
        // Create card
        const cardPayload = {
          type: node.type,
          data_id: savedSM.id,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
        const cardRes = await fetch(`${API_URL}/cards/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(cardPayload),
        });
        const savedCard = await cardRes.json();
        
        // Upload pending files if any
        let finalFiles = Array.isArray(node.data.files) ? node.data.files : [];
        if (node.data.pendingFiles && Array.isArray(node.data.pendingFiles)) {
          try {
            await uploadFilesForCardType(
              "source",
              savedSM.id,
              node.data.pendingFiles,
              [], // Start with empty array since we're uploading to a new record
              (newFiles, newFileEntries) => {
                finalFiles = newFiles;
              }
            );
          } catch (err) {
            console.error("Failed to upload pending files:", err);
          }
        }
        
        // Update node with saved data
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                  data: { 
                    ...n.data, 
                    sourceMaterialId: savedSM.id,
                    citationId: savedCitation.id,
                    files: finalFiles,
                    pendingFiles: undefined, // Clear pending files
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
        
      } else if (node.type === "question") {
        // Create question
        const questionPayload = {
          project_id: projectId,
          question_text: node.data.question || "",
          category: node.data.category || "",
          status: node.data.status || "unexplored",
          priority: node.data.priority || "",
          files: Array.isArray(node.data.files) ? node.data.files.join(',') : "",
        };
        const questionRes = await fetch(`${API_URL}/questions/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(questionPayload),
        });
        const savedQuestion = await questionRes.json();
        
        // Create card
        const cardPayload = {
          type: node.type,
          data_id: savedQuestion.id,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
        const cardRes = await fetch(`${API_URL}/cards/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(cardPayload),
        });
        const savedCard = await cardRes.json();
        
        // Upload pending files if any
        let finalFiles = Array.isArray(node.data.files) ? node.data.files : [];
        if (node.data.pendingFiles && Array.isArray(node.data.pendingFiles)) {
          try {
            await uploadFilesForCardType(
              "question",
              savedQuestion.id,
              node.data.pendingFiles,
              [], // Start with empty array since we're uploading to a new record
              (newFiles, newFileEntries) => {
                finalFiles = newFiles;
              }
            );
          } catch (err) {
            console.error("Failed to upload pending files:", err);
          }
        }
        
        // Update node with saved data
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                  data: { 
                    ...n.data, 
                    questionId: savedQuestion.id,
                    files: finalFiles,
                    pendingFiles: undefined, // Clear pending files
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
        
      } else if (node.type === "insight") {
        // Create insight
        const insightPayload = {
          project_id: projectId,
          insight_text: node.data.insight || "",
          insight_type: node.data.insightType || "",
          files: Array.isArray(node.data.files) ? node.data.files.join(',') : "",
        };
        const insightRes = await fetch(`${API_URL}/insights/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(insightPayload),
        });
        const savedInsight = await insightRes.json();
        
        // Create card
        const cardPayload = {
          type: node.type,
          data_id: savedInsight.id,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
        const cardRes = await fetch(`${API_URL}/cards/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(cardPayload),
        });
        const savedCard = await cardRes.json();
        
        // Upload pending files if any
        let finalFiles = Array.isArray(node.data.files) ? node.data.files : [];
        if (node.data.pendingFiles && Array.isArray(node.data.pendingFiles)) {
          try {
            await uploadFilesForCardType(
              "insight",
              savedInsight.id,
              node.data.pendingFiles,
              [], // Start with empty array since we're uploading to a new record
              (newFiles, newFileEntries) => {
                finalFiles = newFiles;
              }
            );
          } catch (err) {
            console.error("Failed to upload pending files:", err);
          }
        }
        
        // Update node with saved data
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                  data: { 
                    ...n.data, 
                    insightId: savedInsight.id,
                    insightType: node.data.insightType || "",
                    files: finalFiles,
                    pendingFiles: undefined, // Clear pending files
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
        
      } else if (node.type === "thought") {
        // Create thought
        const thoughtPayload = {
          project_id: projectId,
          thought_text: node.data.thought || "",
          files: Array.isArray(node.data.files) ? node.data.files.join(',') : "",
        };
        const thoughtRes = await fetch(`${API_URL}/thoughts/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(thoughtPayload),
        });
        const savedThought = await thoughtRes.json();
        
        // Create card
        const cardPayload = {
          type: node.type,
          data_id: savedThought.id,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
        const cardRes = await fetch(`${API_URL}/cards/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(cardPayload),
        });
        const savedCard = await cardRes.json();
        
        // Upload pending files if any
        let finalFiles = Array.isArray(node.data.files) ? node.data.files : [];
        if (node.data.pendingFiles && Array.isArray(node.data.pendingFiles)) {
          try {
            await uploadFilesForCardType(
              "thought",
              savedThought.id,
              node.data.pendingFiles,
              [], // Start with empty array since we're uploading to a new record
              (newFiles, newFileEntries) => {
                finalFiles = newFiles;
              }
            );
          } catch (err) {
            console.error("Failed to upload pending files:", err);
          }
        }
        
        // Update node with saved data
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                  data: { 
                    ...n.data, 
                    thoughtId: savedThought.id,
                    files: finalFiles,
                    pendingFiles: undefined, // Clear pending files
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
      } else if (node.type === "claim") {
        // Create claim
        const claimPayload = {
          project_id: projectId,
          claim_text: node.data.claim || "",
          files: Array.isArray(node.data.files) ? node.data.files.join(',') : "",
        };
        const claimRes = await fetch(`${API_URL}/claims/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(claimPayload),
        });
        const savedClaim = await claimRes.json();
        
        // Create card
        const cardPayload = {
          type: node.type,
          data_id: savedClaim.id,
          position_x: node.position.x,
          position_y: node.position.y,
          project_id: projectId,
        };
        const cardRes = await fetch(`${API_URL}/cards/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(cardPayload),
        });
        const savedCard = await cardRes.json();
        
        // Upload pending files if any
        let finalFiles = Array.isArray(node.data.files) ? node.data.files : [];
        if (node.data.pendingFiles && Array.isArray(node.data.pendingFiles)) {
          try {
            await uploadFilesForCardType(
              "claim",
              savedClaim.id,
              node.data.pendingFiles,
              [], // Start with empty array since we're uploading to a new record
              (newFiles, newFileEntries) => {
                finalFiles = newFiles;
              }
            );
          } catch (err) {
            console.error("Failed to upload pending files:", err);
          }
        }
        
        // Update node with saved data
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                  data: { 
                    ...n.data, 
                    claimId: savedClaim.id,
                    files: finalFiles,
                    pendingFiles: undefined, // Clear pending files
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
      }
      
    } catch (err) {
      console.error("Failed to save card:", err);
      alert("Failed to save card: " + (err as Error).message);
    }
  }, [nodes, projectId]);

  // Helper function to detect if a card is unsaved
  const isCardUnsaved = useCallback((cardId: string) => {
    const node = nodes.find(n => n.id === cardId);
    if (!node) return false;
    // Check if ID is a UUID (unsaved cards have UUIDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);
    // Check if data IDs are missing (null or undefined)
    const hasMissingDataIds = 
      (node.type === "source" && !node.data.sourceMaterialId) ||
      (node.type === "question" && !node.data.questionId) ||
      (node.type === "insight" && !node.data.insightId) ||
      (node.type === "thought" && !node.data.thoughtId) ||
      (node.type === "claim" && !node.data.claimId);
    return isUUID || hasMissingDataIds;
  }, [nodes]);

  // When closing the panel, clear chatActiveCardId if it matches
  const handleClosePanel = () => {
    if (openCard) {
      const isUnsaved = isCardUnsaved(openCard.id);
      
      // If the card is unsaved (even during chat mode), delete it
      if (isUnsaved) {
        handleDeleteCard(openCard.id);
      } else {
        // If it's a saved card, just close the panel
        if (openCard.id === chatActiveCardId) setChatActiveCardId(null);
        setOpenCard(null);
      }
    }
  };

  // Update node data when side panel saves changes
  const handleUpdateNodeData = (cardId: string, newData: any) => {
    
    setNodes((nds) => {
      const node = nds.find(n => n.id === cardId);
      if (!node) {
        return nds;
      }
      
      // If newData contains a cardId, update the node ID to match the database card ID
      const shouldUpdateNodeId = newData.cardId && newData.cardId.toString() !== cardId;
      
      if (shouldUpdateNodeId) {
        // Remove the old node and add the new one with the updated ID
        const filteredNodes = nds.filter(n => n.id !== cardId);
        const updatedNode = {
          ...node,
          id: newData.cardId.toString(),
          data: { 
            ...node.data, 
            ...newData,
            // Preserve critical ID fields that might not be in newData
            sourceMaterialId: node.data.sourceMaterialId || newData.sourceMaterialId,
            projectId: node.data.projectId,
            citationId: node.data.citationId || newData.citationId,
            questionId: node.data.questionId || newData.questionId,
            insightId: node.data.insightId || newData.insightId,
            thoughtId: node.data.thoughtId || newData.thoughtId,
            claimId: node.data.claimId || newData.claimId,
                  } 
      };
      
      const result = [...filteredNodes, updatedNode];
        return result;
      } else {
        // Just update the data without changing the ID
        const updated = nds.map((n) => {
          if (n.id === cardId) {
            return {
              ...n,
              data: { 
                ...n.data, 
                ...newData,
                // Preserve critical ID fields that might not be in newData
                sourceMaterialId: n.data.sourceMaterialId || newData.sourceMaterialId,
                projectId: n.data.projectId,
                citationId: n.data.citationId || newData.citationId,
                questionId: n.data.questionId || newData.questionId,
                insightId: n.data.insightId || newData.insightId,
                thoughtId: n.data.thoughtId || newData.thoughtId,
                claimId: n.data.claimId || newData.claimId,
              } 
            };
          }
          return n;
        });
        return updated;
      }
    });
    
    // If we updated the node ID, also update the openCard reference
    if (newData.cardId && openCard && openCard.id === cardId) {
      setOpenCard({ id: newData.cardId.toString(), type: openCard.type });
    }
  };

  // Listen for events to open cards from linked cards tab
  useEffect(() => {
    const handleOpenCardEvent = (event: CustomEvent) => {
      const { id, type } = event.detail;
      setOpenCard({ id, type });
    };

    window.addEventListener('openCard', handleOpenCardEvent as EventListener);
    
    return () => {
      window.removeEventListener('openCard', handleOpenCardEvent as EventListener);
    };
  }, []);

  // Listen for card list clicks from ProjectNav
  useEffect(() => {
    const handleCardListClick = (event: CustomEvent) => {
      const { cardId, cardType } = event.detail;
      handleCardClick(cardId, cardType);
    };

    window.addEventListener('cardListClick', handleCardListClick as EventListener);
    
    return () => {
      window.removeEventListener('cardListClick', handleCardListClick as EventListener);
    };
  }, [handleCardClick]);

  // Listen for delete card events from SourceListPanel
  useEffect(() => {
    const handleDeleteCardEvent = (event: CustomEvent) => {
      const { cardId } = event.detail;
      handleDeleteCard(cardId);
    };

    window.addEventListener('deleteCard', handleDeleteCardEvent as EventListener);
    
    return () => {
      window.removeEventListener('deleteCard', handleDeleteCardEvent as EventListener);
    };
  }, [handleDeleteCard]);

  // Dispatch nodes updates to ProjectNav
  useEffect(() => {
    const event = new CustomEvent('nodesUpdate', {
      detail: { nodes }
    });
    window.dispatchEvent(event);
  }, [nodes]);

  // Helper to get filename from a file URL
  function getFileNameFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
  const viewerFileName = getFileNameFromUrl(viewerFile);
  const viewerNode = viewerFileName ? nodes.find(n => {
    // Check both files array and fileEntries array
    const filesMatch = Array.isArray(n.data.files) && n.data.files.some((f: string) => getFileNameFromUrl(f) === viewerFileName);
    const fileEntriesMatch = Array.isArray(n.data.fileEntries) && n.data.fileEntries.some((entry: any) => getFileNameFromUrl(entry.url) === viewerFileName);
    return filesMatch || fileEntriesMatch;
  }) : undefined;
  return (
    <div 
      style={{ 
        width: "100vw", 
        height: "100vh", 
        position: "relative"
      }}
      onClick={(evt) => {
        if (placingNodeType) {
          onPaneClick(evt);
        }
      }}
    >
      {/* Fullscreen File Viewer Overlay */}
      <FullscreenFileViewer 
        open={viewerOpen} 
        fileUrl={viewerFile} 
        fileType={viewerType} 
        onClose={() => setViewerOpen(false)}
        cardType={viewerNode?.type || "questions"}
        cardNode={viewerNode}
        onUpdateCard={handleUpdateNodeData}
      />
      

      <ReactFlow
        nodes={nodesWithOpen}
        edges={edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        nodesDraggable={true}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={(deleted) => {
          deleted.forEach((node) => {
            handleDeleteCard(node.id);
          });
        }}
        isValidConnection={isValidConnection}
        connectOnClick={true}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={false}
        snapGrid={[15, 15]}
        onPaneMouseMove={onPaneMouseMove}
        onPaneClick={(evt) => {
          // If clicking on the pane (not on a node), deselect any selected card
          if (evt.target === evt.currentTarget) {
            setSelectedCardId(null);
          }
          onPaneClick(evt);
        }}
        minZoom={0.05}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {/* Side Panel */}
      <SidePanelBase
        openCard={openCard}
        nodes={nodes}
        edges={edges}
        guided={guided}
        chatActiveCardId={chatActiveCardId}
        onClose={handleClosePanel}
        sourceTab={sourceTab}
        onSourceTabChange={setSourceTab}
        questionTab={questionTab}
        onQuestionTabChange={setQuestionTab}
        insightTab={insightTab}
        onInsightTabChange={setInsightTab}
        thoughtTab={thoughtTab}
        onThoughtTabChange={setThoughtTab}
        claimTab={claimTab}
        onClaimTabChange={setClaimTab}
        onSaveCard={handleSaveCard}
        onUpdateNodeData={handleUpdateNodeData}
        onEdgesChange={onEdgesChange}
        onAddCard={handleAddCard}
        onDeleteCard={handleDeleteCard}
        projectId={projectId}
        onFileClick={handleSidePanelFileClick}
      />
      <BottomNav 
        onAddClaim={startPlacingClaim}
        onAddSourceMaterial={startPlacingSource}
        onAddQuestion={startPlacingQuestion}
        onAddInsight={startPlacingInsight}
        onAddThought={startPlacingThought}
        guided={guided}
        onGuidedChange={setGuided}
        guidedLoading={guidedLoading}
        guidedError={guidedError}
      />
    </div>
  );
} 