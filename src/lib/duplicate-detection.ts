import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import imageHash from 'image-hash';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp';
import { ssim } from 'ssim.js';
import { isBrokenImage, isZeroByteFile } from './file-validation'; // Import new validation functions

export type FileType = 'image' | 'other';

export interface ScannedFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  fullPath: string; // Absolute path on the server
  type: FileType;
  md5Hash: string; // MD5 hash for exact comparison
  pHash?: string; // Perceptual hash (optional, only for images)
  size: number;
  isBroken?: boolean; // New: Flag for broken files
  detectionMethod?: 'MD5' | 'pHash' | 'SSIM'; // How it was detected as a duplicate/similar
}

export interface DuplicateGroup {
  hash: string; // The primary hash (MD5) of the original file in the group
  original: ScannedFile;
  duplicates: ScannedFile[];
  detectionMethod: 'MD5'; // Always MD5 for exact duplicates
}

export interface SimilarImageGroup {
  hash: string; // The primary hash (pHash or MD5 if SSIM) of the original file in the group
  original: ScannedFile;
  similar: ScannedFile[];
  detectionMethod: 'pHash' | 'SSIM'; // How this group was formed
}

// Export DetectionConfig interface
export interface DetectionConfig {
  similarityThreshold?: number; // For pHash Hamming distance
  ssimThreshold?: number;     // For SSIM similarity
  normalizedSize?: number;    // For image resizing before SSIM
}

export interface ComprehensiveScanResult {
  jobId: string;
  duplicates: DuplicateGroup[];
  similarImages: SimilarImageGroup[];
  brokenFiles: ScannedFile[];
  totalFilesScanned: number;
  summary: {
    totalDuplicates: number;
    totalSimilarImages: number;
    totalBrokenFiles: number;
    md5Duplicates: number;
    pHashSimilar: number;
    ssimSimilar: number;
  };
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']; // Added TIFF
const DEFAULT_SIMILARITY_THRESHOLD = 5; // Default Hamming distance threshold for image similarity (pHash)
const DEFAULT_SSIM_THRESHOLD = 0.90; // Default SSIM similarity threshold
const DEFAULT_NORMALIZED_SIZE = 256; // Default image normalization size for SSIM

function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

async function getMd5Hash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return createHash('md5').update(fileBuffer).digest('hex');
}

async function getPerceptualHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    imageHash({
      path: filePath,
      mode: 'blockhash', // Using blockhash for perceptual hashing
      bits: 16 // Generates a 64-bit hash (16 hex characters)
    }, (error: Error | null, data: string) => {
      if (error) {
        console.error(`Error generating perceptual hash for ${filePath}:`, error);
        // Fallback to SHA256 if pHash fails, though it won't be perceptual
        // For now, we'll just resolve with an empty string or a specific error hash
        resolve(''); // Indicate failure to generate pHash
      } else {
        resolve(data);
      }
    });
  });
}

function hexToBinary(hexChar: string): string {
  return parseInt(hexChar, 16).toString(2).padStart(4, '0');
}

function getHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length || !hash1 || !hash2) {
    // console.warn("Hashes have different lengths or are empty, cannot calculate Hamming distance accurately.");
    return Infinity;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const bin1 = hexToBinary(hash1[i]);
    const bin2 = hexToBinary(hash2[i]);
    for (let j = 0; j < 4; j++) {
      if (bin1[j] !== bin2[j]) {
        distance++;
      }
    }
  }
  return distance;
}

async function getSsimSimilarity(imagePath1: string, imagePath2: string, normalizedSize: number): Promise<number> {
  try {
    const img1 = await (Jimp as any).read(imagePath1);
    const img2 = await (Jimp as any).read(imagePath2);

    img1.resize(normalizedSize, normalizedSize, (Jimp as any).constants.RESIZE_BICUBIC);
    img2.resize(normalizedSize, normalizedSize, (Jimp as any).constants.RESIZE_BICUBIC);

    const data1 = {
      data: new Uint8ClampedArray(img1.bitmap.data),
      width: img1.bitmap.width,
      height: img1.bitmap.height,
    };
    const data2 = {
      data: new Uint8ClampedArray(img2.bitmap.data),
      width: img2.bitmap.width,
      height: img2.bitmap.height,
    };

    const { mssim } = ssim(data1, data2, {
      windowSize: 11,
      k1: 0.01,
      k2: 0.03,
    });
    return mssim;
  } catch (error) {
    console.error(`Error calculating SSIM for ${imagePath1} and ${imagePath2}:`, error);
    return 0;
  }
}

