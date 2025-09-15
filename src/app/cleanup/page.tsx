"use client";
import { DuplicateComparisonDialog } from "@/components/DuplicateComparisonDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScannedFile } from "@/lib/duplicate-detection";
import JSZip from "jszip";
import { Download, Eye, Image as ImageIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FrontendDuplicateFile {
  id: string;
  fileName: string;
  relativePath: string;
  type: "image" | "other";
  previewUrl?: string;
  originalFileId?: string;
  detectionMethod?: "MD5" | "pHash" | "SSIM";
}

export default function CleanupPageContent() {
  // Renamed to CleanupPageContent
  const [uploadedFiles, setUploadedFiles] = useState<ScannedFile[]>([]);
  const [duplicates, setDuplicates] = useState<FrontendDuplicateFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    phase:
      | "idle"
      | "zipping"
      | "uploading"
      | "scanning"
      | "processing"
      | "done";
    percent: number;
  }>({ phase: "idle", percent: 0 });
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<{
    original: ScannedFile;
    duplicate: ScannedFile;
  } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [similarityMode, setSimilarityMode] = useState<
    "strict" | "balanced" | "loose"
  >("balanced");
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [customPHash, setCustomPHash] = useState<string>("");
  const [customSSIM, setCustomSSIM] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    return () => {
      uploadedFiles.forEach((file) => {
        if (file.type === "image" && file.fullPath.startsWith("blob:")) {
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

    if (filesArray.length > 100) {
      toast.warning(
        "You've reached the free limit. Redirecting to upgrade options."
      );
      router.push("/dashboard/pricing"); // Redirect to dashboard pricing
      return;
    }

    setIsProcessing(true);
    setProgress({ phase: "zipping", percent: 0 });
    setDuplicates([]);
    setUploadedFiles([]);
    setSelectedForComparison(null);
    setJobId(null);
    toast.loading("Zipping and uploading your folder...", {
      id: "upload-scan",
    });

    const zip = new JSZip();
    for (const file of filesArray) {
      const filePathInZip = file.webkitRelativePath || file.name;
      zip.file(filePathInZip, file);
    }

    let zippedBlob: Blob;
    try {
      zippedBlob = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setProgress({
          phase: "zipping",
          percent: Math.round(metadata.percent),
        });
      });
    } catch (zipError) {
      console.error("Error zipping files:", zipError);
      toast.error("Failed to zip files for upload.", { id: "upload-scan" });
      setIsProcessing(false);
      setProgress({ phase: "idle", percent: 0 });
      return;
    }

    const formData = new FormData();
    formData.append("file", zippedBlob, "uploaded_folder.zip");
    formData.append("mode", similarityMode);
    // Only include custom thresholds when Advanced mode is enabled
    if (advancedMode) {
      if (customPHash.trim())
        formData.append("pHashThreshold", customPHash.trim());
      if (customSSIM.trim())
        formData.append("ssimThreshold", customSSIM.trim());
    }

    try {
      // Use XHR to observe upload progress
      const uploadResult = await new Promise<{
        ok: boolean;
        status: number;
        contentType: string;
        text: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.responseType = "text";

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percent = Math.round((evt.loaded / evt.total) * 100);
            setProgress({ phase: "uploading", percent });
          }
        };
        xhr.upload.onload = () => {
          // Upload complete, server is scanning now
          setProgress({ phase: "scanning", percent: 100 });
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 2) {
            // headers received
            setProgress((p) =>
              p.phase === "uploading"
                ? { phase: "scanning", percent: p.percent }
                : p
            );
          }
        };
        xhr.onload = () => {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            contentType: xhr.getResponseHeader("content-type") || "",
            text: xhr.responseText || "",
          });
        };
        xhr.send(formData);
      });

      if (!uploadResult.ok) {
        let message = "Failed to upload and scan files.";
        try {
          const contentType = uploadResult.contentType || "";
          if (contentType.includes("application/json")) {
            const errorData = JSON.parse(uploadResult.text);
            if (uploadResult.status === 403 && errorData.redirect) {
              toast.warning(errorData.message, { id: "upload-scan" });
              router.push("/dashboard/pricing");
              return;
            }
            message = errorData.message || message;
          } else {
            if (uploadResult.text) message = uploadResult.text;
          }
        } catch {}
        throw new Error(message);
      }

      const {
        jobId: returnedJobId,
        duplicateGroups,
        allScannedFiles,
      } = JSON.parse(uploadResult.text);
      setJobId(returnedJobId);
      setProgress({ phase: "processing", percent: 100 });

      const filesWithPreviews: ScannedFile[] = allScannedFiles.map(
        (file: ScannedFile) => {
          if (file.type === "image") {
            return {
              ...file,
              fullPath: `/api/preview?jobId=${returnedJobId}&relativePath=${encodeURIComponent(
                file.relativePath
              )}`,
            };
          }
          return file;
        }
      );
      setUploadedFiles(filesWithPreviews);

      let formattedDuplicates: FrontendDuplicateFile[] = duplicateGroups.map(
        (dup: FrontendDuplicateFile) => {
          const duplicateScannedFile = filesWithPreviews.find(
            (f) => f.id === dup.id
          );
          return {
            ...dup,
            previewUrl: duplicateScannedFile?.fullPath,
            detectionMethod: dup.detectionMethod,
          };
        }
      );

      // Client-side fallback: if server returned no duplicates, derive MD5 duplicates from allScannedFiles
      if (formattedDuplicates.length === 0 && filesWithPreviews.length > 0) {
        const md5Map = new Map<string, ScannedFile[]>();
        for (const f of filesWithPreviews) {
          const list = md5Map.get(f.md5Hash) || [];
          list.push(f);
          md5Map.set(f.md5Hash, list);
        }
        const fallback: FrontendDuplicateFile[] = [];
        for (const [, group] of md5Map) {
          if (group.length > 1) {
            const original = group[0];
            const dups = group.slice(1);
            for (const d of dups) {
              fallback.push({
                id: d.id,
                fileName: d.fileName,
                relativePath: d.relativePath,
                type: d.type,
                originalFileId: original.id,
                previewUrl: d.type === "image" ? d.fullPath : undefined,
                detectionMethod: "MD5",
              });
            }
          }
        }
        formattedDuplicates = fallback;
      }

      setDuplicates(formattedDuplicates);

      toast.success("Scan complete! Review duplicate images below.", {
        id: "upload-scan",
      });
      setProgress({ phase: "done", percent: 100 });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload and scan files.", {
        id: "upload-scan",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = () => {
    setDuplicates([]);
    toast.success("All duplicate images marked for deletion.");
  };

  const handleKeepFile = (id: string) => {
    setDuplicates(duplicates.filter((dup) => dup.id !== id));
    toast.info("Image marked to keep.");
  };

  const handleDeleteFile = (id: string) => {
    setDuplicates(duplicates.filter((dup) => dup.id !== id));
    toast.success("Image marked for deletion.");
  };

  const handleCompare = (duplicate: FrontendDuplicateFile) => {
    if (duplicate.originalFileId) {
      const original = uploadedFiles.find(
        (file) => file.id === duplicate.originalFileId
      );
      const duplicateFull = uploadedFiles.find(
        (file) => file.id === duplicate.id
      );
      if (original && duplicateFull) {
        setSelectedForComparison({ original, duplicate: duplicateFull });
        setIsCompareDialogOpen(true);
      } else {
        toast.error("Original or duplicate image for comparison not found.");
      }
    } else {
      toast.info(
        "This duplicate does not have a linked original for comparison."
      );
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
      const filesToKeep = uploadedFiles.filter(
        (file) => !duplicates.some((dup) => dup.id === file.id)
      );
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          filesToKeep: filesToKeep.map((f) => f.relativePath),
        }),
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
      toast.success("Cleaned folder downloaded successfully!", {
        id: "download-zip",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download cleaned folder.", { id: "download-zip" });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {" "}
      {/* Removed container and min-h styling */}
      {/* Upload Area */}
      <Card className="flex-1 p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="text-2xl">Upload Your Folder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 w-full max-w-md">
          <Label
            htmlFor="folder-upload"
            className="cursor-pointer text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
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
          {/* Similarity controls */
          /* Simplified by default; reveal advanced tuning on demand */}
          <div className="w-full grid grid-cols-1 gap-3 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Similarity mode</Label>
              <div className="flex gap-2">
                {(["strict", "balanced", "loose"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSimilarityMode(m)}
                    className={`px-2 py-1 text-xs rounded border ${
                      similarityMode === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    disabled={isProcessing}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="advanced-mode"
                  checked={advancedMode}
                  onCheckedChange={(checked) =>
                    setAdvancedMode(Boolean(checked))
                  }
                  disabled={isProcessing}
                />
                <Label htmlFor="advanced-mode" className="text-sm">
                  Advanced mode
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Presets first; tweak only if needed
              </p>
            </div>
            {advancedMode && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="phash" className="text-xs">
                      pHash threshold
                    </Label>
                    <Input
                      id="phash"
                      placeholder="Default depends on mode (e.g. 5)"
                      value={customPHash}
                      onChange={(e) => setCustomPHash(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ssim" className="text-xs">
                      SSIM threshold
                    </Label>
                    <Input
                      id="ssim"
                      placeholder="Default depends on mode (e.g. 0.9)"
                      value={customSSIM}
                      onChange={(e) => setCustomSSIM(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lower pHash or higher SSIM means stricter matching; raise pHash or lower SSIM to be looser.
                </p>
              </>
            )}
          </div>
          {(isProcessing || progress.phase !== "idle") && (
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {progress.phase === "zipping" && "Zipping files..."}
                  {progress.phase === "uploading" && "Uploading..."}
                  {progress.phase === "scanning" &&
                    "Scanning for duplicates..."}
                  {progress.phase === "processing" && "Finalizing..."}
                  {progress.phase === "done" && "Completed"}
                </span>
                <span>
                  {progress.phase === "scanning" ? "" : `${progress.percent}%`}
                </span>
              </div>
              <Progress
                value={
                  progress.phase === "scanning"
                    ? (undefined as any)
                    : progress.percent
                }
              />
            </div>
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
              <p className="text-center text-muted-foreground">
                Scanning for duplicate images...
              </p>
            ) : duplicates.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No duplicate images found. Upload a folder to start.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  {duplicates.length} duplicate
                  {duplicates.length !== 1 ? "s" : ""} found.
                </p>
                {duplicates.map((dup) => (
                  <div
                    key={dup.id}
                    className="flex justify-between items-center border-b last:border-b-0 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {dup.type === "image" && dup.previewUrl ? (
                        <img
                          src={dup.previewUrl}
                          alt={dup.fileName}
                          className="h-10 w-10 object-cover rounded-md"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                      <span className="text-foreground text-sm md:text-base">
                        {dup.fileName}
                      </span>
                      {dup.detectionMethod && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({dup.detectionMethod})
                        </span>
                      )}
                    </div>
                    <div className="space-x-2 flex">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompare(dup)}
                        disabled={!dup.originalFileId}
                      >
                        <Eye className="mr-1 h-4 w-4" /> Compare
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeepFile(dup.id)}
                      >
                        Keep
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFile(dup.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </>
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
    </div>
  );
}
