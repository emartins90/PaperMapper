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
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";

import QuestionCard from "../components/QuestionCard";
import SourceMaterialCard from "../components/SourceMaterialCard";
import InsightCard from "../components/InsightCard";
import ThoughtCard from "../components/ThoughtCard";
import BottomNav from "@/components/BottomNav";
import SidePanel from "../components/SidePanel";
import { FullscreenFileViewer } from "./FullscreenFileViewer";
import { uploadFilesForCardType, CardType } from "../components/useFileUploadHandler";

// Ghost node component
const GhostNode = ({ data }: { data: { type: "source" | "question" | "insight" | "thought" } }) => {
  const getGhostClasses = (nodeType: "source" | "question" | "insight" | "thought") => {
    const baseClasses = "w-48 h-25 opacity-70 rounded-xl flex items-center justify-center text-xs font-bold pointer-events-none bg-white/80";
    
    const typeClasses = {
      source: "border-2 border-dashed border-blue-400 text-blue-400", // Blue
      question: "border-2 border-dashed border-orange-400 text-orange-400", // Orange
      insight: "border-2 border-dashed border-purple-400 text-purple-400", // Purple
      thought: "border-2 border-dashed border-teal-400 text-teal-400", // Teal
    };

    return `${baseClasses} ${typeClasses[nodeType]}`;
  };

  const getGhostText = (nodeType: "source" | "question" | "insight" | "thought") => {
    const texts = {
      source: "Source Material",
      question: "Question",
      insight: "Insight",
      thought: "Thought",
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
  ghost: GhostNode,
};

export default function CanvasInner({ projectId }: CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  const { screenToFlowPosition } = useReactFlow();

  // State for placing mode
  const [placingNodeType, setPlacingNodeType] = useState<null | "source" | "question" | "insight" | "thought">(null);
  const [ghostNodeId] = useState(() => `ghost-${crypto.randomUUID()}`);

  // State for open card
  const [openCard, setOpenCard] = useState<{ id: string; type: string } | null>(null);
  // State for drawer tabs (per card type)
  const [sourceTab, setSourceTab] = useState("info");
  const [questionTab, setQuestionTab] = useState("info");

  // Guided experience state (from BottomNav, but for now, local state for demo)
  const [guided, setGuided] = useState(true);

  // Track which card (if any) is in chat mode
  const [chatActiveCardId, setChatActiveCardId] = useState<string | null>(null);

  // Add timeout ref for position saving
  const positionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen file viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'image' | 'pdf' | 'other'>('image');

  // Load cards from backend when projectId changes
  useEffect(() => {
    if (!projectId) return;
    
    const loadCards = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/cards/?project_id=${projectId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
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
                headers: {
                  Authorization: token ? `Bearer ${token}` : "",
                },
              });
              if (smRes.ok) {
                const sourceMaterial = await smRes.json();
                cardData = {
                  tags: sourceMaterial.tags ? sourceMaterial.tags.split(',').map((tag: string) => tag.trim()) : [],
                  text: sourceMaterial.content || "",
                  thesisSupport: sourceMaterial.argument_type || "",
                  source: sourceMaterial.source || sourceMaterial.citation || "",
                  credibility: sourceMaterial.credibility || "",
                  summary: sourceMaterial.summary,
                  sourceFunction: sourceMaterial.function,
                  additionalNotes: sourceMaterial.notes || "",
                  sourceMaterialId: sourceMaterial.id,
                  projectId: sourceMaterial.project_id,
                  citationId: sourceMaterial.citation_id,
                  files: sourceMaterial.files ? sourceMaterial.files.split(',').filter((url: string) => url.trim()) : [],
                };
              }
            } catch (err) {
              console.error("Failed to load source material:", err);
            }
          } else if (card.type === "question" && card.data_id) {
            // For question cards, load the question data
            try {
              const questionRes = await fetch(`${API_URL}/questions/${card.data_id}`, {
                headers: {
                  Authorization: token ? `Bearer ${token}` : "",
                },
              });
              if (questionRes.ok) {
                const question = await questionRes.json();
                cardData = {
                  question: question.question_text || "",
                  category: question.category || "",
                  status: question.status || "unexplored",
                  priority: question.priority || "",
                  questionId: question.id,
                  projectId: question.project_id,
                  files: question.files ? question.files.split(',').filter((url: string) => url.trim()) : [],
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
                headers: {
                  Authorization: token ? `Bearer ${token}` : "",
                },
              });
              if (insightRes.ok) {
                const insight = await insightRes.json();
                cardData = {
                  insight: insight.insight_text || "",
                  sourcesLinked: insight.sources_linked || "0 Sources Linked",
                  insightId: insight.id,
                  projectId: insight.project_id,
                  files: insight.files ? insight.files.split(',').filter((url: string) => url.trim()) : [],
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
                headers: {
                  Authorization: token ? `Bearer ${token}` : "",
                },
              });
              if (thoughtRes.ok) {
                const thought = await thoughtRes.json();
                cardData = {
                  thought: thought.thought_text || "",
                  thoughtId: thought.id,
                  projectId: thought.project_id,
                  files: thought.files ? thought.files.split(',').filter((url: string) => url.trim()) : [],
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
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (linksRes.ok) {
          const links = await linksRes.json();
          console.log('Loaded card links from backend:', links);
          const loadedEdges = links.map((link: any) => ({
            id: link.id.toString(),
            source: link.source_card_id.toString(),
            target: link.target_card_id.toString(),
            sourceHandle: link.source_handle,
            targetHandle: link.target_handle,
            type: 'default',
          }));
          console.log('Converted to ReactFlow edges:', loadedEdges);
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

  // Helper to inject onOpen and onFileClick into node data
  const nodesWithOpen = useMemo(() =>
    nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onOpen: () => handleOpenCard(node.id, node.type || ''),
        onFileClick: handleFileClick,
      },
    })),
    [nodes, handleOpenCard, handleFileClick]
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
            console.log('Skipping deletion of temporary edge:', change.id);
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
              console.log("Successfully deleted connection from backend:", change.id);
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
        console.log('Missing required params for connection:', { params, projectId });
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
    console.log("[handleSaveCard] called with:", { cardId, chatAnswers, uploadedFiles });
    console.log("[handleSaveCard] uploadedFiles parameter details:", { 
      isArray: Array.isArray(uploadedFiles), 
      length: uploadedFiles?.length, 
      type: typeof uploadedFiles,
      constructor: uploadedFiles?.constructor?.name 
    });
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log("[handleSaveCard] uploadedFiles elements:", uploadedFiles.map(f => ({ 
        name: f?.name, 
        size: f?.size, 
        type: f?.type,
        isFile: f instanceof File 
      })));
    }
    
    const node = nodes.find(n => n.id === cardId);
    if (!node || !projectId) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let backendId: number | undefined;
    let cardPayload: any = {};
    let updatedNodeData: any = {};
    let cardType: CardType = node.type as CardType;
    let files: string[] = [];
    console.log(`[handleSaveCard] node:`, node);
    console.log(`[handleSaveCard] cardType:`, cardType);

    try {
      const token = localStorage.getItem("token");
      // 1. Create or update the backend record for each card type
      if (cardType === "source") {
        let citationId = node.data.citationId; // Keep existing citationId if updating
        
        // Check if source already exists (has sourceMaterialId) or needs to be created
        if (node.data.sourceMaterialId) {
          // Update existing source material
          console.log("[SOURCE] Updating existing source material with ID:", node.data.sourceMaterialId);
          const sourceMaterialPayload = {
            content: chatAnswers.sourceContent,
            summary: chatAnswers.summary,
            tags: chatAnswers.topicalTags,
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
          console.log("[SOURCE] Updated existing source material, backendId:", backendId);
        } else {
          // Create new source material
          console.log("[SOURCE] Creating new source material");
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
          
          // Create source material
          const sourceMaterialPayload = {
            project_id: projectId,
            citation_id: savedCitation.id,
            content: chatAnswers.sourceContent,
            summary: chatAnswers.summary,
            tags: chatAnswers.topicalTags,
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
          console.log("[SOURCE] Created new source material, backendId:", backendId);
        }
        
        updatedNodeData = {
          ...node.data,
          ...chatAnswers,
          sourceMaterialId: backendId,
          citationId: citationId,
          tags: chatAnswers.topicalTags ? chatAnswers.topicalTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [],
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
          console.log("[QUESTION] Updating existing question with ID:", node.data.questionId);
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
          console.log("[QUESTION] Updated existing question, backendId:", backendId);
        } else {
          // Create new question
          console.log("[QUESTION] Creating new question");
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
          console.log("[QUESTION] Created new question, backendId:", backendId);
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
          console.log("[INSIGHT] Updating existing insight with ID:", node.data.insightId);
          const insightPayload = {
            insight_text: chatAnswers.insightText || "",
            sources_linked: node.data.sourcesLinked || "0 Sources Linked",
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
          console.log("[INSIGHT] Updated existing insight, backendId:", backendId);
        } else {
          // Create new insight
          console.log("[INSIGHT] Creating new insight");
          const insightPayload = {
            project_id: projectId,
            insight_text: chatAnswers.insightText || "",
            sources_linked: node.data.sourcesLinked || "0 Sources Linked",
            files: "",
          };
          console.log("[INSIGHT] insightPayload:", insightPayload);
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
          console.log("[INSIGHT] Created new insight, backendId:", backendId, "savedInsight:", savedInsight);
        }
        
        updatedNodeData = {
          ...node.data,
          insightId: backendId,
          insight: chatAnswers.insightText || "",
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
          console.log("[THOUGHT] Updating existing thought with ID:", node.data.thoughtId);
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
          console.log("[THOUGHT] Updated existing thought, backendId:", backendId);
        } else {
          // Create new thought
          console.log("[THOUGHT] Creating new thought");
          const thoughtPayload = {
            project_id: projectId,
            thought_text: chatAnswers.thoughtText || "",
            files: "",
          };
          console.log("[THOUGHT] thoughtPayload:", thoughtPayload);
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
          console.log("[THOUGHT] Created new thought, backendId:", backendId, "savedThought:", savedThought);
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
      }

      // 2. Upload files using the unified handler if any (AFTER backendId is available)
      console.log("[handleSaveCard] After backendId assignment, backendId:", backendId);
      console.log("[handleSaveCard] uploadedFiles before upload:", uploadedFiles, "backendId:", backendId, "cardType:", cardType);
      
      // For all card types, upload files to the backend record (newly created or existing)
      if (uploadedFiles && uploadedFiles.length > 0 && backendId) {
        console.log(`[handleSaveCard] [UPLOAD] Uploading files for ${cardType} to backend record ${backendId}:`, uploadedFiles.map(f => ({ name: f.name, type: f.type })));
        await uploadFilesForCardType(
          cardType,
          backendId,
          uploadedFiles,
          [], // always start with empty for new cards
          (newFiles: string[]) => {
            files = newFiles;
            console.log(`[handleSaveCard] [UPLOAD] Files uploaded for ${cardType}, backendId: ${backendId}, returned file URLs:`, newFiles);
          }
        );
        updatedNodeData.files = files;
        console.log("[handleSaveCard] [UPLOAD] Updated node data with files:", files);
      } else {
        // For other card types, check if files are in chatAnswers.files as a fallback
        let filesToUpload = uploadedFiles;
        let filesFromChatAnswers = false;
        if ((!uploadedFiles || uploadedFiles.length === 0) && chatAnswers.files && chatAnswers.files.length > 0) {
          console.log("[handleSaveCard] uploadedFiles is empty, but found files in chatAnswers.files:", chatAnswers.files);
          console.log("chatAnswers.files type check:", {
            isArray: Array.isArray(chatAnswers.files),
            length: chatAnswers.files.length,
            firstElement: chatAnswers.files[0],
            isFile: chatAnswers.files[0] instanceof File,
            constructor: chatAnswers.files[0]?.constructor?.name
          });
          
          // Check if chatAnswers.files contains URLs (strings) or File objects
          if (typeof chatAnswers.files[0] === 'string') {
            console.log("[handleSaveCard] chatAnswers.files contains URLs, using them directly");
            files = chatAnswers.files;
            updatedNodeData.files = files;
            filesFromChatAnswers = true;
          } else if (chatAnswers.files[0] instanceof File) {
            console.log("[handleSaveCard] chatAnswers.files contains File objects, uploading them");
            filesToUpload = chatAnswers.files;
          }
        }
        
        if (filesToUpload.length > 0 && backendId && !filesFromChatAnswers) {
          console.log(`[handleSaveCard] [UPLOAD] Uploading files for cardType: ${cardType}, backendId: ${backendId}, filesToUpload:`, filesToUpload.map(f => ({ name: f.name, type: f.type })));
          await uploadFilesForCardType(
            cardType,
            backendId,
            filesToUpload,
            [], // always start with empty for new cards
            (newFiles: string[]) => {
              files = newFiles;
              console.log(`[handleSaveCard] [UPLOAD] Files uploaded for cardType: ${cardType}, backendId: ${backendId}, returned file URLs:`, newFiles);
            }
          );
          updatedNodeData.files = files;
          console.log("[handleSaveCard] [UPLOAD] Updated node data with files:", files);
        } else if (!filesFromChatAnswers) {
          files = [];
          updatedNodeData.files = files;
          console.log("[handleSaveCard] [UPLOAD] No files to upload or no backendId");
        } else {
          console.log("[handleSaveCard] [UPLOAD] Using files from chatAnswers.files:", files);
        }
      }

      // 3. Create the card
      console.log("[handleSaveCard] About to create card with cardPayload:", cardPayload);
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
      console.log("[handleSaveCard] Card created, savedCard:", savedCard);
      setNodes((nds) => {
        const filtered = nds.filter(n => n.id !== cardId && n.id !== savedCard.id);
        const updatedNode = {
          ...node,
          id: savedCard.id.toString(),
          data: updatedNodeData,
        };
        console.log("[handleSaveCard] setNodes - filtered:", filtered, "updatedNode:", updatedNode);
        return [...filtered, updatedNode];
      });
      setOpenCard({ id: savedCard.id.toString(), type: node.type || "source" });
      if (cardType === "source") setSourceTab("content");
      if (cardType === "question") setQuestionTab("info");
      setChatActiveCardId(null);
    } catch (err) {
      alert("Failed to save card: " + (err as Error).message);
    }
  };

  // Handle deleting cards (both saved and unsaved)
  const handleDeleteCard = useCallback(async (cardId: string) => {
    const node = nodes.find(n => n.id === cardId);
    if (!node) return;
    
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
        }
      }
      
    } catch (err) {
      console.error("Failed to delete card data from backend:", err);
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
        
        // Create source material
        const sourceMaterialPayload = {
          project_id: projectId,
          citation_id: savedCitation.id,
          content: node.data.text || "",
          summary: node.data.summary || "",
          tags: Array.isArray(node.data.tags) ? node.data.tags.join(', ') : "",
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
                  } 
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
        
      } else if (node.type === "insight") {
        // Create card using existing insight data
        const cardPayload = {
          type: node.type,
          data_id: node.data.insightId,
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
        
        // Update node with saved card ID
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
                }
              : n
          )
        );
        
        // Update open card ID
        setOpenCard({ id: savedCard.id.toString(), type: node.type });
        
      } else if (node.type === "thought") {
        // Create card using existing thought data
        const cardPayload = {
          type: node.type,
          data_id: node.data.thoughtId,
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
        
        // Update node with saved card ID
        setNodes((nds) => 
          nds.map(n => 
            n.id === cardId 
              ? { 
                  ...n, 
                  id: savedCard.id.toString(),
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
      (node.type === "source" && (!node.data.sourceMaterialId || !node.data.citationId)) ||
      (node.type === "question" && !node.data.questionId) ||
      (node.type === "insight" && !node.data.insightId) ||
      (node.type === "thought" && !node.data.thoughtId);
    
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
    setNodes((nds) => 
      nds.map((node) => 
        node.id === cardId 
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                ...newData,
                // Preserve critical ID fields that might not be in newData
                sourceMaterialId: node.data.sourceMaterialId,
                projectId: node.data.projectId,
                citationId: node.data.citationId,
                questionId: node.data.questionId,
              } 
            }
          : node
      )
    );
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
      <FullscreenFileViewer open={viewerOpen} fileUrl={viewerFile} fileType={viewerType} onClose={() => setViewerOpen(false)} />
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
        onPaneClick={onPaneClick}
        minZoom={0.05}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {/* Side Panel */}
      <SidePanel
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
        onSaveCard={handleSaveCard}
        onUpdateNodeData={handleUpdateNodeData}
        onEdgesChange={onEdgesChange}
        onAddCard={handleAddCard}
        onDeleteCard={handleDeleteCard}
      />
      <BottomNav 
        onAddSourceMaterial={startPlacingSource}
        onAddQuestion={startPlacingQuestion}
        onAddInsight={startPlacingInsight}
        onAddThought={startPlacingThought}
        guided={guided}
        onGuidedChange={setGuided}
      />
    </div>
  );
} 