import { NextResponse } from 'next/server';
import { promises as fsp } from 'fs';
import * as fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { createTempDir, cleanupTempDir, getFilesInDir } from '@/lib/file-utils';
import { scanFilesForDuplicates, DetectionConfig } from '@/lib/duplicate-detection';

// Set the maximum file size for uploads (e.g., 1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle file streams
  },
};

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return new NextResponse(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    // Get detection configuration from query parameters
    const url = new URL(req.url);
    const similarityThreshold = url.searchParams.get('similarityThreshold');
    const ssimThreshold = url.searchParams.get('ssimThreshold');
    const normalizedSize = url.searchParams.get('normalizedSize');
    
    const detectionConfig: DetectionConfig = {};
    if (similarityThreshold) detectionConfig.similarityThreshold = parseInt(similarityThreshold);
    if (ssimThreshold) detectionConfig.ssimThreshold = parseFloat(ssimThreshold);
    if (normalizedSize) detectionConfig.normalizedSize = parseInt(normalizedSize);

    if (!file) {
      return new NextResponse(JSON.stringify({ message: 'No file uploaded.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(JSON.stringify({ message: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return new NextResponse(JSON.stringify({ message: 'Only ZIP files are allowed.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Create a temporary directory for this job
    const jobId = path.basename(await createTempDir()); // Use the generated UUID as jobId
    extractedDirPath = path.join(await createTempDir(jobId + '-extracted-')); // Create a dedicated extracted dir for this job
    console.log(`[Detect Duplicates API] Job ID: ${jobId}, Extracted Dir: ${extractedDirPath}`);

    // Save the uploaded zip file temporarily
    tempZipPath = path.join(extractedDirPath, file.name); // Store zip inside the job's extracted dir
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);
    console.log(`[Detect Duplicates API] Zip file saved to: ${tempZipPath}`);

    // Extract the zip file
    await fs.createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: extractedDirPath }))
      .promise();
    console.log(`[Detect Duplicates API] Zip file extracted to: ${extractedDirPath}`);

    // Get all files from the extracted directory
    const allFilePaths = await getFilesInDir(extractedDirPath);
    console.log(`[Detect Duplicates API] All files found in extracted dir (${allFilePaths.length}):`, allFilePaths);

    // Filter out the original zip file from the list of files to scan
    const filesToScan = allFilePaths.filter(p => p !== tempZipPath);
    console.log(`[Detect Duplicates API] Files to scan after filtering zip (${filesToScan.length}):`, filesToScan);

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
    console.log(`[Detect Duplicates API] Files with relative paths for scanning (${filesWithRelativePaths.length}):`, filesWithRelativePaths);

    // Run duplicate detection with configurable parameters
    const duplicateGroups = await scanFilesForDuplicates(filesWithRelativePaths, detectionConfig);
    console.log(`[Detect Duplicates API] Duplicate groups found (${duplicateGroups.length}):`, duplicateGroups);

    // Clean up the temporary zip file, but keep the extracted directory for cleanup process
    if (tempZipPath) {
      await fsp.unlink(tempZipPath).catch(err => console.error("Failed to delete temp zip:", err));
    }

    // Return the duplicate groups with metadata
    return NextResponse.json({
      jobId,
      duplicateGroups,
      totalFiles: filesWithRelativePaths.length,
      duplicateCount: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      detectionConfig: {
        similarityThreshold: detectionConfig.similarityThreshold || 5,
        ssimThreshold: detectionConfig.ssimThreshold || 0.90,
        normalizedSize: detectionConfig.normalizedSize || 512,
      },
      summary: {
        md5Duplicates: duplicateGroups.filter(g => g.detectionMethod === 'MD5').length,
        pHashDuplicates: duplicateGroups.filter(g => g.detectionMethod === 'pHash').length,
        ssimDuplicates: duplicateGroups.filter(g => g.detectionMethod === 'SSIM').length,
      }
    });

  } catch (error) {
    console.error('Error processing duplicate detection:', error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath);
    }
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}