import { NextResponse } from 'next/server';
import { promises as fsp } from 'fs';
import * as fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { createTempDir, cleanupTempDir, getFilesInDir } from '@/lib/file-utils';
import { scanFilesForDuplicates, DuplicateGroup as BackendDuplicateGroup, ScannedFile } from '@/lib/duplicate-detection';

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
  if (req.method !== 'POST') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse('No file uploaded.', { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`, { status: 413 });
    }

    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return new NextResponse('Only ZIP files are allowed.', { status: 400 });
    }

    // Create a temporary directory for this job
    const jobId = path.basename(await createTempDir()); // Use the generated UUID as jobId
    extractedDirPath = path.join(await createTempDir(jobId + '-extracted-')); // Create a dedicated extracted dir for this job

    // Save the uploaded zip file temporarily
    tempZipPath = path.join(extractedDirPath, file.name); // Store zip inside the job's extracted dir
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);

    // Extract the zip file
    await fs.createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: extractedDirPath }))
      .promise();

    // Get all files from the extracted directory
    const allFilePaths = await getFilesInDir(extractedDirPath);

    // Filter out the original zip file from the list of files to scan
    const filesToScan = allFilePaths.filter(p => p !== tempZipPath);

    // Enforce the 100-file limit
    if (filesToScan.length > 100) {
      // Clean up immediately if limit exceeded
      await cleanupTempDir(extractedDirPath);
      return new NextResponse(JSON.stringify({
        message: 'File limit exceeded. Please upgrade to clean more than 100 files.',
        redirect: '/pricing',
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const filesWithRelativePaths = await Promise.all(filesToScan.map(async (fullPath) => {
      const stats = await fsp.stat(fullPath);
      return {
        fullPath,
        relativePath: path.relative(extractedDirPath!, fullPath),
        size: stats.size,
      };
    }));

    const backendDuplicateGroups: BackendDuplicateGroup[] = await scanFilesForDuplicates(filesWithRelativePaths);

    // Format the duplicate groups for the frontend
    const frontendDuplicates: FrontendDuplicateFile[] = [];
    const allScannedFilesForFrontend: ScannedFile[] = []; // To store all scanned files for frontend lookup

    // Collect all scanned files first
    for (const group of backendDuplicateGroups) {
      allScannedFilesForFrontend.push(group.original);
      group.duplicates.forEach(dup => allScannedFilesForFrontend.push(dup));
    }
    // Add any unique files that weren't part of a duplicate group
    const uniqueFiles = filesWithRelativePaths.filter(f => !allScannedFilesForFrontend.some(s => s.fullPath === f.fullPath));
    for (const file of uniqueFiles) {
      // Re-hash to get the ScannedFile structure, or just create a minimal one
      // For simplicity, we'll just add the ones that are part of a group or are originals.
      // The frontend's `uploadedFiles` state will hold all initial files.
    }


    // Now, populate frontendDuplicates
    for (const group of backendDuplicateGroups) {
      group.duplicates.forEach(dup => {
        frontendDuplicates.push({
          id: dup.id,
          fileName: dup.fileName,
          relativePath: dup.relativePath,
          type: dup.type,
          originalFileId: group.original.id, // Link to the original file's ID
        });
      });
    }

    // Clean up the temporary zip file, but keep the extracted directory for cleanup process
    if (tempZipPath) {
      await fsp.unlink(tempZipPath).catch(err => console.error("Failed to delete temp zip:", err));
    }

    return NextResponse.json({ jobId, duplicateGroups: frontendDuplicates, allScannedFiles: allScannedFilesForFrontend });
  } catch (error) {
    console.error('Error processing upload:', error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}