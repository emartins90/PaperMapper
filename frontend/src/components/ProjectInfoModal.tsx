"use client";
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, useCustomOptions } from "@/components/ui/combobox";
import { LuTrash2, LuUpload } from "react-icons/lu";
import FileChip from "./canvas-add-files/FileChip";
import { FullscreenFileViewer } from "./canvas-add-files/FullscreenFileViewer";
import { toast } from "sonner";

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

interface ProjectInfoModalProps {
  projectId?: number; // Optional for create mode
  mode: 'create' | 'edit';
  onClose: () => void;
}

export default function ProjectInfoModal({ projectId, mode, onClose }: ProjectInfoModalProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    class_subject: "",
    due_date: "",
    status: "not_started"
  });
  const [file, setFile] = useState<File | undefined>();
  const [currentFile, setCurrentFile] = useState<string | undefined>();
  const [currentFilename, setCurrentFilename] = useState<string | undefined>();

  // File viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'image' | 'pdf' | 'other' | 'audio'>('other');

  // Ref for auto-focusing the name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Use custom options hook for classes
  const classOptions = useCustomOptions("class");

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
      secureUrl = process.env.NODE_ENV === 'production' 
        ? `/api/secure-files/assignments/${filename}`
        : `/secure-files/assignments/${filename}`;
    }
    
    setViewerFile(secureUrl);
    setViewerType(getFileType(filename));
    setViewerOpen(true);
  }

  useEffect(() => {
    if (mode === 'edit' && projectId) {
      const fetchProject = async () => {
        try {
          const response = await fetch(`${API_URL}/projects/${projectId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const projectData = await response.json();
            setProject(projectData);
            setFormData({
              name: projectData.name || "",
              class_subject: projectData.class_subject || "",
              due_date: projectData.due_date ? projectData.due_date.split('T')[0] : "",
              status: projectData.status || "not_started"
            });
            setCurrentFile(projectData.assignment_file);
            setCurrentFilename(projectData.assignment_filename);
          }
        } catch (error) {
          console.error("Failed to fetch project:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchProject();
    } else {
      setLoading(false);
    }
  }, [projectId, mode]);

  useEffect(() => {
    // Focus the name input after a small delay to ensure modal is fully rendered
    const timer = setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (mode === 'edit' && !project) return;
    
    setSaving(true);
    try {
      if (mode === 'create') {
        // Create new project
        const createResponse = await fetch(`${API_URL}/projects/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name,
            class_subject: formData.class_subject,
            due_date: formData.due_date || null,
            status: formData.status,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create project");
        }

        const newProject = await createResponse.json();
        
        // Upload file if selected
        if (file && newProject.id) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", file);
          uploadFormData.append("project_id", newProject.id.toString());

          const uploadResponse = await fetch(`${API_URL}/projects/upload_assignment/`, {
            method: "POST",
            credentials: "include",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload file");
          }
        }
      } else {
        // Update existing project
        const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: formData.name,
            class_subject: formData.class_subject,
            due_date: formData.due_date || null,
            status: formData.status,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update project");
        }

        // Upload file if selected
        if (file && projectId) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", file);
          uploadFormData.append("project_id", projectId.toString());

          const uploadResponse = await fetch(`${API_URL}/projects/upload_assignment/`, {
            method: "POST",
            credentials: "include",
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload file");
          }

          const uploadResult = await uploadResponse.json();
          setCurrentFile(uploadResult.file_url);
          setCurrentFilename(file.name);
        }

        // Refresh project data
        if (projectId) {
          const refreshResponse = await fetch(`${API_URL}/projects/${projectId}`, {
            credentials: "include",
          });
          if (refreshResponse.ok) {
            const updatedProject = await refreshResponse.json();
            setProject(updatedProject);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project changes");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (selectedFile: File | undefined) => {
    setFile(selectedFile);
  };

  const handleFileRemove = () => {
    setFile(undefined);
  };

  const handleCurrentFileRemove = async () => {
    if (!project || !projectId) return;
    
    try {
      const response = await fetch(`${API_URL}/projects/delete_assignment/?project_id=${projectId}`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setCurrentFile(undefined);
        setCurrentFilename(undefined);
      } else {
        console.error("Failed to delete file:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Project Info</DialogTitle>
            <DialogDescription>
              Please wait while we load the project details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Project' : 'Edit Project Info'}</DialogTitle>
          <DialogDescription className="mb-2">
            {mode === 'create' ? 'Add project details and optional assignment file.' : 'Update project details and assignment file.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              ref={nameInputRef}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_subject">Class/Subject</Label>
            <Combobox
              options={classOptions.options}
              value={formData.class_subject || ""}
              onChange={async (value) => {
                setFormData({ ...formData, class_subject: value });
                // If it's a new custom option, persist it
                if (value && !classOptions.options.some(o => o.value === value)) {
                  await classOptions.addOption(value);
                }
              }}
              placeholder="Select or type class..."
              allowCustom={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, status: value })} value={formData.status}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready_to_write">Ready to Write</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Assignment File</Label>
            <div className="mt-2">
              {currentFile ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => handleFileClick(currentFile)}
                  >
                    <FileChip 
                      fileUrl={currentFile} 
                      filename={currentFilename}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCurrentFileRemove}
                    className="ml-2"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : file ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0 flex-1" style={{ maxWidth: '300px' }}>
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                      <LuUpload className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFileRemove}
                    className="ml-2"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <Input
                    type="file"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.ogg"
                    className="cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
            {saving ? "Saving..." : mode === 'create' ? "Create Project" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
      
      {/* Fullscreen File Viewer */}
      <FullscreenFileViewer 
        open={viewerOpen} 
        fileUrl={viewerFile} 
        fileType={viewerType} 
        onClose={() => setViewerOpen(false)}
        cardType="assignments"
      />
    </Dialog>
  );
} 