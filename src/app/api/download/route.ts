import { NextResponse } from "next/server";
import JSZip from "jszip";
import { promises as fs } from 'fs';
import path from 'path';
import { getTempFilePath, cleanupTempDir } from '@/lib/file-utils';

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let extractedDirPath: string | undefined;

  try {
    const { jobId, filesToKeep } = await req.json();
    console.log("Files to keep for download:", filesToKeep);

    if (!jobId || !Array.isArray(filesToKeep)) {
      return new NextResponse(JSON.stringify({ message: "Invalid request body: jobId and filesToKeep are required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    extractedDirPath = path.join(process.env.TEMP_BASE_DIR || path.join(require('os').tmpdir(), 'dupe-delete-temp'), jobId + '-extracted-');

    const zip = new JSZip();
    
    for (const relativePath of filesToKeep) {
      const fullPath = path.join(extractedDirPath, relativePath);
      try {
        const fileContent = await fs.readFile(fullPath);
        zip.file(relativePath, fileContent);
      } catch (readError) {
        console.warn(`Could not read file ${fullPath} for zipping:`, readError);
        // Optionally, add a placeholder or log this to the user
      }
    }

    const zipBlob = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="cleaned-folder.zip"`,
      },
    });
  } catch (error) {
    console.error("Error in /api/download:", error);
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    if (extractedDirPath) {
      // Clean up the temporary directory after download
      await cleanupTempDir(extractedDirPath).catch(err => console.error("Failed to clean up after download:", err));
    }
  }
}