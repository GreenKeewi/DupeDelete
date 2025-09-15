import { scanFilesForDuplicates, ScannedFile } from "@/lib/duplicate-detection";
import { cleanupTempDir, createTempDir, getFilesInDir } from "@/lib/file-utils";
import * as fs from "fs";
import { promises as fsp } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import unzipper from "unzipper";

// Increase the default maximum number of event listeners to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 30; // Increased from default 10

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
    // Create a stable jobId and extracted dir under OS temp base
    const baseTemp = await createTempDir("job-");
    jobId = path.basename(baseTemp);
    // We want a sibling dir with suffix -extracted-
    extractedDirPath = path.join(path.dirname(baseTemp), jobId + "-extracted-");
    await fsp.mkdir(extractedDirPath, { recursive: true });
    // Remove the unused baseTemp dir to avoid leaks
    try {
      await fsp.rm(baseTemp, { recursive: true, force: true });
    } catch {}
    console.log(
      `[Upload API] Job ID: ${jobId}, Extracted Dir: ${extractedDirPath}`
    ); // Added logging

    // Save the uploaded zip file temporarily
    tempZipPath = path.join(extractedDirPath, file.name); // Store zip inside the job's extracted dir
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);
    console.log(`[Upload API] Zip file saved to: ${tempZipPath}`); // Added logging

    // Extract the zip file
    await fs
      .createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: extractedDirPath }))
      .promise();
    console.log(`[Upload API] Zip file extracted to: ${extractedDirPath}`); // Added logging

    // Get all files from the extracted directory
    const allFilePaths = await getFilesInDir(extractedDirPath);
    console.log(
      `[Upload API] All files found in extracted dir (${allFilePaths.length}):`,
      allFilePaths
    ); // Added logging

    // Filter out the original zip file from the list of files to scan
    const filesToScan = allFilePaths.filter((p) => p !== tempZipPath);
    console.log(
      `[Upload API] Files to scan after filtering zip (${filesToScan.length}):`,
      filesToScan
    ); // Added logging

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
    ); // Added logging

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
    const allScannedFilesForFrontend: ScannedFile[] = allScannedFiles; // Return everything scanned for UI

    // Now, populate frontendDuplicates
    for (const group of backendDuplicateGroups) {
      group.duplicates.forEach((dup) => {
        frontendDuplicates.push({
          id: dup.id,
          fileName: dup.fileName,
          relativePath: dup.relativePath,
          type: dup.type,
          originalFileId: group.original.id, // Link to the original file's ID
          // Surface how it was detected so UI can label it
          // (MD5 | pHash | SSIM)
          // dup already carries detectionMethod from the scanner
          ...(dup.detectionMethod
            ? { detectionMethod: dup.detectionMethod }
            : {}),
        });
      });
    }

    // Clean up the temporary zip file, but keep the extracted directory for cleanup process
    if (tempZipPath) {
      await fsp
        .unlink(tempZipPath)
        .catch((err) => console.error("Failed to delete temp zip:", err));
    }

    return NextResponse.json({
      jobId,
      duplicateGroups: frontendDuplicates,
      allScannedFiles: allScannedFilesForFrontend,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath);
    }
    return new NextResponse(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}