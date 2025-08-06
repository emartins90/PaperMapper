import React, { useEffect, useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { 
  LuSearch, 
  LuListFilter, 
  LuEllipsis, 
  LuArrowRight, 
  LuFileText, 
  LuPencil, 
  LuCircleCheck, 
  LuPlus, 
  LuTrash2, 
  LuUser,
  LuChevronUp,
  LuChevronDown,
  LuNotebookPen,
  LuX
} from "react-icons/lu";
import { 
  FaFilePdf, 
  FaFileWord, 
  FaFileAudio, 
  FaFile, 
  FaCircleCheck
} from "react-icons/fa6";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import AccountSettings from "./AccountSettings";
import { FullscreenFileViewer } from "./canvas-add-files/FullscreenFileViewer";
import FileChip from "./canvas-add-files/FileChip";
import ProjectInfoModal from "./ProjectInfoModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Badge } from "./ui/badge";
import ResourceSection, { sampleResources } from "./ResourceSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Project {
  id: number;
  name: string;
  class_subject?: string;
  paper_type?: string;
  due_date?: string;
  last_edited_date?: string;
  status?: string;
  assignment_file?: string;
  assignment_filename?: string;
}

interface ProjectFormData {
  name: string;
  class_subject: string;
  paper_type: string;
  due_date: string;
  assignment_file?: File;
}

