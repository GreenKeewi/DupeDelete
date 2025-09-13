import { performComprehensiveScan } from "@/lib/duplicate-detection";
import { cleanupTempDir, createTempDir, getFilesInDir } from "@/lib/file-utils";
import { ComprehensiveScanResult, DetectionConfig } from "@/types/detection";
import * as fs from "fs";
import { promises as fsp } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import unzipper from "unzipper";

// Set the maximum file size for uploads (e.g., 1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

// Note: In Next.js 13+ App Router, bodyParser config is not needed
// The request body is automatically parsed as FormData for multipart/form-data requests

export async function POST(req: Request) {
  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;

  // Set a timeout for the entire operation (5 minutes)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Request timeout after 5 minutes")),
      5 * 60 * 1000
    );
  });

  try {
    console.log("[Detect Duplicates API] Starting request processing...");

    // Race between the actual processing and timeout
    const result = await Promise.race([processRequest(req), timeoutPromise]);

    return result as NextResponse;
  } catch (error) {
    console.error(
      "[Detect Duplicates API] Error processing comprehensive detection:",
      error
    );
    console.error(
      "[Detect Duplicates API] Error stack:",
      (error as Error).stack
    );
    console.error("[Detect Duplicates API] Error name:", (error as Error).name);
    console.error(
      "[Detect Duplicates API] Error message:",
      (error as Error).message
    );

    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath).catch((err) =>
        console.error("Failed to clean up extracted dir in error handler:", err)
      );
    }

    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Internal Server Error: ${(error as Error).message}`
        : "Internal Server Error. Please try again later.";

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: (error as Error).stack,
          details: error,
        }),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function processRequest(req: Request): Promise<NextResponse> {
  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;

  try {
    console.log("[Detect Duplicates API] Starting request processing...");

    if (req.method !== "POST") {
      console.log("[Detect Duplicates API] Method not allowed:", req.method);
      return new NextResponse(
        JSON.stringify({ success: false, error: "Method Not Allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[Detect Duplicates API] Parsing form data...");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    console.log(
      "[Detect Duplicates API] File received:",
      file ? { name: file.name, size: file.size, type: file.type } : "null"
    );

    const url = new URL(req.url);
    const similarityThreshold = url.searchParams.get("similarityThreshold");
    const ssimThreshold = url.searchParams.get("ssimThreshold");
    const normalizedSize = url.searchParams.get("normalizedSize");

    const detectionConfig: DetectionConfig = {};
    if (similarityThreshold)
      detectionConfig.similarityThreshold = parseInt(similarityThreshold);
    if (ssimThreshold)
      detectionConfig.ssimThreshold = parseFloat(ssimThreshold);
    if (normalizedSize)
      detectionConfig.normalizedSize = parseInt(normalizedSize);

    if (!file) {
      console.log("[Detect Duplicates API] No file uploaded");
      return new NextResponse(
        JSON.stringify({ success: false, error: "No file uploaded." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `File size exceeds the limit of ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    if (
      file.type !== "application/zip" &&
      file.type !== "application/x-zip-compressed"
    ) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Only ZIP files are allowed.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const jobId = path.basename(await createTempDir());
    extractedDirPath = path.join(await createTempDir(jobId + "-extracted-"));
    console.log(
      `[Detect Duplicates API] Job ID: ${jobId}, Extracted Dir: ${extractedDirPath}`
    );

    tempZipPath = path.join(extractedDirPath, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);
    console.log(`[Detect Duplicates API] Zip file saved to: ${tempZipPath}`);

    console.log(`[Detect Duplicates API] Starting zip extraction...`);
    await fs
      .createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: extractedDirPath }))
      .promise();
    console.log(
      `[Detect Duplicates API] Zip file extracted to: ${extractedDirPath}`
    );

    const allFilePaths = await getFilesInDir(extractedDirPath);
    console.log(
      `[Detect Duplicates API] All files found in extracted dir (${allFilePaths.length}):`,
      allFilePaths
    );

    const filesToScan = allFilePaths.filter((p) => p !== tempZipPath);
    console.log(
      `[Detect Duplicates API] Files to scan after filtering zip (${filesToScan.length}):`,
      filesToScan
    );

    if (filesToScan.length > 100) {
      await cleanupTempDir(extractedDirPath);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error:
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
      `[Detect Duplicates API] Files with relative paths for scanning (${filesWithRelativePaths.length}):`,
      filesWithRelativePaths
    );

    console.log(`[Detect Duplicates API] Starting comprehensive scan...`);
    const scanResult: ComprehensiveScanResult = await performComprehensiveScan(
      jobId,
      filesWithRelativePaths,
      detectionConfig
    );
    console.log(
      `[Detect Duplicates API] Comprehensive scan completed. Results:`,
      {
        duplicates: scanResult.duplicates.length,
        similarImages: scanResult.similarImages.length,
        brokenFiles: scanResult.brokenFiles.length,
        totalFilesScanned: scanResult.totalFilesScanned,
      }
    );

    if (tempZipPath) {
      await fsp
        .unlink(tempZipPath)
        .catch((err) => console.error("Failed to delete temp zip:", err));
    }

    return NextResponse.json(
      {
        success: true,
        jobId: scanResult.jobId,
        duplicates: scanResult.duplicates,
        similarImages: scanResult.similarImages,
        brokenFiles: scanResult.brokenFiles,
        totalFilesScanned: scanResult.totalFilesScanned,
        summary: scanResult.summary,
        detectionConfig: {
          similarityThreshold: detectionConfig.similarityThreshold || 5,
          ssimThreshold: detectionConfig.ssimThreshold || 0.9,
          normalizedSize: detectionConfig.normalizedSize || 256,
        },
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Detect Duplicates API] Error in processRequest:", error);
    console.error(
      "[Detect Duplicates API] Error stack:",
      (error as Error).stack
    );
    console.error("[Detect Duplicates API] Error name:", (error as Error).name);
    console.error(
      "[Detect Duplicates API] Error message:",
      (error as Error).message
    );

    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath).catch((err) =>
        console.error("Failed to clean up extracted dir in error handler:", err)
      );
    }

    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Internal Server Error: ${(error as Error).message}`
        : "Internal Server Error. Please try again later.";

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: (error as Error).stack,
          details: error,
        }),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
