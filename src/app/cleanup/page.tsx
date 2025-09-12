"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Image as ImageIcon } from "lucide-react";

interface DuplicateFile {
  id: string;
  fileName: string;
  path: string; // Original path, for context
  type: "image" | "other"; // e.g., "image", "other"
  previewUrl?: string; // For images, a URL to display the preview
}

export default function CleanupPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Clean up object URLs when component unmounts or duplicates change
  useEffect(() => {
    return () => {
      duplicates.forEach(dup => {
        if (dup.previewUrl) {
          URL.revokeObjectURL(dup.previewUrl);
        }
      });
    };
  }, [duplicates]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploaded = Array.from(e.target.files);

    if (uploaded.length === 0) {
      toast.info("No files selected.");
      return;
    }

    if (uploaded.length > 100) {
      toast.warning("You've reached the free limit. Redirecting to upgrade options.");
      router.push("/pricing");
      return;
    }

    setFiles(uploaded);
    setIsProcessing(true);
    setDuplicates([]); // Clear previous duplicates
    toast.loading("Uploading and scanning for duplicates...", { id: "upload-scan" });

    // Process files to create preview URLs for images
    const processedFiles: DuplicateFile[] = await Promise.all(uploaded.map(async (file, index) => {
      const fileType = file.type.startsWith("image/") ? "image" : "other";
      let previewUrl: string | undefined;

      if (fileType === "image") {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id: `${file.name}-${index}`, // Simple unique ID
        fileName: file.name,
        path: `/${file.webkitRelativePath || file.name}`, // Use webkitRelativePath for folder structure
        type: fileType,
        previewUrl,
      };
    }));

    // Simulate backend processing for duplicate detection
    setTimeout(() => {
      // TODO: Replace with actual backend call for duplicate detection
      // For demonstration, let's create some mock duplicates from the uploaded files.
      // We'll assume some files are duplicates of others.
      const mockDuplicates: DuplicateFile[] = [];
      if (processedFiles.length >= 2) {
        // Example: if there are at least 2 files, mark the 2nd file as a duplicate
        mockDuplicates.push({ ...processedFiles[1], id: `dup-${processedFiles[1].id}` });
      }
      if (processedFiles.length >= 4) {
        // Example: if there are at least 4 files, mark the 4th file as a duplicate
        mockDuplicates.push({ ...processedFiles[3], id: `dup-${processedFiles[3].id}` });
      }
      
      // Filter out duplicates that might have been added multiple times if the original file was also a duplicate
      const uniqueDuplicates = Array.from(new Map(mockDuplicates.map(item => [item.fileName, item])).values());

      setDuplicates(uniqueDuplicates);
      setIsProcessing(false);
      toast.success("Scan complete! Review duplicates below.", { id: "upload-scan" });
    }, 3000);
  };

  const handleDeleteAll = () => {
    setDuplicates([]); // Clear all duplicates
    toast.success("All duplicates marked for deletion.");
  };

  const handleKeepFile = (id: string) => {
    setDuplicates(duplicates.filter(dup => dup.id !== id));
    toast.info("File marked to keep.");
  };

  const handleDeleteFile = (id: string) => {
    setDuplicates(duplicates.filter(dup => dup.id !== id)); // Remove from duplicates list
    toast.success("File marked for deletion.");
  };

  const handleDownload = async () => {
    if (isProcessing) {
      toast.error("Please wait for the current operation to finish.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload a folder first.");
      return;
    }

    toast.loading("Preparing your cleaned folder...", { id: "download-zip" });
    try {
      // Send the list of files to keep/delete to the backend
      // For a real application, you'd send identifiers that the backend can use to locate the actual files.
      // Here, we're just sending file names for a mock.
      const filesToKeep = files.filter(file => !duplicates.some(dup => dup.fileName === file.name));
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filesToKeep: filesToKeep.map(f => f.name) }),
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
          {files.length > 0 && (
            <p className="text-sm text-primary">
              {files.length} files selected.
            </p>
          )}
        </CardContent>
      </Card>

      {/* File Review Area */}
      <Card className="flex-1 p-6 space-y-6">
        <CardHeader>
          <CardTitle className="text-2xl">Review Duplicates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDeleteAll}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={duplicates.length === 0 || isProcessing}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete All Duplicates
          </Button>

          <div className="h-64 border rounded-md overflow-auto p-4 bg-background">
            {isProcessing ? (
              <p className="text-center text-muted-foreground">Scanning for duplicates...</p>
            ) : duplicates.length === 0 ? (
              <p className="text-center text-muted-foreground">No duplicates found. Upload a folder to start.</p>
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
            disabled={files.length === 0 || isProcessing}
          >
            <Download className="mr-2 h-4 w-4" /> Download Cleaned Folder
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}