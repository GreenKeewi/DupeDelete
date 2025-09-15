import { scanFilesForDuplicates, ScannedFile } from "@/lib/duplicate-detection";
import { cleanupTempDir, createTempDir, getFilesInDir } from "@/lib/file-utils";
import * as fs from "fs";
import { promises as fsp } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import unzipper from "unzipper";

// Removed: require('events').EventEmitter.defaultMaxListeners = 30;
// This global override is removed to encourage proper stream management.

// Declare module for unzipper is now in src/types/unzipper.d.ts

// Set the maximum file size for uploads (e.g., 1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle file streams
  },
};

// Define the structure for files sent to the frontend
interface FrontendDuplicateFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  type: "image" | "other";
  originalFileId?: string; // Link to its original for comparison
}

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;
  let jobId: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Optional tuning parameters sent by client
    const mode = formData.get("mode") as string | null as
      | "strict"
      | "balanced"
      | "loose"
      | null;
    const pHashThreshold = formData.get("pHashThreshold")
      ? Number(formData.get("pHashThreshold"))
      : undefined;
    const ssimThreshold = formData.get("ssimThreshold")
      ? Number(formData.get("ssimThreshold"))
      : undefined;

    if (!file) {
      return new NextResponse(
        JSON.stringify({ message: "No file uploaded." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        JSON.stringify({
          message: `File size exceeds the limit of ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    const isZipByType =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.type === "application/octet-stream" ||
      file.type === "";
    const isZipByName = (file as any).name?.toLowerCase?.().endsWith(".zip");
    if (!isZipByType && !isZipByName) {
      return new NextResponse(
        JSON.stringify({ message: "Only ZIP files are allowed." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a temporary directory for this job
    const baseTemp = await createTempDir("job-");
    jobId = path.basename(baseTemp);
    extractedDirPath = path.join(path.dirname(baseTemp), jobId + "-extracted-");
    await fsp.mkdir(extractedDirPath, { recursive: true });
    // Remove the unused baseTemp dir to avoid leaks
    try {
      await fsp.rm(baseTemp, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Failed to remove base temp dir ${baseTemp}:`, err);
    }
    console.log(
      `[Upload API] Job ID: ${jobId}, Extracted Dir: ${extractedDirPath}`
    );

    // Save the uploaded zip file temporarily
    tempZipPath = path.join(extractedDirPath, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);
    console.log(`[Upload API] Zip file saved to: ${tempZipPath}`);

    // Extract the zip file with explicit error and close handling
    const zipStream = fs.createReadStream(tempZipPath);
    const unzipExtractor = unzipper.Extract({ path: extractedDirPath });

    await new Promise<void>((resolve, reject) => {
      zipStream.pipe(unzipExtractor)
        .on('error', (err: Error) => { // Fixed: Explicitly type 'err' as Error
          console.error(`[Upload API] Error during unzipping: ${err.message}`);
          reject(err);
        })
        .on('close', () => {
          console.log(`[Upload API] Unzipping completed for ${tempZipPath}`);
          resolve();
        });
    });
    console.log(`[Upload API] Zip file extracted to: ${extractedDirPath}`);

    // Get all files from the extracted directory
    const allFilePaths = await getFilesInDir(extractedDirPath);
    console.log(
      `[Upload API] All files found in extracted dir (${allFilePaths.length}):`,
      allFilePaths
    );

    // Filter out the original zip file from the list of files to scan
    const filesToScan = allFilePaths.filter((p) => p !== tempZipPath);
    console.log(
      `[Upload API] Files to scan after filtering zip (${filesToScan.length}):`,
      filesToScan
    );

    // Enforce the 100-file limit
    if (filesToScan.length > 100) {
      // Clean up immediately if limit exceeded
      await cleanupTempDir(extractedDirPath);
      return new NextResponse(
        JSON.stringify({
          message:
            "File limit exceeded. Please upgrade to clean more than 100 files.",
          redirect: "/pricing",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const filesWithRelativePaths = await Promise.all(
      filesToScan.map(async (fullPath) => {
        const stats = await fsp.stat(fullPath);
        return {
          fullPath,
          relativePath: path.relative(extractedDirPath!, fullPath),
          size: stats.size,
        };
      })
    );
    console.log(
      `[Upload API] Files with relative paths for scanning (${filesWithRelativePaths.length}):`,
      filesWithRelativePaths
    );

    const { duplicateGroups: backendDuplicateGroups, allScannedFiles } =
      await scanFilesForDuplicates(filesWithRelativePaths, {
        mode: mode ?? undefined,
        pHashThreshold,
        ssimThreshold,
      });
    console.log(
      `[Upload API] Duplicate groups found by backend (${backendDuplicateGroups.length}). Total scanned files: ${allScannedFiles.length}`
    );

    // Format the duplicate groups for the frontend
    const frontendDuplicates: FrontendDuplicateFile[] = [];
    const allScannedFilesForFrontend: ScannedFile[] = allScannedFiles;

    for (const group of backendDuplicateGroups) {
      group.duplicates.forEach((dup) => {
        frontendDuplicates.push({
          id: dup.id,
          fileName: dup.fileName,
          relativePath: dup.relativePath,
          type: dup.type,
          originalFileId: group.original.id,
          ...(dup.detectionMethod
            ? { detectionMethod: dup.detectionMethod }
            : {}),
        });
      });
    }

    return NextResponse.json({
      jobId,
      duplicateGroups: frontendDuplicates,
      allScannedFiles: allScannedFilesForFrontend,
    });
  } catch (error: unknown) { // Fixed: Explicitly type 'error' as unknown
    console.error("Error processing upload:", error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath);
    }
    // Fixed: Use a type guard to safely access error.message
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(
      JSON.stringify({ message: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    // Clean up the temporary zip file and extracted directory in the finally block
    if (tempZipPath) {
      await fsp
        .unlink(tempZipPath)
        .catch((err) => console.warn("Failed to delete temp zip:", err));
    }
    if (extractedDirPath) {
      // Only clean up the extracted directory if no jobId was successfully created,
      // or if an error occurred before the cleanup process could start.
      // The /api/download route is responsible for cleaning up the extractedDirPath
      // after the user downloads the cleaned folder.
      // If an error occurs *before* a successful response, we should clean up.
      // If the process completes successfully, the extractedDirPath is kept for download.
      // This logic needs to be careful not to delete files needed for download.
      // For now, I'll keep the existing cleanup in /api/download and only add tempZipPath cleanup here.
      // If the error happens *after* jobId is set and before response, the download cleanup will handle it.
    }
  }
}