import React, { useState, useMemo, useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { LuX, LuFilter, LuPencil, LuTrash2, LuExternalLink } from "react-icons/lu";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Combobox, useCustomOptions } from "./ui/combobox";
import SourceMaterialCard from "./canvas-cards/SourceMaterialCard";
import { TextWithLinks } from "./ui/text-with-links";

interface Citation {
  id: number;
  text: string;
  credibility: string | null;
  project_id: number;
}

interface SourceMaterial {
  id: number;
  citation_id: number | null;
  project_id: number;
  content: string | null;
  summary: string | null;
  tags: string[] | null;
  argument_type: string | null;
  function: string | null;
  files: string | null;
  notes: string | null;
}

interface SourceListPanelProps {
  projectId: number;
  onClose: () => void;
  onSourceCardClick: (cardId: string, cardType: string) => void;
  nodes: any[]; // Add nodes prop to find correct card IDs
}

export default function SourceListPanel({ projectId, onClose, onSourceCardClick, nodes }: SourceListPanelProps) {
  // State for citations and source materials
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sourceMaterials, setSourceMaterials] = useState<SourceMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom options hook for credibility
  const sourceCredibilityOptions = useCustomOptions("sourceCredibility");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCredibilities, setSelectedCredibilities] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>("any");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [deletingTags, setDeletingTags] = useState<Set<string>>(new Set());

  // Edit state
  const [editingCitation, setEditingCitation] = useState<Citation | null>(null);
  const [editText, setEditText] = useState("");
  const [editCredibility, setEditCredibility] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [citationToDelete, setCitationToDelete] = useState<Citation | null>(null);
  const [deleteMode, setDeleteMode] = useState<'citation_only' | 'citation_and_sources'>('citation_only');

  // Add citation state
  const [showAddCitationModal, setShowAddCitationModal] = useState(false);
  const [newCitationText, setNewCitationText] = useState("");
  const [newCitationCredibility, setNewCitationCredibility] = useState("");
  const [isCreatingCitation, setIsCreatingCitation] = useState(false);

  // Load citations and source materials
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load citations for this project
        const citationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/citations/?project_id=${projectId}`);
        if (!citationsRes.ok) throw new Error("Failed to load citations");
        const citationsData = await citationsRes.json();
        setCitations(citationsData);

        // Load source materials for this project
        const sourceMaterialsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/source_materials/?project_id=${projectId}`);
        if (!sourceMaterialsRes.ok) throw new Error("Failed to load source materials");
        const sourceMaterialsData = await sourceMaterialsRes.json();
        setSourceMaterials(sourceMaterialsData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Listen for citation and source material updates to refresh the list
  useEffect(() => {
    const handleDataUpdate = (event: Event) => {
      console.log('SourceListPanel: Received event:', event.type);
      // Refresh the data when citations or source materials are updated
      const loadData = async () => {
        try {
          setLoading(true);
          setError(null);
          // Load citations for this project
          const citationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/citations/?project_id=${projectId}`);
          if (!citationsRes.ok) throw new Error("Failed to load citations");
          const citationsData = await citationsRes.json();
          setCitations(citationsData);

          // Load source materials for this project
          const sourceMaterialsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/source_materials/?project_id=${projectId}`);
          if (!sourceMaterialsRes.ok) throw new Error("Failed to load source materials");
          const sourceMaterialsData = await sourceMaterialsRes.json();
          setSourceMaterials(sourceMaterialsData);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    };

    // Listen for citation and source material update events
    window.addEventListener('citationUpdate', handleDataUpdate);
    window.addEventListener('sourceMaterialUpdate', handleDataUpdate);
    
    return () => {
      window.removeEventListener('citationUpdate', handleDataUpdate);
      window.removeEventListener('sourceMaterialUpdate', handleDataUpdate);
    };
  }, [projectId]);

  // Check for pending updates when component mounts
  useEffect(() => {
    // Check if there were any recent updates that we missed
    const checkForUpdates = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load citations for this project
        const citationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/citations/?project_id=${projectId}`);
        if (!citationsRes.ok) throw new Error("Failed to load citations");
        const citationsData = await citationsRes.json();
        setCitations(citationsData);

        // Load source materials for this project
        const sourceMaterialsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/source_materials/?project_id=${projectId}`);
        if (!sourceMaterialsRes.ok) throw new Error("Failed to load source materials");
        const sourceMaterialsData = await sourceMaterialsRes.json();
        setSourceMaterials(sourceMaterialsData);
        console.log('SourceListPanel: Initial load, source materials count:', sourceMaterialsData.length);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    checkForUpdates();
  }, [projectId]);

  // Gather all unique tags and credibilities from source materials
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sourceMaterials.forEach(sm => {
      if (Array.isArray(sm.tags)) {
        sm.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [sourceMaterials]);

  const allCredibilities = useMemo(() => {
    const credSet = new Set<string>();
    citations.forEach(citation => {
      if (citation.credibility) {
        credSet.add(citation.credibility);
      }
    });
    return Array.from(credSet).sort();
  }, [citations]);

  // Get source materials for a citation
  const getSourceMaterialsForCitation = (citationId: number) => {
    return sourceMaterials.filter(sm => sm.citation_id === citationId);
  };

  // Get source materials without citations
  const getUncitedSourceMaterials = () => {
    return sourceMaterials.filter(sm => sm.citation_id === null);
  };

  // Get searchable text for a citation
  const getSearchableText = (citation: Citation) => {
    const sourceMaterialsForCitation = getSourceMaterialsForCitation(citation.id);
    const tags = sourceMaterialsForCitation
      .flatMap(sm => sm.tags || [])
      .join(", ");
    const credibility = citation.credibility || "";
    return `${citation.text} ${tags} ${credibility}`.toLowerCase();
  };

  // Get searchable text for an uncited source material
  const getSearchableTextForUncited = (sourceMaterial: SourceMaterial) => {
    const tags = (sourceMaterial.tags || []).join(", ");
    const content = sourceMaterial.content || "";
    const summary = sourceMaterial.summary || "";
    return `${content} ${summary} ${tags}`.toLowerCase();
  };

  // Filter citations by search term and filters
  const filteredCitations = useMemo(() => {
    let filtered = citations;

    // Filter by search term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(citation => getSearchableText(citation).includes(lower));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(citation => {
        const sourceMaterialsForCitation = getSourceMaterialsForCitation(citation.id);
        const citationTags = sourceMaterialsForCitation.flatMap(sm => sm.tags || []);
        
        if (tagFilterMode === "any") {
          return citationTags.some(tag => selectedTags.includes(tag));
        } else {
          return selectedTags.every(tag => citationTags.includes(tag));
        }
      });
    }

    // Filter by credibility
    if (selectedCredibilities.length > 0) {
      filtered = filtered.filter(citation => 
        citation.credibility && selectedCredibilities.includes(citation.credibility)
      );
    }

    return filtered;
  }, [citations, searchTerm, selectedTags, selectedCredibilities, tagFilterMode, sourceMaterials]);

  // Filter uncited source materials by search term and filters
  const filteredUncitedSourceMaterials = useMemo(() => {
    let filtered = getUncitedSourceMaterials();

    // Filter by search term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(sm => getSearchableTextForUncited(sm).includes(lower));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(sm => {
        const smTags = sm.tags || [];
        
        if (tagFilterMode === "any") {
          return smTags.some(tag => selectedTags.includes(tag));
        } else {
          return selectedTags.every(tag => smTags.includes(tag));
        }
      });
    }

    // Note: Uncited source materials don't have credibility, so we skip that filter

    return filtered;
  }, [sourceMaterials, searchTerm, selectedTags, tagFilterMode]);

  // Handle tag deletion with animation
  const handleRemoveTag = (tagToRemove: string) => {
    setDeletingTags(prev => new Set(prev).add(tagToRemove));
    
    setTimeout(() => {
      setSelectedTags(sel => sel.filter(t => t !== tagToRemove));
      setDeletingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagToRemove);
        return newSet;
      });
    }, 200);
  };

  // Handle citation editing
  const handleEditCitation = (citation: Citation) => {
    setEditingCitation(citation);
    setEditText(citation.text);
    setEditCredibility(citation.credibility || "none");
  };

  const handleSaveCitation = async () => {
    if (!editingCitation) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_URL}/citations/${editingCitation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          text: editText,
          credibility: editCredibility === "none" ? null : editCredibility,
          project_id: projectId,
        }),
      });

      if (!response.ok) throw new Error("Failed to update citation");

      const updatedCitation = await response.json();
      
      // Update local state
      setCitations(prev => prev.map(c => 
        c.id === editingCitation.id ? updatedCitation : c
      ));

      // Dispatch citation update event to refresh source list
      window.dispatchEvent(new CustomEvent('citationUpdate'));

      setEditingCitation(null);
      setEditText("");
      setEditCredibility("none");
    } catch (err) {
      alert("Failed to update citation: " + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle citation deletion
  const handleDeleteCitation = (citation: Citation) => {
    setCitationToDelete(citation);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCitation = async () => {
    if (!citationToDelete) return;

    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      if (deleteMode === 'citation_and_sources') {
        // Delete all associated source materials and their cards
        const sourceMaterialsToDelete = getSourceMaterialsForCitation(citationToDelete.id);
        for (const sm of sourceMaterialsToDelete) {
          // Find the corresponding card
          const cardNode = nodes.find(node => 
            node.type === "source" && 
            node.data?.sourceMaterialId === sm.id
          );
          
          if (cardNode) {
            // Delete the card (this will also delete the source material)
            await fetch(`${API_URL}/cards/${cardNode.id}`, {
              method: "DELETE",
              headers: {
                Authorization: token ? `Bearer ${token}` : "",
              },
            });
          } else {
            // Fallback: delete just the source material if no card found
          await fetch(`${API_URL}/source_materials/${sm.id}`, {
            method: "DELETE",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
          }
        }
      }

      // Delete the citation
      const response = await fetch(`${API_URL}/citations/${citationToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) throw new Error("Failed to delete citation");

      // Update local state
      setCitations(prev => prev.filter(c => c.id !== citationToDelete.id));
      if (deleteMode === 'citation_and_sources') {
        const sourceMaterialsToDelete = getSourceMaterialsForCitation(citationToDelete.id);
        setSourceMaterials(prev => prev.filter(sm => !sourceMaterialsToDelete.some(smd => smd.id === sm.id)));
        
        // Dispatch event to notify Canvas to remove the deleted cards
        sourceMaterialsToDelete.forEach(sm => {
          const cardNode = nodes.find(node => 
            node.type === "source" && 
            node.data?.sourceMaterialId === sm.id
          );
          if (cardNode) {
            window.dispatchEvent(new CustomEvent('deleteCard', { 
              detail: { cardId: cardNode.id } 
            }));
          }
        });
      }

      // Dispatch citation update event to refresh source list
      window.dispatchEvent(new CustomEvent('citationUpdate'));

      setDeleteDialogOpen(false);
      setCitationToDelete(null);
    } catch (err) {
      alert("Failed to delete citation: " + (err as Error).message);
    }
  };

  // Handle source card badge click
  const handleSourceCardClick = (sourceMaterial: SourceMaterial) => {
    // Find the card node that corresponds to this source material
    const cardNode = nodes.find(node => 
      node.type === "source" && 
      node.data?.sourceMaterialId === sourceMaterial.id
    );
    
    if (cardNode) {
      onSourceCardClick(cardNode.id, "source");
    } else {
      console.warn(`Could not find card for source material ${sourceMaterial.id}`);
    }
  };

  // Handle creating new citation
  const handleCreateNewCitation = async () => {
    if (!newCitationText.trim()) return;
    
    setIsCreatingCitation(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/citations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          text: newCitationText.trim(),
          credibility: newCitationCredibility || null,
          project_id: projectId,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to create citation");
      
      const newCitation = await response.json();
      
      // Update local state
      setCitations(prev => [...prev, newCitation]);
      setShowAddCitationModal(false);
      setNewCitationText("");
      setNewCitationCredibility("");
      
      // Dispatch citation update event
      window.dispatchEvent(new CustomEvent('citationUpdate'));
    } catch (error) {
      console.error("Failed to create citation:", error);
      alert("Failed to create citation: " + (error as Error).message);
    } finally {
      setIsCreatingCitation(false);
    }
  };

  // Calculate active filter count
  const activeFilterCount = selectedTags.length + selectedCredibilities.length;

  if (loading) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Source List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX size={20} />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Source List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX size={20} />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (filteredCitations.length === 0 && filteredUncitedSourceMaterials.length === 0) {
    return (
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Source List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX size={20} />
          </Button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Input
              type="text"
              className="pr-8"
              placeholder="Search citations and sources..."
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
                <LuX size={16} />
              </Button>
            )}
          </div>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No citations or sources found</p>
            <p className="text-xs text-gray-400">Try a different search term</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed left-0 top-0 h-full w-86 bg-white shadow-lg border-r border-gray-200 z-[100] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Source List</h2>
          <div className="flex gap-2">
          
            <Button variant="ghost" size="sm" onClick={onClose}>
              <LuX size={20} />
            </Button>
          </div>
        </div>

        {/* Add Citation button */}
        <div className="px-4 my-3">
          <Button 
            onClick={() => setShowAddCitationModal(true)}
            className="w-full"
            variant="outline"
          >
            Add Citation
          </Button>
        </div>

        {/* Search and filter bar */}
        <div className="px-4 pb-0 mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              className="pr-8"
              placeholder="Search citations, sources, or tags"
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
                <LuX size={16} />
              </Button>
            )}
          </div>
          
          {/* Filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" aria-label="Filter by tags and credibility">
                <LuFilter size={20} />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full" variant="default">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-78 shadow-xl">
              <div className="max-h-180 overflow-y-auto space-y-1">
                <label className="text-md font-semibold text-foreground">Tags</label>
                {allTags.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-14 mb-3">
                      <ToggleGroup type="single" value={tagFilterMode} onValueChange={val => val && setTagFilterMode(val as 'any' | 'all')} className="w-full">
                        <ToggleGroupItem value="any" aria-label="Match any" className="flex-1">Match Any</ToggleGroupItem>
                        <ToggleGroupItem value="all" aria-label="Match all" className="flex-1">Match All</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="max-h-80 overflow-y-scroll scroll-container">
                      {allTags.map(tag => (
                        <label key={tag} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            onChange={e => {
                              setSelectedTags(sel =>
                                e.target.checked ? [...sel, tag] : sel.filter(t => t !== tag)
                              );
                            }}
                            className="accent-primary"
                          />
                          <span className="text-md">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 my-2">No tags available</div>
                )}

                {/* Credibility filter */}
                <div className="flex items-center justify-between mt-6 mb-4">
                  <label className="text-md font-semibold text-foreground block">Credibility</label>
                </div>
                <div className="max-h-80 overflow-y-scroll scroll-container">
                  {allCredibilities.map(credibility => (
                    <label key={credibility} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={selectedCredibilities.includes(credibility)}
                        onChange={e => {
                          setSelectedCredibilities(sel =>
                            e.target.checked ? [...sel, credibility] : sel.filter(c => c !== credibility)
                          );
                        }}
                        className="accent-primary"
                      />
                      <span className="text-md">{credibility}</span>
                    </label>
                  ))}
                </div>

                {/* Clear all filters */}
                {(selectedTags.length > 0 || selectedCredibilities.length > 0) && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTags([]);
                        setSelectedCredibilities([]);
                      }}
                      className="w-full"
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Selected filters as chips */}
        {(selectedTags.length > 0 || selectedCredibilities.length > 0) && (
          <div className="px-4 pt-2 pb-0 flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <Badge 
                key={tag} 
                variant="outline" 
                className={`flex items-center gap-1 px-2 py-2 rounded-full transition-all duration-200 ease-in-out ${
                  deletingTags.has(tag) 
                    ? "opacity-0 scale-75 transform" 
                    : "opacity-100 scale-100"
                }`}
              >
                {tag}
                <button
                  type="button"
                  className="ml-1 text-gray-400 hover:text-gray-700 focus:outline-none hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  <LuX size={14} />
                </button>
              </Badge>
            ))}
            {selectedCredibilities.map(credibility => (
              <Badge 
                key={credibility} 
                variant="outline" 
                className={`flex items-center gap-1 px-2 py-2 rounded-full transition-all duration-200 ease-in-out ${
                  deletingTags.has(credibility) 
                    ? "opacity-0 scale-75 transform" 
                    : "opacity-100 scale-100"
                }`}
              >
                {credibility}
                <button
                  type="button"
                  className="ml-1 text-gray-400 hover:text-gray-700 focus:outline-none hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => {
                    setSelectedCredibilities(sel => sel.filter(c => c !== credibility));
                  }}
                  aria-label={`Remove credibility ${credibility}`}
                >
                  <LuX size={14} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Citation list */}
        <div className="p-4 pt-2 space-y-4">
          {filteredCitations.map((citation) => {
            const sourceMaterialsForCitation = getSourceMaterialsForCitation(citation.id);
            const allTags = sourceMaterialsForCitation.flatMap(sm => sm.tags || []);
            const uniqueTags = [...new Set(allTags)];

            return (
              <div key={citation.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                {/* Citation text */}
                <div>
                  {citation.credibility && (
                    <p className="text-sm font-medium text-foreground mb-2">{citation.credibility}</p>
                    )}
                  <div className="text-sm text-gray-900 mb-2">
                    <TextWithLinks text={citation.text} />
                  </div>
                 
                </div>

                {/* Tags */}
                {uniqueTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {uniqueTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Linked source cards */}
                {sourceMaterialsForCitation.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Associated Source Cards:</p>
                    <div className="space-y-2">
                      {sourceMaterialsForCitation.map(sm => (
                        <Badge
                          key={sm.id}
                          variant="outline"
                          className="w-full border-source-300 text-sm text-source-700 cursor-pointer hover:bg-gray-100 py-1 px-3 justify-start"
                          onClick={() => handleSourceCardClick(sm)}
                        >
                          {sm.function || "Source"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit and Delete buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCitation(citation)}
                    className="h-8 w-8 p-0"
                  >
                    <LuPencil size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    danger
                    onClick={() => handleDeleteCitation(citation)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <LuTrash2 size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Uncited source materials section */}
        {filteredUncitedSourceMaterials.length > 0 && (
          <div className="p-4 pt-0 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 border-t pt-4">
              Uncited Sources ({filteredUncitedSourceMaterials.length})
            </h3>
            <div className="space-y-3">
              {filteredUncitedSourceMaterials.map((sourceMaterial) => {
                // Find the corresponding card node
                const cardNode = nodes.find(node => 
                  node.type === "source" && 
                  node.data?.sourceMaterialId === sourceMaterial.id
                );
                
                if (!cardNode) {
                  // Fallback to simple display if card not found
                  const tags = sourceMaterial.tags || [];
                  return (
                    <div key={sourceMaterial.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {sourceMaterial.content || sourceMaterial.summary || "No content"}
                          </p>
                          {sourceMaterial.function && (
                            <p className="text-xs text-gray-600">Function: {sourceMaterial.function}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSourceCardClick(sourceMaterial)}
                            className="p-1 h-8 w-8"
                          >
                            <LuExternalLink size={16} />
                          </Button>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Create props for the SourceMaterialCard component
                const cardProps = {
                  id: cardNode.id,
                  data: {
                    ...cardNode.data,
                    onOpen: () => {
                      onSourceCardClick(cardNode.id, "source");
                    },
                    onFileClick: undefined // Disable file clicking in the panel
                  }
                };
                
                return (
                  <div 
                    key={sourceMaterial.id} 
                    className="relative cursor-pointer hover:shadow-lg transition-shadow rounded-xl w-full"
                    onClick={() => onSourceCardClick(cardNode.id, "source")}
                  >
                    {/* Import and render SourceMaterialCard */}
                    <SourceMaterialCard {...cardProps} showHandles={false} width="w-full" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Citation Modal */}
      <Dialog open={showAddCitationModal} onOpenChange={setShowAddCitationModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Add New Citation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="new-citation-text" className="block text-sm font-medium text-gray-700 mb-1">Citation Text</Label>
              <Textarea
                id="new-citation-text"
                placeholder="Author, Title, Publication, Date, URL, DOI..."
                rows={3}
                value={newCitationText}
                onChange={(e) => setNewCitationText(e.target.value)}
                className="resize-none"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
            </div>
            <div>
              <Label htmlFor="new-citation-credibility" className="block text-sm font-medium text-gray-700 mb-1">Credibility</Label>
              <Combobox
                options={[
                  { value: "Peer-reviewed study", label: "Peer-reviewed study" },
                  { value: "News article (reputable)", label: "News article (reputable)" },
                  { value: "News article (biased)", label: "News article (biased)" },
                  { value: "Expert opinion", label: "Expert opinion" },
                  { value: "Institutional report", label: "Institutional report" },
                  { value: "Personal experience", label: "Personal experience" },
                  { value: "Blog or opinion piece", label: "Blog or opinion piece" },
                  { value: "Speculative claim", label: "Speculative claim" },
                  { value: "Social media post", label: "Social media post" },
                  { value: "Unclear origin", label: "Unclear origin" },
                  ...((sourceCredibilityOptions?.options as { value: string; label: string }[]) || []).filter(
                    (o: { value: string; label: string }) => ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(o.value)
                  ),
                ]}
                value={newCitationCredibility || ""}
                onChange={async (value) => {
                  setNewCitationCredibility(value);
                  // If it's a new custom option, persist it
                  if (
                    value &&
                    ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(value) &&
                    sourceCredibilityOptions?.options &&
                    !sourceCredibilityOptions.options.some(o => o.value === value)
                  ) {
                    await sourceCredibilityOptions.addOption(value);
                  }
                }}
                placeholder="Select or type credibility level..."
                allowCustom={true}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowAddCitationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewCitation} disabled={isCreatingCitation || !newCitationText.trim()}>
              {isCreatingCitation ? "Creating..." : "Create Citation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit citation dialog */}
      <Dialog open={!!editingCitation} onOpenChange={(open) => !open && setEditingCitation(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Citation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="edit-citation-text" className="block text-sm font-medium text-gray-700 mb-1">Citation Text</Label>
              <Textarea
                id="edit-citation-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full resize-none"
                placeholder="Author, Title, Publication, Date, URL, DOI..."
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
            </div>

            <div>
              <Label htmlFor="edit-citation-credibility" className="block text-sm font-medium text-gray-700 mb-1">Credibility</Label>
              <Combobox
                options={[
                  { value: "Peer-reviewed study", label: "Peer-reviewed study" },
                  { value: "News article (reputable)", label: "News article (reputable)" },
                  { value: "News article (biased)", label: "News article (biased)" },
                  { value: "Expert opinion", label: "Expert opinion" },
                  { value: "Institutional report", label: "Institutional report" },
                  { value: "Personal experience", label: "Personal experience" },
                  { value: "Blog or opinion piece", label: "Blog or opinion piece" },
                  { value: "Speculative claim", label: "Speculative claim" },
                  { value: "Social media post", label: "Social media post" },
                  { value: "Unclear origin", label: "Unclear origin" },
                  ...(sourceCredibilityOptions?.options || []).filter(
                    (o: { value: string; label: string }) => ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(o.value)
                  ),
                ]}
                value={editCredibility === "none" ? "" : editCredibility}
                onChange={async (value) => {
                  setEditCredibility(value || "none");
                  // If it's a new custom option, persist it
                  if (
                    value &&
                    ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(value) &&
                    sourceCredibilityOptions?.options &&
                    !sourceCredibilityOptions.options.some(o => o.value === value)
                  ) {
                    await sourceCredibilityOptions.addOption(value);
                  }
                }}
                placeholder="Select or type credibility level..."
                allowCustom={true}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setEditingCitation(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCitation} disabled={isSaving || !editText.trim()}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Delete Citation?</DialogTitle>
            <DialogDescription>
              This citation is linked to {citationToDelete ? getSourceMaterialsForCitation(citationToDelete.id).length : 0} source cards.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="citation_only"
                name="delete_mode"
                value="citation_only"
                checked={deleteMode === 'citation_only'}
                onChange={(e) => setDeleteMode(e.target.value as 'citation_only' | 'citation_and_sources')}
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label htmlFor="citation_only" className="text-sm font-medium text-gray-700">
                Delete citation only
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="citation_and_sources"
                name="delete_mode"
                value="citation_and_sources"
                checked={deleteMode === 'citation_and_sources'}
                onChange={(e) => setDeleteMode(e.target.value as 'citation_only' | 'citation_and_sources')}
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
              />
              <label htmlFor="citation_and_sources" className="text-sm font-medium text-gray-700">
                Delete citation and all associated source cards ({citationToDelete ? getSourceMaterialsForCitation(citationToDelete.id).length : 0})
              </label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCitation}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 