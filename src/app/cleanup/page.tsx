"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Image as ImageIcon, Eye } from "lucide-react";
import { DuplicateComparisonDialog } from "@/components/DuplicateComparisonDialog"; // Import the new component

interface DuplicateFile {
  id: string;
  fileName: string;
  path: string; // Original path, for context
  type: "image" | "other"; // e.g., "image", "other"
  previewUrl?: string; // For images, a URL to display the preview
  originalFileId?: string; // New: Link to its original for comparison
}

export default function CleanupPage() {
  const [uploadedFiles, setUploadedFiles] = useState<DuplicateFile[]>([]); // Store all uploaded files for lookup
  const [duplicates, setDuplicates] = useState<DuplicateFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{ original: DuplicateFile; duplicate: DuplicateFile } | null>(null);
  const router = useRouter();

  // Clean up object URLs when component unmounts or duplicates change
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [uploadedFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    if (filesArray.length === 0) {
      toast.info("No files selected.");
      return;
    }

    if (filesArray.length > 100) {
      toast.warning("You've reached the free limit. Redirecting to upgrade options.");
      router.push("/pricing");
      return;
    }

    setIsProcessing(true);
    setDuplicates([]); // Clear previous duplicates
    setSelectedForComparison(null); // Clear any previous comparison selection
    toast.loading("Uploading and scanning for duplicate images...", { id: "upload-scan" });

    // Process files to create preview URLs for images and assign unique IDs
    const processedFiles: DuplicateFile[] = await Promise.all(filesArray.map(async (file, index) => {
      const fileType = file.type.startsWith("image/") ? "image" : "other";
      let previewUrl: string | undefined;

      if (fileType === "image") {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id: `file-${index}-${file.name}`, // More robust unique ID
        fileName: file.name,
        path: `/${file.webkitRelativePath || file.name}`,
        type: fileType,
        previewUrl,
      };
    }));
    setUploadedFiles(processedFiles); // Store all processed files

    // Simulate backend processing for duplicate detection
    setTimeout(() => {
      const mockDuplicates: DuplicateFile[] = [];
      
      // Create mock duplicates:
      // If there are at least 2 files, make file[1] a duplicate of file[0]
      if (processedFiles.length >= 2) {
        mockDuplicates.push({ 
          ...processedFiles[1], 
          id: `dup-${processedFiles[1].id}`, // Distinct ID for the duplicate entry
          originalFileId: processedFiles[0].id // Link to the original
        });
      }
      // If there are at least 4 files, make file[3] a duplicate of file[2]
      if (processedFiles.length >= 4) {
        mockDuplicates.push({ 
          ...processedFiles[3], 
          id: `dup-${processedFiles[3].id}`, 
          originalFileId: processedFiles[2].id 
        });
      }
      
      // Filter out duplicates that might have been added multiple times if the original file was also a duplicate
      const uniqueDuplicates = Array.from(new Map(mockDuplicates.map(item => [item.fileName, item])).values());

      setDuplicates(uniqueDuplicates);
      setIsProcessing(false);
      toast.success("Scan complete! Review duplicate images below.", { id: "upload-scan" });
    }, 3000);
  };

  const handleDeleteAll = () => {
    setDuplicates([]); // Clear all duplicates
    toast.success("All duplicate images marked for deletion.");
  };

  const handleKeepFile = (id: string) => {
    setDuplicates(duplicates.filter(dup => dup.id !== id));
    toast.info("Image marked to keep.");
  };

  const handleDeleteFile = (id: string) => {
    setDuplicates(duplicates.filter(dup => dup.id !== id)); // Remove from duplicates list
    toast.success("Image marked for deletion.");
  };

  const handleCompare = (duplicate: DuplicateFile) => {
    if (duplicate.originalFileId) {
      const original = uploadedFiles.find(file => file.id === duplicate.originalFileId);
      if (original) {
        setSelectedForComparison({ original, duplicate });
        setIsCompareDialogOpen(true);
      } else {
        toast.error("Original image for comparison not found.");
      }
    } else {
      toast.info("This duplicate does not have a linked original for comparison in this mock.");
    }
  };

  const handleDownload = async () => {
    if (isProcessing) {
      toast.error("Please wait for the current operation to finish.");
      return;
    }
    if (uploadedFiles.length === 0) {
      toast.error("Please upload a folder first.");
      return;
    }

    toast.loading("Preparing your cleaned folder...", { id: "download-zip" });
    try {
      // Send the list of files to keep/delete to the backend
      // For a real application, you'd send identifiers that the backend can use to locate the actual files.
      // Here, we're just sending file names for a mock.
      const filesToKeep = uploadedFiles.filter(file => !duplicates.some(dup => dup.fileName === file.fileName));
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filesToKeep: filesToKeep.map(f => f.fileName) }),
      });

      if (!response.ok) {
        throw new Error("Failed to download cleaned folder.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cleaned-folder.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Cleaned folder downloaded successfully!", { id: "download-zip" });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download cleaned folder.", { id: "download-zip" });
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-10 flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-128px)]">
      {/* Upload Area */}
      <Card className="flex-1 p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-2xl">Upload Your Folder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Label htmlFor="folder-upload" className="cursor-pointer text-lg text-muted-foreground hover:text-foreground transition-colors">
            Drag & drop a folder or click to select (zip or directory)
          </Label>
          <Input
            id="folder-upload"
            type="file"
            // @ts-ignore - webkitdirectory is a non-standard attribute
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">Free limit: 100 files</p>
          {uploadedFiles.length > 0 && (
            <p className="text-sm text-primary">
              {uploadedFiles.length} files selected.
            </p>
          )}
        </CardContent>
      </Card>

      {/* File Review Area */}
      <Card className="flex-1 p-6 space-y-6">
        <CardHeader>
          <CardTitle className="text-2xl">Review Duplicate Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDeleteAll}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={duplicates.length === 0 || isProcessing}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete All Duplicate Images
          </Button>

          <div className="h-64 border rounded-md overflow-auto p-4 bg-background">
            {isProcessing ? (
              <p className="text-center text-muted-foreground">Scanning for duplicate images...</p>
            ) : duplicates.length === 0 ? (
              <p className="text-center text-muted-foreground">No duplicate images found. Upload a folder to start.</p>
            ) : (
              duplicates.map((dup) => (
                <div key={dup.id} className="flex justify-between items-center border-b last:border-b-0 py-2">
                  <div className="flex items-center gap-2">
                    {dup.type === "image" && dup.previewUrl ? (
                      <img src={dup.previewUrl} alt={dup.fileName} className="h-10 w-10 object-cover rounded-md" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                    <span className="text-foreground text-sm md:text-base">{dup.fileName}</span>
                  </div>
                  <div className="space-x-2 flex">
                    <Button variant="outline" size="sm" onClick={() => handleCompare(dup)} disabled={!dup.originalFileId}>
                      <Eye className="mr-1 h-4 w-4" /> Compare
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleKeepFile(dup.id)}>Keep</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteFile(dup.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Button
            onClick={handleDownload}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={uploadedFiles.length === 0 || isProcessing}
          >
            <Download className="mr-2 h-4 w-4" /> Download Cleaned Folder
          </Button>
        </CardContent>
      </Card>

      {selectedForComparison && (
        <DuplicateComparisonDialog
          isOpen={isCompareDialogOpen}
          onClose={() => setIsCompareDialogOpen(false)}
          originalFile={selectedForComparison.original}
          duplicateFile={selectedForComparison.duplicate}
        />
      )}
    </main>
  );
}