export default function ProjectSelector({ token }: { token: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    class_subject: "",
    paper_type: "",
    due_date: "",
    assignment_file: undefined,
  });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'image' | 'pdf' | 'other' | 'audio'>('other');
  const [viewerCardNode, setViewerCardNode] = useState<any>(null);
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<'due_date' | 'last_edited' | 'name'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  

  
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter and sort projects
    const filtered = filterProjects(projects);
    const sorted = sortProjects(filtered);
    setFilteredProjects(sorted);
  }, [projects, searchTerm, sortBy, sortOrder, statusFilter]);

  async function fetchProjects() {
    setLoading(true);
    setError("");
    console.log("ProjectSelector - fetchProjects called with token:", token);
    console.log("ProjectSelector - API_URL:", API_URL);
    console.log("ProjectSelector - document.cookie:", document.cookie);
    
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("ProjectSelector - fetch response status:", res.status);
      console.log("ProjectSelector - fetch response headers:", res.headers);
      console.log("ProjectSelector - fetch response url:", res.url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log("ProjectSelector - fetch error response:", errorText);
        throw new Error("Failed to fetch projects");
      }
      const data = await res.json();
      console.log("ProjectSelector - fetch success, data:", data);
      setProjects(data);
    } catch (err: any) {
      console.log("ProjectSelector - fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setIsCreateDialogOpen(true);
  }

  async function handleStatusUpdate(projectId: number, status: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update project status");
      const updatedProject = await res.json();
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(project: Project) {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!projectToDelete) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/projects/${projectToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProjectToDelete(null);
    }
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  }

  function handleSelect(projectId: number) {
    router.push(`/project/${projectId}`);
  }



  function getDueDateColor(dueDate?: string, status?: string): string {
    if (status === "complete") return "border-gray-300 bg-gray-50";
    
    if (!dueDate) return "border-blue-300 bg-blue-50";
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "border-gray-300 bg-gray-50"; // Past due
    if (diffDays <= 7) return "border-red-300 bg-red-50"; // Very close
    if (diffDays <= 30) return "border-yellow-300 bg-yellow-50"; // Coming up
    return "border-blue-300 bg-blue-50"; // Normal
  }

  function hasUpcomingDueDate(dueDate?: string, status?: string): boolean {
    if (status === "complete") return false;
    if (!dueDate) return false;
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Return true if due date is within 7 days and not past due (same as red chip logic)
    return diffDays >= 0 && diffDays <= 7;
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  function getStatusText(status?: string): string {
    switch (status) {
      case "not_started": return "Not Started";
      case "in_progress": return "In Progress";
      case "ready_to_write": return "Ready to Write";
      case "complete": return "Complete";
      default: return "Not Started";
    }
  }

  // Helper to get file icon and color by file type
  function getFileIcon(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === "pdf") return { icon: <FaFilePdf className="text-red-500 w-4 h-4" />, color: "bg-red-100" };
    if (["doc", "docx"].includes(ext || "")) return { icon: <FaFileWord className="text-blue-700 w-4 h-4" />, color: "bg-blue-100" };
    if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) return { icon: <FaFileAudio className="text-purple-500 w-4 h-4" />, color: "bg-purple-100" };
    return { icon: <FaFile className="text-gray-500 w-4 h-4" />, color: "bg-gray-100" };
  }

  // Helper to check if file is an image
  function isImageFile(filename: string) {
    return filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
  }

  // Helper to determine file type from filename
  function getFileType(filename: string): 'image' | 'pdf' | 'audio' | 'other' {
    if (isImageFile(filename)) return 'image';
    if (filename.match(/\.pdf$/i)) return 'pdf';
    if (filename.match(/\.(mp3|wav|m4a|ogg)$/i)) return 'audio';
    return 'other';
  }

  // Handler for file click
  function handleFileClick(fileUrl: string, project: Project) {
    const filename = fileUrl.split('/').pop() || '';
    
    // Convert R2 URL to secure endpoint URL for assignment files
    let secureUrl = fileUrl;
    if (fileUrl.includes('.r2.dev') || fileUrl.includes('.r2.cloudflarestorage.com')) {
      secureUrl = process.env.NODE_ENV === 'production' 
        ? `/api/secure-files/assignments/${filename}`
        : `/secure-files/assignments/${filename}`;
    }
    
    // Create a mock cardNode structure for the project assignment file
    const mockCardNode = {
      id: `project-${project.id}`,
      type: "project",
      data: {
        fileEntries: [{
          url: secureUrl, // Use the secure URL that matches what we pass to viewerFile
          filename: project.assignment_filename || filename
        }]
      }
    };
    
    setViewerFile(secureUrl);
    setViewerType(getFileType(filename));
    setViewerOpen(true);
    setViewerCardNode(mockCardNode);
  }

  // Sort projects function
  function sortProjects(projectsToSort: Project[]): Project[] {
    return [...projectsToSort].sort((a, b) => {
      // Always put completed projects at the bottom
      if (a.status === 'complete' && b.status !== 'complete') {
        return 1; // a goes after b
      }
      if (a.status !== 'complete' && b.status === 'complete') {
        return -1; // a goes before b
      }
      if (a.status === 'complete' && b.status === 'complete') {
        // Both are complete, sort them normally
      }

      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'due_date':
          // For due date: projects without due dates go to the end
          aValue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          bValue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          break;
        case 'last_edited':
          // For last edited: most recent first by default
          aValue = a.last_edited_date ? new Date(a.last_edited_date).getTime() : 0;
          bValue = b.last_edited_date ? new Date(b.last_edited_date).getTime() : 0;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  // Filter projects function
  function filterProjects(projectsToFilter: Project[]): Project[] {
    return projectsToFilter.filter(project => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(project.status || '')) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          project.name.toLowerCase().includes(searchLower) ||
          project.class_subject?.toLowerCase().includes(searchLower) ||
          project.paper_type?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }

  // Custom file upload component for project modals
  function ProjectFileUpload({ 
    file, 
    currentFile,
    currentFilename,
    onFileChange, 
    onFileRemove,
    onCurrentFileRemove
  }: { 
    file: File | undefined; 
    currentFile?: string;
    currentFilename?: string;
    onFileChange: (file: File | undefined) => void; 
    onFileRemove: () => void; 
    onCurrentFileRemove: () => void;
  }) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      onFileChange(selectedFile || undefined);
    };

    const handleRemoveFile = () => {
      console.log('handleRemoveFile called');
      onFileRemove();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleRemoveCurrentFile = () => {
      console.log('handleRemoveCurrentFile called');
      onCurrentFileRemove();
    };

    // Show upload button only if no file is selected AND no current file exists
    const showUploadButton = !file && !currentFile;

    return (
      <div>
        {showUploadButton ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              Choose Assignment File
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${getFileIcon((file?.name || currentFilename || '')).color}`}>
                {getFileIcon((file?.name || currentFilename || '')).icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {file?.name || currentFilename || currentFile?.split('/').pop()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                console.log('Delete button clicked', { file: !!file, currentFile: !!currentFile });
                e.stopPropagation();
                e.preventDefault();
                if (file) {
                  handleRemoveFile();
                } else {
                  handleRemoveCurrentFile();
                }
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Remove file"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{
      backgroundImage: `
        radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)
      `,
      backgroundSize: '20px 20px'
    }}>
      {/* Header */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <LuFileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Paper Thread</h1>
            </div>
            <Button
              onClick={() => setIsAccountModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LuUser className="w-4 h-4" />
              <span>My Account</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Resources */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white h-full rounded-lg p-4 border border-gray-200 overflow-y-auto max-h-screen">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Resources</h2>
              
              {/* Example resource sections */}
              <div className="space-y-4">
                {Object.entries(sampleResources).map(([title, resources]) => (
                  <ResourceSection
                    key={title}
                    title={title}
                    resources={resources}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Projects */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-transparent">
              <div className="px-6">
                {/* Large screen layout - all on one line */}
                <div className="hidden sm:flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
                  
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search Projects"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white"
                      />
                    </div>
                    
                    {/* Filter popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="relative" aria-label="Filter and sort projects">
                          <LuListFilter className="w-4 h-4" />
                          {(statusFilter.length > 0 || sortBy !== 'due_date') && (
                            <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full" variant="default">
                              {statusFilter.length + (sortBy !== 'due_date' ? 1 : 0)}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-78 shadow-xl">
                        <div className="max-h-180 overflow-y-auto space-y-1">
                          {/* Sort By */}
                          <label className="text-md font-semibold text-foreground">Sort By</label>
                          <div className="space-y-2 mb-4 mt-2">
                            {[
                              { value: 'due_date', label: 'Due Date' },
                              { value: 'last_edited', label: 'Last Edited' },
                              { value: 'name', label: 'Name' }
                            ].map(option => (
                              <div key={option.value} className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                  <input
                                    type="radio"
                                    name="sortBy"
                                    value={option.value}
                                    checked={sortBy === option.value}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="accent-primary"
                                  />
                                  <span className="text-md">{option.label}</span>
                                </label>
                                {sortBy === option.value && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setSortOrder('asc')}
                                      className={`p-1 rounded-full ${sortOrder === 'asc' ? 'bg-gray-200' : ''}`}
                                      aria-label="Sort ascending"
                                    >
                                      <LuChevronUp className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSortOrder('desc')}
                                      className={`p-1 rounded-full ${sortOrder === 'desc' ? 'bg-gray-200' : ''}`}
                                      aria-label="Sort descending"
                                    >
                                      <LuChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Status Filter */}
                          <label className="text-md font-semibold text-foreground">Status</label>
                          <div className="space-y-2 mb-4 mt-2">
                            {[
                              { value: 'not_started', label: 'Not Started' },
                              { value: 'in_progress', label: 'In Progress' },
                              { value: 'ready_to_write', label: 'Ready to Write' },
                              { value: 'complete', label: 'Complete' }
                            ].map(option => (
                              <label key={option.value} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                                <input
                                  type="checkbox"
                                  value={option.value}
                                  checked={statusFilter.includes(option.value)}
                                  onChange={(e) => {
                                    const newStatusFilter = [...statusFilter];
                                    if (e.target.checked) {
                                      newStatusFilter.push(option.value);
                                    } else {
                                      newStatusFilter.splice(newStatusFilter.indexOf(option.value), 1);
                                    }
                                    setStatusFilter(newStatusFilter);
                                  }}
                                  className="accent-primary"
                                />
                                <span className="text-md">{option.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Clear all filters */}
                          {(statusFilter.length > 0 || sortBy !== 'due_date') && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusFilter([]);
                                  setSortBy('due_date');
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
                  
                  <Button onClick={handleCreate} className="bg-gray-800 hover:bg-gray-900">
                    <LuPlus className="w-4 h-4 mr-2" /> New Project
                  </Button>
                </div>

                {/* Small screen layout - stacked */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
                    <Button onClick={handleCreate} className="bg-gray-800 hover:bg-gray-900">
                      <LuPlus className="w-4 h-4 mr-2" /> New Project
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    <div className="relative flex-1">
                      <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search Projects"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full bg-white"
                      />
                    </div>
                    
                    {/* Filter popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="relative flex-shrink-0" aria-label="Filter and sort projects">
                          <LuListFilter className="w-4 h-4" />
                          {(statusFilter.length > 0 || sortBy !== 'due_date') && (
                            <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs rounded-full" variant="default">
                              {statusFilter.length + (sortBy !== 'due_date' ? 1 : 0)}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-78 shadow-xl">
                        <div className="max-h-180 overflow-y-auto space-y-1">
                          {/* Sort By */}
                          <label className="text-md font-semibold text-foreground">Sort By</label>
                          <div className="space-y-2 mb-4 mt-2">
                            {[
                              { value: 'due_date', label: 'Due Date' },
                              { value: 'last_edited', label: 'Last Edited' },
                              { value: 'name', label: 'Name' }
                            ].map(option => (
                              <div key={option.value} className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                  <input
                                    type="radio"
                                    name="sortBy"
                                    value={option.value}
                                    checked={sortBy === option.value}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="accent-primary"
                                  />
                                  <span className="text-md">{option.label}</span>
                                </label>
                                {sortBy === option.value && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setSortOrder('asc')}
                                      className={`p-1 rounded-full ${sortOrder === 'asc' ? 'bg-gray-200' : ''}`}
                                      aria-label="Sort ascending"
                                    >
                                      <LuChevronUp className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSortOrder('desc')}
                                      className={`p-1 rounded-full ${sortOrder === 'desc' ? 'bg-gray-200' : ''}`}
                                      aria-label="Sort descending"
                                    >
                                      <LuChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Status Filter */}
                          <label className="text-md font-semibold text-foreground">Status</label>
                          <div className="space-y-2 mb-4 mt-2">
                            {[
                              { value: 'not_started', label: 'Not Started' },
                              { value: 'in_progress', label: 'In Progress' },
                              { value: 'ready_to_write', label: 'Ready to Write' },
                              { value: 'complete', label: 'Complete' }
                            ].map(option => (
                              <label key={option.value} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                                <input
                                  type="checkbox"
                                  value={option.value}
                                  checked={statusFilter.includes(option.value)}
                                  onChange={(e) => {
                                    const newStatusFilter = [...statusFilter];
                                    if (e.target.checked) {
                                      newStatusFilter.push(option.value);
                                    } else {
                                      newStatusFilter.splice(newStatusFilter.indexOf(option.value), 1);
                                    }
                                    setStatusFilter(newStatusFilter);
                                  }}
                                  className="accent-primary"
                                />
                                <span className="text-md">{option.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* Clear all filters */}
                          {(statusFilter.length > 0 || sortBy !== 'due_date') && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusFilter([]);
                                  setSortBy('due_date');
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
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="px-6 py-4 bg-transparent">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="relative group cursor-pointer"
                        onClick={() => handleSelect(project.id)}
                      >
                        <div className={`p-4 bg-white rounded-lg border transition-all duration-200 h-64 flex flex-col ${
                          hasUpcomingDueDate(project.due_date, project.status) 
                            ? 'border-error-300 hover:border-error-300' 
                            : 'border-gray-200 hover:border-gray-300'
                        } hover:shadow-sm`}>
                          <div className="flex justify-between items-start mb-3 min-h-0">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {project.status === 'ready_to_write' && (
                                <LuNotebookPen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              )}
                              <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 min-w-0 text-base">
                                {project.name}
                              </h3>
                            </div>
                            <LuArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0 ml-2" />
                          </div>
                          
                          <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
                            {project.class_subject && (
                              <p className="text-sm text-gray-600">
                                {project.class_subject}
                              </p>
                            )}
                            {project.paper_type && (
                              <p className="text-sm text-gray-600">
                                {project.paper_type}
                              </p>
                            )}
                            
                            {project.assignment_file && (
                              <div>
                                <p className="text-xs font-medium text-foreground mb-2">Assignment File:</p>
                                <div 
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileClick(project.assignment_file!, project);
                                  }}
                                >
                                  <FileChip 
                                    fileUrl={project.assignment_file} 
                                    filename={project.assignment_filename}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {project.due_date && (
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                                getDueDateColor(project.due_date, project.status).includes('red') ? 'bg-red-100 text-red-700' :
                                getDueDateColor(project.due_date, project.status).includes('yellow') ? 'bg-yellow-100 text-yellow-700' :
                                getDueDateColor(project.due_date, project.status).includes('gray') ? 'bg-gray-100 text-gray-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {project.status === 'complete' && (
                                  <FaCircleCheck className="w-4 h-4 text-green-600" />
                                )}
                                <span>Due: {formatDate(project.due_date)}</span>
                              </div>
                            )}
                          </div>

                          {/* Bottom section with last edited and ellipses */}
                          <div className="flex justify-between items-center mt-auto pt-4 flex-shrink-0">
                            {project.last_edited_date && (
                              <p className="text-xs text-gray-500 truncate">
                                Last Edited: {formatDate(project.last_edited_date)}
                              </p>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <LuEllipsis className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                                  <LuPencil className="w-4 h-4 mr-2" />
                                  Edit Info
                                </DropdownMenuItem>
                                {project.status !== "ready_to_write" && project.status !== "complete" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, "ready_to_write"); }}>
                                    <LuNotebookPen className="w-4 h-4 mr-2" />
                                    Mark as Ready to Write
                                  </DropdownMenuItem>
                                )}
                                {project.status === "ready_to_write" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, "in_progress"); }}>
                                    <LuX className="w-4 h-4 mr-2" />
                                    Remove Ready to Write
                                  </DropdownMenuItem>
                                )}
                                {project.status !== "complete" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, "complete"); }}>
                                    <LuCircleCheck className="w-4 h-4 mr-2" />
                                    Mark as Complete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(project); }}
                                  className="text-red-600"
                                >
                                  <LuTrash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && editingProject && (
        <ProjectInfoModal 
          projectId={editingProject.id}
          mode="edit"
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingProject(null);
            // Refresh projects list to get updated data
            fetchProjects();
          }}
        />
      )}

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <ProjectInfoModal 
          mode="create"
          onClose={() => {
            setIsCreateDialogOpen(false);
            // Refresh projects list to get updated data
            fetchProjects();
          }}
        />
      )}

      {/* Account Settings Modal */}
      <AccountSettings 
        open={isAccountModalOpen} 
        onOpenChange={setIsAccountModalOpen} 
      />
      
      {/* Fullscreen File Viewer */}
      <FullscreenFileViewer 
        open={viewerOpen} 
        fileUrl={viewerFile} 
        fileType={viewerType} 
        onClose={() => {
          setViewerOpen(false);
          setViewerCardNode(null);
        }}
        cardType="assignments"
        cardNode={viewerCardNode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.name || ""}
        isLoading={loading}
      />
    </div>
  );
} 