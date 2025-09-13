"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, FileText } from "lucide-react";

interface DuplicateFile {
  id: string;
  fileName: string;
  path: string;
  type: "image" | "other";
  previewUrl?: string;
  originalFileId?: string;
}

interface DuplicateComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalFile: DuplicateFile | null;
  duplicateFile: DuplicateFile | null;
}

export const DuplicateComparisonDialog: React.FC<DuplicateComparisonDialogProps> = ({
  isOpen,
  onClose,
  originalFile,
  duplicateFile,
}) => {
  if (!originalFile || !duplicateFile) {
    return null; // Or handle this case with a loading state/error message
  }

  const renderFileCard = (file: DuplicateFile, title: string) => (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {file.type === "image" && file.previewUrl ? (
          <img src={file.previewUrl} alt={file.fileName} className="max-h-48 w-full object-contain rounded-md border" />
        ) : (
          <div className="flex items-center justify-center h-48 bg-muted rounded-md border">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-xs text-muted-foreground break-all">Path: {file.path}</p>
        <p className="text-xs text-muted-foreground">Type: {file.type}</p>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Compare Duplicate Images</DialogTitle>
          <DialogDescription>
            Review the original image and its duplicate side-by-side.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          {renderFileCard(originalFile, "Original Image")}
          {renderFileCard(duplicateFile, "Duplicate Image")}
        </div>
      </DialogContent>
    </Dialog>
  );
};