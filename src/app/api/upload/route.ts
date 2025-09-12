import { NextResponse } from 'next/server';
import { promises as fsp } from 'fs'; // Renamed to fsp for promise-based functions
import * as fs from 'fs'; // Imported standard fs for createReadStream
import path from 'path';
import unzipper from 'unzipper';
import { createTempDir, cleanupTempDir, getFilesInDir } from '@/lib/file-utils';
import { scanFilesForDuplicates, DuplicateGroup } from '@/lib/duplicate-detection';

// Declare module for unzipper is now in src/types/unzipper.d.ts

// Set the maximum file size for uploads (e.g., 1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle file streams
  },
};

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
    await fsp.writeFile(tempZipPath, buffer); // Use fsp for promise-based writeFile

    // Extract the zip file
    await fs.createReadStream(tempZipPath) // Use fs for createReadStream
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
      const stats = await fsp.stat(fullPath); // Use fsp for promise-based stat
      return {
        fullPath,
        relativePath: path.relative(extractedDirPath!, fullPath),
        size: stats.size,
      };
    }));

    const duplicateGroups: DuplicateGroup[] = await scanFilesForDuplicates(filesWithRelativePaths);

    // Clean up the temporary zip file, but keep the extracted directory for cleanup process
    if (tempZipPath) {
      await fsp.unlink(tempZipPath).catch(err => console.error("Failed to delete temp zip:", err)); // Use fsp for promise-based unlink
    }

    return NextResponse.json({ jobId, duplicateGroups });
  } catch (error) {
    console.error('Error processing upload:', error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath);
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}