"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MdDelete, MdUpload } from "react-icons/md";
import FileChip from "./canvas-add-files/FileChip";
import { FullscreenFileViewer } from "./canvas-add-files/FullscreenFileViewer";

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
  projectId: number;
  onClose: () => void;
}

export default function ProjectInfoModal({ projectId, onClose }: ProjectInfoModalProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    class_subject: "",
    paper_type: "",
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  useEffect(() => {
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
            paper_type: projectData.paper_type || "",
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
  }, [projectId]);

  const handleSave = async () => {
    if (!project) return;
    
    setSaving(true);
    try {
      // Update project info
      const updateResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          class_subject: formData.class_subject,
          paper_type: formData.paper_type,
          due_date: formData.due_date || null,
          status: formData.status,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update project");
      }

      // Upload file if selected
      if (file) {
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
      const refreshResponse = await fetch(`${API_URL}/projects/${projectId}`, {
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const updatedProject = await refreshResponse.json();
        setProject(updatedProject);
      }

      onClose();
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Failed to save project changes");
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
    if (!project) return;
    
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
          <DialogTitle>Edit Project Info</DialogTitle>
          <DialogDescription>
            Update project details and assignment file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
            />
          </div>

          <div>
            <Label htmlFor="class_subject">Class/Subject</Label>
            <Input
              id="class_subject"
              value={formData.class_subject}
              onChange={(e) => setFormData({ ...formData, class_subject: e.target.value })}
              placeholder="Enter class or subject"
            />
          </div>

          <div>
            <Label htmlFor="paper_type">Paper Type</Label>
            <Input
              id="paper_type"
              value={formData.paper_type}
              onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
              placeholder="Enter paper type"
            />
          </div>

          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="ready_to_write">Ready to Write</option>
              <option value="complete">Complete</option>
            </select>
          </div>

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
                    <MdDelete className="h-4 w-4" />
                  </Button>
                </div>
              ) : file ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <MdUpload className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFileRemove}
                    className="ml-2"
                  >
                    <MdDelete className="h-4 w-4" />
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
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