export async function performComprehensiveScan(
  jobId: string,
  files: { fullPath: string; relativePath: string; size: number }[],
  config?: DetectionConfig
): Promise<ComprehensiveScanResult> {
  const allScannedFiles: ScannedFile[] = [];
  const brokenFiles: ScannedFile[] = [];
  const validFiles: ScannedFile[] = [];

  // Use provided config values or fall back to defaults
  const currentSimilarityThreshold = config?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const currentSsimThreshold = config?.ssimThreshold ?? DEFAULT_SSIM_THRESHOLD;
  const currentNormalizedSize = config?.normalizedSize ?? DEFAULT_NORMALIZED_SIZE;

  // --- Pass 1: Initial scan, hashing, and broken file detection ---
  for (const file of files) {
    const fileType: FileType = isImageFile(file.fullPath) ? 'image' : 'other';
    let md5Hash: string = '';
    let pHash: string | undefined;
    let isFileBroken = false;

    try {
      // Check for zero-byte files first
      if (await isZeroByteFile(file.fullPath)) {
        isFileBroken = true;
        console.warn(`[Scan] Zero-byte file detected: ${file.fullPath}`);
      } else if (fileType === 'image') {
        // For images, check if it's a broken image
        if (await isBrokenImage(file.fullPath)) {
          isFileBroken = true;
          console.warn(`[Scan] Broken image detected: ${file.fullPath}`);
        }
      }

      if (!isFileBroken) {
        md5Hash = await getMd5Hash(file.fullPath);
        if (fileType === 'image') {
          pHash = await getPerceptualHash(file.fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not process file ${file.fullPath}. Marking as broken.`, error);
      isFileBroken = true;
    }

    const scannedFile: ScannedFile = {
      id: uuidv4(),
      fileName: path.basename(file.fullPath),
      relativePath: file.relativePath,
      fullPath: file.fullPath,
      type: fileType,
      md5Hash,
      pHash,
      size: file.size,
      isBroken: isFileBroken,
    };
    allScannedFiles.push(scannedFile);

    if (isFileBroken) {
      brokenFiles.push(scannedFile);
    } else {
      validFiles.push(scannedFile);
    }
  }

  const duplicates: DuplicateGroup[] = [];
  const similarImages: SimilarImageGroup[] = [];
  const processedFileIds = new Set<string>(brokenFiles.map(f => f.id)); // Start with broken files as processed

  let md5DuplicatesCount = 0;
  let pHashSimilarCount = 0;
  let ssimSimilarCount = 0;

  // --- Pass 2: Find MD5 duplicates (exact match for all valid file types) ---
  const md5Map = new Map<string, ScannedFile[]>();
  for (const file of validFiles) {
    if (!processedFileIds.has(file.id)) {
      const group = md5Map.get(file.md5Hash) || [];
      group.push(file);
      md5Map.set(file.md5Hash, group);
    }
  }

  for (const [hash, groupFiles] of md5Map.entries()) {
    if (groupFiles.length > 1) {
      const original = groupFiles[0];
      const currentDuplicates = groupFiles.slice(1);
      duplicates.push({
        hash: original.md5Hash,
        original,
        duplicates: currentDuplicates.map(d => ({ ...d, detectionMethod: 'MD5' })),
        detectionMethod: 'MD5',
      });
      groupFiles.forEach(f => processedFileIds.add(f.id));
      md5DuplicatesCount += currentDuplicates.length;
    }
  }

  // --- Pass 3: Find pHash similar images for remaining valid image files ---
  const remainingImageFilesForPHash = validFiles.filter(
    (f) => !processedFileIds.has(f.id) && f.type === 'image' && f.pHash
  );

  const pHashProcessedIdsInPass = new Set<string>();

  for (let i = 0; i < remainingImageFilesForPHash.length; i++) {
    const currentFile = remainingImageFilesForPHash[i];
    if (pHashProcessedIdsInPass.has(currentFile.id)) continue;

    let currentGroup: { original: ScannedFile; similar: ScannedFile[] } = {
      original: currentFile,
      similar: [],
    };
    pHashProcessedIdsInPass.add(currentFile.id);

    for (let j = i + 1; j < remainingImageFilesForPHash.length; j++) {
      const compareFile = remainingImageFilesForPHash[j];
      if (pHashProcessedIdsInPass.has(compareFile.id)) continue;

      if (currentFile.pHash && compareFile.pHash) {
        const distance = getHammingDistance(currentFile.pHash, compareFile.pHash);
        if (distance <= currentSimilarityThreshold) {
          currentGroup.similar.push(compareFile);
          pHashProcessedIdsInPass.add(compareFile.id);
        }
      }
    }

    if (currentGroup.similar.length > 0) {
      similarImages.push({
        hash: currentGroup.original.pHash!, // Fixed: Changed 'group' to 'currentGroup'
        original: currentGroup.original,
        similar: currentGroup.similar.map(s => ({ ...s, detectionMethod: 'pHash' })),
        detectionMethod: 'pHash',
      });
      processedFileIds.add(currentGroup.original.id);
      currentGroup.similar.forEach(f => processedFileIds.add(f.id));
      pHashSimilarCount += currentGroup.similar.length;
    }
  }

  // --- Pass 4: Find SSIM similar images for remaining valid image files ---
  const remainingImageFilesForSSIM = validFiles.filter(
    (f) => !processedFileIds.has(f.id) && f.type === 'image'
  );

  const ssimProcessedIdsInPass = new Set<string>();
  for (let i = 0; i < remainingImageFilesForSSIM.length; i++) {
    const currentFile = remainingImageFilesForSSIM[i];
    if (ssimProcessedIdsInPass.has(currentFile.id)) continue;

    let ssimGroup: { original: ScannedFile; similar: ScannedFile[] } = {
      original: currentFile,
      similar: [],
    };
    ssimProcessedIdsInPass.add(currentFile.id);

    for (let j = i + 1; j < remainingImageFilesForSSIM.length; j++) {
      const compareFile = remainingImageFilesForSSIM[j];
      if (ssimProcessedIdsInPass.has(compareFile.id)) continue;

      const similarity = await getSsimSimilarity(currentFile.fullPath, compareFile.fullPath, currentNormalizedSize);
      if (similarity >= currentSsimThreshold) {
        ssimGroup.similar.push(compareFile);
        ssimProcessedIdsInPass.add(compareFile.id);
      }
    }

    if (ssimGroup.similar.length > 0) {
      similarImages.push({
        hash: currentFile.md5Hash, // Using MD5 as a fallback hash for SSIM groups
        original: currentFile,
        similar: ssimGroup.similar.map(s => ({ ...s, detectionMethod: 'SSIM' })),
        detectionMethod: 'SSIM',
      });
      processedFileIds.add(currentFile.id);
      ssimGroup.similar.forEach(f => processedFileIds.add(f.id));
      ssimSimilarCount += ssimGroup.similar.length;
    }
  }

  return {
    jobId,
    duplicates,
    similarImages,
    brokenFiles,
    totalFilesScanned: allScannedFiles.length,
    summary: {
      totalDuplicates: md5DuplicatesCount,
      totalSimilarImages: pHashSimilarCount + ssimSimilarCount,
      totalBrokenFiles: brokenFiles.length,
      md5Duplicates: md5DuplicatesCount,
      pHashSimilar: pHashSimilarCount,
      ssimSimilar: ssimSimilarCount,
    },
  };
}