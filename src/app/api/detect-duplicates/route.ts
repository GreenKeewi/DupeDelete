import { NextResponse } from 'next/server';
import { promises as fsp } from 'fs';
import * as fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { createTempDir, cleanupTempDir, getFilesInDir } from '@/lib/file-utils';
import { performComprehensiveScan } from '@/lib/duplicate-detection';
import { DetectionConfig, ComprehensiveScanResult, ScannedFile } from '@/types/detection';

// Set the maximum file size for uploads (e.g., 1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle file streams
  },
};

export async function POST(req: Request) {
  let tempZipPath: string | undefined;
  let extractedDirPath: string | undefined;

  try {
    if (req.method !== 'POST') {
      return new NextResponse(JSON.stringify({ success: false, error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    const url = new URL(req.url);
    const similarityThreshold = url.searchParams.get('similarityThreshold');
    const ssimThreshold = url.searchParams.get('ssimThreshold');
    const normalizedSize = url.searchParams.get('normalizedSize');
    
    const detectionConfig: DetectionConfig = {};
    if (similarityThreshold) detectionConfig.similarityThreshold = parseInt(similarityThreshold);
    if (ssimThreshold) detectionConfig.ssimThreshold = parseFloat(ssimThreshold);
    if (normalizedSize) detectionConfig.normalizedSize = parseInt(normalizedSize);

    if (!file) {
      return new NextResponse(JSON.stringify({ success: false, error: 'No file uploaded.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(JSON.stringify({ success: false, error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return new NextResponse(JSON.stringify({ success: false, error: 'Only ZIP files are allowed.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const jobId = path.basename(await createTempDir());
    extractedDirPath = path.join(await createTempDir(jobId + '-extracted-'));
    console.log(`[Detect Duplicates API] Job ID: ${jobId}, Extracted Dir: ${extractedDirPath}`);

    tempZipPath = path.join(extractedDirPath, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(tempZipPath, buffer);
    console.log(`[Detect Duplicates API] Zip file saved to: ${tempZipPath}`);

    await fs.createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: extractedDirPath }))
      .promise();
    console.log(`[Detect Duplicates API] Zip file extracted to: ${extractedDirPath}`);

    const allFilePaths = await getFilesInDir(extractedDirPath);
    console.log(`[Detect Duplicates API] All files found in extracted dir (${allFilePaths.length}):`, allFilePaths);

    const filesToScan = allFilePaths.filter(p => p !== tempZipPath);
    console.log(`[Detect Duplicates API] Files to scan after filtering zip (${filesToScan.length}):`, filesToScan);

    if (filesToScan.length > 100) {
      await cleanupTempDir(extractedDirPath);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'File limit exceeded. Please upgrade to clean more than 100 files.',
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

    const scanResult: ComprehensiveScanResult = await performComprehensiveScan(jobId, filesWithRelativePaths, detectionConfig);
    console.log(`[Detect Duplicates API] Comprehensive scan result:`, scanResult);

    if (tempZipPath) {
      await fsp.unlink(tempZipPath).catch(err => console.error("Failed to delete temp zip:", err));
    }

    return NextResponse.json({
      success: true,
      jobId: scanResult.jobId,
      duplicates: scanResult.duplicates,
      similarImages: scanResult.similarImages,
      brokenFiles: scanResult.brokenFiles,
      totalFilesScanned: scanResult.totalFilesScanned,
      summary: scanResult.summary,
      detectionConfig: {
        similarityThreshold: detectionConfig.similarityThreshold || 5,
        ssimThreshold: detectionConfig.ssimThreshold || 0.90,
        normalizedSize: detectionConfig.normalizedSize || 256,
      },
    }, { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error processing comprehensive detection:', error);
    if (extractedDirPath) {
      await cleanupTempDir(extractedDirPath).catch(err => console.error("Failed to clean up extracted dir in error handler:", err));
    }
    return new NextResponse(JSON.stringify({ success: false, error: 'Internal Server Error. Please try again later.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}