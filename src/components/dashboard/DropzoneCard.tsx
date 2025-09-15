"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2 } from "lucide-react";
import JSZip from "jszip";

export const DropzoneCard = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    if (filesArray.length === 0) {
      toast.info("No files selected.");
      return;
    }

    setIsProcessing(true);
    toast.loading("Zipping and uploading your folder...", { id: "upload-scan" });

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
      
      // Store this data in local storage or a global state if needed for /cleanup
      // For now, we'll just redirect. The /cleanup page will need to fetch this data
      // or the upload API needs to be adjusted to store it server-side and retrieve by jobId.
      // For simplicity, we'll assume the /cleanup page will handle its own data fetching
      // or that the data is passed via query params (though large data is not ideal for query params).
      // A better approach would be to store the jobId in a cookie/session and let /cleanup fetch.
      // For now, we'll just redirect to cleanup.
      
      toast.success("Upload complete! Redirecting to cleanup...", { id: "upload-scan" });
      router.push("/dashboard/cleanup"); // Redirect to the cleanup page within the dashboard
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload and scan files.", { id: "upload-scan" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="flex-1 p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-muted/20 min-h-[300px]">
      <CardHeader>
        <CardTitle className="text-2xl">Upload Your Folder</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing files...</p>
          </div>
        ) : (
          <>
            <Label htmlFor="folder-upload" className="cursor-pointer text-lg text-muted-foreground hover:text-foreground transition-colors flex flex-col items-center gap-2">
              <UploadCloud className="h-12 w-12 text-primary" />
              Drag & drop a folder or click to select
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
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">Free limit: 100 files</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};