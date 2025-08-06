"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LuTrash2, LuTriangleAlert } from "react-icons/lu";

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  projectName: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  projectName,
  isLoading = false
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
          <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-4">
        
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-error-100 rounded-full flex items-center justify-center flex-shrink-0">
              <LuTriangleAlert className="w-5 h-5 text-error-300 flex-shrink-0" />
            </div>
            <DialogHeader className="flex-1">
              <DialogTitle className="text-left">Delete Project</DialogTitle>
            </DialogHeader>
          </div>
      
          <DialogDescription className="text-left">
                Are you sure you want to delete "{projectName}"? This action cannot be undone.
          </DialogDescription>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <LuTrash2 className="w-4 h-4 mr-2" />
                Delete Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 