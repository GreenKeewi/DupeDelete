"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Image as ImageIcon, Eye, AlertTriangle, FileWarning, FolderOpen } from "lucide-react";
import { DuplicateComparisonDialog } from "@/components/DuplicateComparisonDialog";
import { ScannedFile, DuplicateGroup, SimilarImageGroup, ComprehensiveScanResult } from "@/types/detection";
import JSZip from "jszip";
import { apiFetcher } from "@/lib/api-utils";
import { Progress } from "@/components/ui/progress"; // Import Progress component

// Frontend-specific types for display
interface DisplayFile extends ScannedFile {
  previewUrl?: string; // For images, a URL to display the preview
}

export default function CleanupPage() {
  const [allScannedFiles, setAllScannedFiles] = useState<DisplayFile[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [similarImages, setSimilarImages] = useState<SimilarImageGroup[]>([]);
  const [brokenFiles, setBrokenFiles] = useState<ScannedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{ original: DisplayFile; duplicate: DisplayFile } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      allScannedFiles.forEach(file => {
        if (file.type === "image" && file.previewUrl && file.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [allScannedFiles]);

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
    setDuplicates([]);
    setSimilarImages([]);
    setBrokenFiles([]);
    setAllScannedFiles([]);
    setSelectedForComparison(null);
    setJobId(null);
    toast.loading("Zipping and uploading your folder for scan...", { id: "upload-scan" });

    const zip = new JSZip();
    for (const file of filesArray) {
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
      const scanResult = await apiFetcher<ComprehensiveScanResult>("/api/detect-duplicates", {
        method: "POST",
        body: formData,
        errorMessage: "Failed to upload and scan files."
      });
      
      setJobId(scanResult.jobId);

      const allFilesFromScan: ScannedFile[] = [];
      scanResult.duplicates.forEach(group => {
        allFilesFromScan.push(group.original, ...group.duplicates);
      });
      scanResult.similarImages.forEach(group => {
        allFilesFromScan.push(group.original, ...group.similar);
      });
      allFilesFromScan.push(...scanResult.brokenFiles);

      const filesWithPreviews: DisplayFile[] = allFilesFromScan.map((file: ScannedFile) => {
        if (file.type === "image") {
          return { ...file, previewUrl: `/api/preview?jobId=${scanResult.jobId}&relativePath=${encodeURIComponent(file.relativePath)}` };
        }
        return file;
      });
      setAllScannedFiles(filesWithPreviews);

      setDuplicates(scanResult.duplicates);
      setSimilarImages(scanResult.similarImages);
      setBrokenFiles(scanResult.brokenFiles);

      toast.success("Scan complete! Review results below.", { id: "upload-scan" });
    } catch (error: any) {
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeepFile = (fileId: string, groupType: 'duplicate' | 'similar', groupId: string) => {
    if (groupType === 'duplicate') {
      setDuplicates(prev => prev.map(group => {
        if (group.original.id === groupId) {
          return {
            ...group,
            duplicates: group.duplicates.filter((dup: ScannedFile) => dup.id !== fileId)
          };
        }
        return group;
      }).filter((group: DuplicateGroup) => group.duplicates.length > 0));
    } else if (groupType === 'similar') {
      setSimilarImages(prev => prev.map(group => {
        if (group.original.id === groupId) {
          return {
            ...group,
            similar: group.similar.filter((sim: ScannedFile) => sim.id !== fileId)
          };
        }
        return group;
      }).filter((group: SimilarImageGroup) => group.similar.length > 0));
    }
    toast.info("Image marked to keep.");
  };

  const handleDeleteFile = (fileId: string, groupType: 'duplicate' | 'similar', groupId: string) => {
    if (groupType === 'duplicate') {
      setDuplicates(prev => prev.map(group => {
        if (group.original.id === groupId) {
          return {
            ...group,
            duplicates: group.duplicates.filter((dup: ScannedFile) => dup.id !== fileId)
          };
        }
        return group;
      }).filter((group: DuplicateGroup) => group.duplicates.length > 0));
    } else if (groupType === 'similar') {
      setSimilarImages(prev => prev.map(group => {
        if (group.original.id === groupId) {
          return {
            ...group,
            similar: group.similar.filter((sim: ScannedFile) => sim.id !== fileId)
          };
        }
        return group;
      }).filter((group: SimilarImageGroup) => group.similar.length > 0));
    }
    toast.success("Image marked for deletion.");
  };

  const handleCompare = (originalFile: DisplayFile, duplicateFile: DisplayFile) => {
    setSelectedForComparison({ original: originalFile, duplicate: duplicateFile });
    setIsCompareDialogOpen(true);
  };

  const handleDownload = async () => {
    if (isProcessing) {
      toast.error("Please wait for the current operation to finish.");
      return;
    }
    if (!jobId || allScannedFiles.length === 0) {
      toast.error("Please upload a folder first.");
      return;
    }

    toast.loading("Preparing your cleaned folder...", { id: "download-zip" });
    try {
      const filesToKeepRelativePaths: string[] = [];

      duplicates.forEach(group => filesToKeepRelativePaths.push(group.original.relativePath));
      similarImages.forEach(group => filesToKeepRelativePaths.push(group.original.relativePath));

      const allDuplicateAndSimilarFileIds = new Set<string>();
      duplicates.forEach(group => {
        allDuplicateAndSimilarFileIds.add(group.original.id);
        group.duplicates.forEach(dup => allDuplicateAndSimilarFileIds.add(dup.id));
      });
      similarImages.forEach(group => {
        allDuplicateAndSimilarFileIds.add(group.original.id);
        group.similar.forEach(sim => allDuplicateAndSimilarFileIds.add(sim.id));
      });
      brokenFiles.forEach(file => allDuplicateAndSimilarFileIds.add(file.id));

      allScannedFiles.forEach(file => {
        if (!allDuplicateAndSimilarFileIds.has(file.id) && !file.isBroken) {
          filesToKeepRelativePaths.push(file.relativePath);
        }
      });

      const uniqueFilesToKeep = Array.from(new Set(filesToKeepRelativePaths));

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, filesToKeep: uniqueFilesToKeep }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("Content-Type");
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to download cleaned folder.");
        } else {
          const textResponse = await response.text();
          console.error("Download API Error: Non-JSON response received.", textResponse.substring(0, 200));
          throw new Error(`Failed to download cleaned folder. Received non-JSON response. Body: ${textResponse.substring(0, 200)}...`);
        }
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
      toast.error((error as Error).message || "Failed to download cleaned folder.", { id: "download-zip" });
    }
  };

  const renderFileItem = (file: DisplayFile, groupType: 'duplicate' | 'similar', groupId: string, originalFile?: DisplayFile) => (
    <div key={file.id} className="flex justify-between items-center border-b last:border-b-0 py-2">
      <div className="flex items-center gap-2">
        {file.type === "image" && file.previewUrl ? (
          <img src={file.previewUrl} alt={file.fileName} className="h-10 w-10 object-cover rounded-md" />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        )}
        <span className="text-foreground text-sm md:text-base">{file.fileName}</span>
        {file.detectionMethod && (
          <span className="text-xs text-muted-foreground ml-2">({file.detectionMethod})</span>
        )}
      </div>
      <div className="space-x-2 flex">
        {originalFile && (
          <Button variant="outline" size="sm" onClick={() => handleCompare(originalFile, file)}>
            <Eye className="mr-1 h-4 w-4" /> Compare
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => handleKeepFile(file.id, groupType, groupId)}>Keep</Button>
        <Button variant="destructive" size="sm" onClick={() => handleDeleteFile(file.id, groupType, groupId)}>Delete</Button>
      </div>
    </div>
  );

  return (
    <main className="container mx-auto p-4 md:p-10 flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-128px)]">
      {/* Upload Area */}
      <Card className="flex-1 p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-2xl">Upload Your Folder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Label htmlFor="folder-upload" className="cursor-pointer flex flex-col items-center gap-2 text-lg text-muted-foreground hover:text-foreground transition-colors p-8 rounded-lg border-2 border-dashed border-transparent hover:border-primary">
            <FolderOpen className="h-12 w-12 text-primary" />
            <span className="text-xl font-semibold">Drag & drop a folder here</span>
            <span className="text-sm">or click to select a folder</span>
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
            disabled={isProcessing} // Disable input during processing
          />
          <p className="text-sm text-muted-foreground">Free limit: 100 files</p>
          {allScannedFiles.length > 0 && (
            <p className="text-sm text-primary">
              {allScannedFiles.length} files selected.
            </p>
          )}
          {isProcessing && (
            <div className="w-full max-w-sm mt-4">
              <Progress value={undefined} className="w-full" /> {/* Indeterminate progress bar */}
              <p className="text-sm text-muted-foreground mt-2">Scanning files...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Review Area */}
      <Card className="flex-1 p-6 space-y-6">
        <CardHeader>
          <CardTitle className="text-2xl">Scan Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessing ? (
            <p className="text-center text-muted-foreground">Scanning for files...</p>
          ) : (
            <>
              {/* Broken Files Section */}
              {brokenFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-destructive" /> Broken Files ({brokenFiles.length})
                  </h3>
                  <p className="text-sm text-muted-foreground">These files could not be read or are corrupted and will not be included in the cleaned folder.</p>
                  <div className="h-48 border rounded-md overflow-auto p-4 bg-background">
                    {brokenFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 py-2 border-b last:border-b-0">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-foreground text-sm md:text-base">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({file.type === 'image' ? 'Corrupted Image' : 'Unreadable File'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Images Section */}
              {duplicates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-primary" /> Exact Duplicates ({duplicates.reduce((sum, group) => sum + group.duplicates.length, 0)})
                  </h3>
                  <p className="text-sm text-muted-foreground">These files are byte-identical copies. Keep one, delete the rest.</p>
                  <div className="h-64 border rounded-md overflow-auto p-4 bg-background">
                    {duplicates.map((group) => (
                      <div key={group.original.id} className="mb-4 border-b pb-2 last:border-b-0 last:pb-0">
                        <p className="font-medium text-sm mb-1">Original: {group.original.fileName}</p>
                        {group.duplicates.map(dup => {
                          const displayDup = allScannedFiles.find(f => f.id === dup.id);
                          const displayOriginal = allScannedFiles.find(f => f.id === group.original.id);
                          return displayDup && displayOriginal ? renderFileItem(displayDup, 'duplicate', group.original.id, displayOriginal) : null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Images Section */}
              {similarImages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Similar Images ({similarImages.reduce((sum, group) => sum + group.similar.length, 0)})
                  </h3>
                  <p className="text-sm text-muted-foreground">These images are visually similar. Review and decide which to keep.</p>
                  <div className="h-64 border rounded-md overflow-auto p-4 bg-background">
                    {similarImages.map((group) => (
                      <div key={group.original.id} className="mb-4 border-b pb-2 last:border-b-0 last:pb-0">
                        <p className="font-medium text-sm mb-1">Original: {group.original.fileName}</p>
                        {group.similar.map(sim => {
                          const displaySim = allScannedFiles.find(f => f.id === sim.id);
                          const displayOriginal = allScannedFiles.find(f => f.id === group.original.id);
                          return displaySim && displayOriginal ? renderFileItem(displaySim, 'similar', group.original.id, displayOriginal) : null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {duplicates.length === 0 && similarImages.length === 0 && brokenFiles.length === 0 && allScannedFiles.length > 0 && (
                <p className="text-center text-muted-foreground">No duplicates, similar images, or broken files found. Your folder is clean!</p>
              )}

              {duplicates.length === 0 && similarImages.length === 0 && brokenFiles.length === 0 && allScannedFiles.length === 0 && (
                <p className="text-center text-muted-foreground">Upload a folder to start scanning.</p>
              )}
            </>
          )}

          <Button
            onClick={handleDownload}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!jobId || allScannedFiles.length === 0 || isProcessing}
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