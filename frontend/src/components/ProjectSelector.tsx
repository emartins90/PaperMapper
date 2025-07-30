import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ArrowRight, 
  FileText, 
  Edit3, 
  CheckCircle, 
  PenTool, 
  Trash2,
  User
} from "lucide-react";
import { MdPictureAsPdf, MdDescription, MdAudiotrack, MdInsertDriveFile } from "react-icons/md";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import AccountSettings from "./AccountSettings";
import { FullscreenFileViewer } from "./canvas-add-files/FullscreenFileViewer";
import { useRef } from "react";
import { FileListDisplay } from "./canvas-add-files/FileListDisplay";
import FileChip from "./canvas-add-files/FileChip";
import ProjectInfoModal from "./ProjectInfoModal";

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
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    // Filter projects based on search term
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.class_subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.paper_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  async function fetchProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // First create the project
      const res = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          class_subject: formData.class_subject || undefined,
          paper_type: formData.paper_type || undefined,
          due_date: formData.due_date || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const project = await res.json();
      
      // If there's an assignment file, upload it
      if (formData.assignment_file) {
        const formDataFile = new FormData();
        formDataFile.append("project_id", project.id.toString());
        formDataFile.append("file", formData.assignment_file);
        
        const uploadRes = await fetch(`${API_URL}/projects/upload_assignment/`, {
          method: "POST",
          credentials: "include",
          body: formDataFile,
        });
        
        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          project.assignment_file = uploadResult.file_url;
          project.assignment_filename = formData.assignment_file.name;
        }
      }
      
      setProjects([...projects, project]);
      setFormData({ name: "", class_subject: "", paper_type: "", due_date: "", assignment_file: undefined });
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;
    
    setLoading(true);
    setError("");
    try {
      // First update the project data
      const res = await fetch(`${API_URL}/projects/${editingProject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          class_subject: formData.class_subject || undefined,
          paper_type: formData.paper_type || undefined,
          due_date: formData.due_date || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      const updatedProject = await res.json();
      
      // If there's a new assignment file, upload it
      if (formData.assignment_file) {
        const formDataFile = new FormData();
        formDataFile.append("project_id", editingProject.id.toString());
        formDataFile.append("file", formData.assignment_file);
        
        const uploadRes = await fetch(`${API_URL}/projects/upload_assignment/`, {
          method: "POST",
          credentials: "include",
          body: formDataFile,
        });
        
        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          updatedProject.assignment_file = uploadResult.file_url;
          updatedProject.assignment_filename = formData.assignment_file.name;
        }
      }
      
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
      setEditingProject(null);
      setFormData({ name: "", class_subject: "", paper_type: "", due_date: "", assignment_file: undefined });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  async function handleDelete(projectId: number) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    if (ext === "pdf") return { icon: <MdPictureAsPdf className="text-red-500 w-4 h-4" />, color: "bg-red-100" };
    if (["doc", "docx"].includes(ext || "")) return { icon: <MdDescription className="text-blue-700 w-4 h-4" />, color: "bg-blue-100" };
    if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) return { icon: <MdAudiotrack className="text-purple-500 w-4 h-4" />, color: "bg-purple-100" };
    return { icon: <MdInsertDriveFile className="text-gray-500 w-4 h-4" />, color: "bg-gray-100" };
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
  function handleFileClick(fileUrl: string) {
    const filename = fileUrl.split('/').pop() || '';
    
    // Convert R2 URL to secure endpoint URL for assignment files
    let secureUrl = fileUrl;
    if (fileUrl.includes('.r2.dev') || fileUrl.includes('.r2.cloudflarestorage.com')) {
      secureUrl = `/secure-files/assignments/${filename}`;
    }
    
    setViewerFile(secureUrl);
    setViewerType(getFileType(filename));
    setViewerOpen(true);
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
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Paper Mapper</h1>
            </div>
            <Button
              onClick={() => setIsAccountModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>My Account</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white h-full rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Resources</h2>
              {/* Add resource content here */}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-transparent">
              <div className="p-6">
                <div className="grid grid-cols-3 items-center">
                  <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search Projects"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-gray-800 hover:bg-gray-900">
                          + New Project
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] p-6">
                        <DialogHeader>
                          <DialogTitle>Create New Project</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                          <div>
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="class_subject">Class/Subject</Label>
                            <Input
                              id="class_subject"
                              value={formData.class_subject}
                              onChange={(e) => setFormData({...formData, class_subject: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="paper_type">Paper Type</Label>
                            <Input
                              id="paper_type"
                              value={formData.paper_type}
                              onChange={(e) => setFormData({...formData, paper_type: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                              id="due_date"
                              type="date"
                              value={formData.due_date}
                              onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            />
                          </div>
                                      <div>
              <Label htmlFor="assignment_file">Assignment File (Optional)</Label>
              <ProjectFileUpload
                file={formData.assignment_file}
                onFileChange={(file) => setFormData({...formData, assignment_file: file})}
                onFileRemove={() => setFormData({...formData, assignment_file: undefined})}
                onCurrentFileRemove={() => {}}
              />
            </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={loading || !formData.name}>
                              Create Project
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="p-6 bg-transparent">
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
                        <div className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-64">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-gray-900 text-lg">{project.name}</h3>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>
                          
                          <div className="space-y-3">
                            {project.class_subject && project.paper_type && (
                              <p className="text-sm text-gray-600">
                                {project.class_subject}: {project.paper_type}
                              </p>
                            )}
                            
                            {project.assignment_file && (
                              <div>
                                <p className="text-xs font-medium text-foreground mb-2">Assignment File:</p>
                                <div 
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFileClick(project.assignment_file!);
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
                              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                getDueDateColor(project.due_date, project.status).includes('red') ? 'bg-red-100 text-red-700' :
                                getDueDateColor(project.due_date, project.status).includes('yellow') ? 'bg-yellow-100 text-yellow-700' :
                                getDueDateColor(project.due_date, project.status).includes('gray') ? 'bg-gray-100 text-gray-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                Due: {formatDate(project.due_date)}
                              </div>
                            )}
                            
                            {project.last_edited_date && (
                              <p className="text-xs text-gray-500">
                                Last Edited: {formatDate(project.last_edited_date)}
                              </p>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute bottom-4 right-4 h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(project); }}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Info
                              </DropdownMenuItem>
                              {project.status !== "ready_to_write" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, "ready_to_write"); }}>
                                  <PenTool className="w-4 h-4 mr-2" />
                                  Mark as Ready to Write
                                </DropdownMenuItem>
                              )}
                              {project.status !== "complete" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(project.id, "complete"); }}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark as Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingProject(null);
            setFormData({ name: "", class_subject: "", paper_type: "", due_date: "", assignment_file: undefined });
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
        onClose={() => setViewerOpen(false)}
        cardType="assignments"
      />
    </div>
  );
} 