"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Image as ImageIcon, Eye } from "lucide-react";
import { DuplicateComparisonDialog } from "@/components/DuplicateComparisonDialog";
import { ScannedFile } from "@/lib/duplicate-detection"; // Import ScannedFile type from backend
import JSZip from "jszip"; // Import JSZip

interface FrontendDuplicateFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  type: "image" | "other";
  previewUrl?: string; // For images, a URL to display the preview
  originalFileId?: string; // Link to its original for comparison
  detectionMethod?: 'MD5' | 'pHash' | 'SSIM'; // New: How it was detected
}

export default function CleanupPage() {
  const [uploadedFiles, setUploadedFiles] = useState<ScannedFile[]>([]); // Store all scanned files from backend
  const [duplicates, setDuplicates] = useState<FrontendDuplicateFile[]>([]); // Store only the duplicate entries for display
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{ original: ScannedFile; duplicate: ScannedFile } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const router = useRouter();

  // Clean up object URLs when component unmounts or uploadedFiles change
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.type === "image" && file.fullPath.startsWith("blob:")) { // Only revoke if it's a client-side generated URL
          URL.revokeObjectURL(file.fullPath);
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

    // The 100-file limit is now enforced on the backend, but a client-side check can provide faster feedback
    if (filesArray.length > 100) {
      toast.warning("You've reached the free limit. Redirecting to upgrade options.");
      router.push("/pricing");
      return;
    }

    setIsProcessing(true);
    setDuplicates([]); // Clear previous duplicates
    setUploadedFiles([]); // Clear previous uploaded files
    setSelectedForComparison(null); // Clear any previous comparison selection
    setJobId(null);
    toast.loading("Zipping and uploading your folder...", { id: "upload-scan" });

    const zip = new JSZip();
    for (const file of filesArray) {
      // Use webkitRelativePath for folder structure, fallback to name
      const filePathInZip = file.webkitRelativePath || file.name;
      zip.file(filePathInZip, file);
    }

    let zippedBlob: Blob;
    try {
      zippedBlob = await zip.generateAsync({ type: "blob" });
    } catch (zipError) {
      console.error("Error zipping files:", zipError);
      toast.error("Failed to zip files for upload.", { id: "upload-scan" });
      setIsProcessing(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', zippedBlob, 'uploaded_folder.zip');

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.redirect) {
          toast.warning(errorData.message, { id: "upload-scan" });
          router.push(errorData.redirect);
          return;
        }
        throw new Error(errorData.message || "Failed to upload and scan files.");
      }

      const { jobId, duplicateGroups, allScannedFiles } = await response.json();
      setJobId(jobId);

      // Create client-side preview URLs for all scanned image files
      const filesWithPreviews: ScannedFile[] = allScannedFiles.map((file: ScannedFile) => {
        if (file.type === "image") {
          return { ...file, fullPath: `/api/preview?jobId=${jobId}&relativePath=${encodeURIComponent(file.relativePath)}` };
        }
        return file;
      });
      setUploadedFiles(filesWithPreviews);

      // Map backend duplicate groups to frontend format, resolving preview URLs
      const formattedDuplicates: FrontendDuplicateFile[] = duplicateGroups.map((dup: FrontendDuplicateFile) => {
        const originalScannedFile = filesWithPreviews.find(f => f.id === dup.originalFileId);
        const duplicateScannedFile = filesWithPreviews.find(f => f.id === dup.id);
        return {
          ...dup,
          previewUrl: duplicateScannedFile?.fullPath, // Use the resolved fullPath as previewUrl
          detectionMethod: dup.detectionMethod, // Pass the detection method
        };
      });
      setDuplicates(formattedDuplicates);

      toast.success("Scan complete! Review duplicate images below.", { id: "upload-scan" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload and scan files.", { id: "upload-scan" });
    } finally {
      setIsProcessing(false);
    }
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

  const handleCompare = (duplicate: FrontendDuplicateFile) => {
    if (duplicate.originalFileId) {
      const original = uploadedFiles.find(file => file.id === duplicate.originalFileId);
      const duplicateFull = uploadedFiles.find(file => file.id === duplicate.id);
      if (original && duplicateFull) {
        setSelectedForComparison({ original, duplicate: duplicateFull });
        setIsCompareDialogOpen(true);
      } else {
        toast.error("Original or duplicate image for comparison not found.");
      }
    } else {
      toast.info("This duplicate does not have a linked original for comparison.");
    }
  };

  const handleDownload = async () => {
    if (isProcessing) {
      toast.error("Please wait for the current operation to finish.");
      return;
    }
    if (!jobId || uploadedFiles.length === 0) {
      toast.error("Please upload a folder first.");
      return;
    }

    toast.loading("Preparing your cleaned folder...", { id: "download-zip" });
    try {
      // Send the list of files to keep to the backend
      const filesToKeep = uploadedFiles.filter(file => !duplicates.some(dup => dup.id === file.id));
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, filesToKeep: filesToKeep.map(f => f.relativePath) }),
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
                    {dup.detectionMethod && (
                      <span className="text-xs text-muted-foreground ml-2">({dup.detectionMethod})</span>
                    )}
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
            disabled={!jobId || uploadedFiles.length === 0 || isProcessing}
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