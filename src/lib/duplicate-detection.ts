import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import imageHash from 'image-hash';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp';
import { ssim } from 'ssim.js';

export type FileType = 'image' | 'other';

export interface ScannedFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  fullPath: string; // Absolute path on the server
  type: FileType;
  md5Hash: string; // New: MD5 hash for exact comparison
  pHash?: string; // Perceptual hash (optional, only for images)
  size: number;
  detectionMethod?: 'MD5' | 'pHash' | 'SSIM'; // New: How it was detected as a duplicate
}

export interface DuplicateGroup {
  hash: string; // The primary hash (MD5 or pHash) of the original file in the group
  original: ScannedFile;
  duplicates: ScannedFile[];
  detectionMethod: 'MD5' | 'pHash' | 'SSIM'; // New: How this group was formed
}

// Export DetectionConfig interface
export interface DetectionConfig {
  similarityThreshold?: number; // For pHash Hamming distance
  ssimThreshold?: number;     // For SSIM similarity
  normalizedSize?: number;    // For image resizing before SSIM
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
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

async function getSha256Hash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return createHash('sha256').update(fileBuffer).digest('hex');
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
        getSha256Hash(filePath).then(resolve).catch(reject);
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
  if (hash1.length !== hash2.length) {
    console.warn("Hashes have different lengths, cannot calculate Hamming distance accurately.");
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

export async function scanFilesForDuplicates(
  files: { fullPath: string; relativePath: string; size: number }[],
  config?: DetectionConfig // Added optional config parameter
): Promise<DuplicateGroup[]> {
  const allScannedFiles: ScannedFile[] = [];
  const duplicateGroups: DuplicateGroup[] = [];
  const processedFileIds = new Set<string>();

  // Use provided config values or fall back to defaults
  const currentSimilarityThreshold = config?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const currentSsimThreshold = config?.ssimThreshold ?? DEFAULT_SSIM_THRESHOLD;
  const currentNormalizedSize = config?.normalizedSize ?? DEFAULT_NORMALIZED_SIZE;

  // --- Pass 1: Initial scan and hashing (MD5 for all, pHash for images) ---
  for (const file of files) {
    const fileType: FileType = isImageFile(file.fullPath) ? 'image' : 'other';
    let md5Hash: string;
    let pHash: string | undefined;

    try {
      md5Hash = await getMd5Hash(file.fullPath);
      if (fileType === 'image') {
        pHash = await getPerceptualHash(file.fullPath);
      }
    } catch (error) {
      console.warn(`Could not hash file ${file.fullPath}. Skipping.`, error);
      continue;
    }

    allScannedFiles.push({
      id: uuidv4(),
      fileName: path.basename(file.fullPath),
      relativePath: file.relativePath,
      fullPath: file.fullPath,
      type: fileType,
      md5Hash,
      pHash,
      size: file.size,
    });
  }

  // --- Pass 2: Find MD5 duplicates (exact match for all file types) ---
  const md5Map = new Map<string, ScannedFile[]>();
  for (const file of allScannedFiles) {
    if (!processedFileIds.has(file.id)) {
      const group = md5Map.get(file.md5Hash) || [];
      group.push(file);
      md5Map.set(file.md5Hash, group);
    }
  }

  for (const [hash, groupFiles] of md5Map.entries()) {
    if (groupFiles.length > 1) {
      const original = groupFiles[0];
      const duplicates = groupFiles.slice(1);
      duplicateGroups.push({
        hash: original.md5Hash,
        original,
        duplicates: duplicates.map(d => ({ ...d, detectionMethod: 'MD5' })),
        detectionMethod: 'MD5',
      });
      groupFiles.forEach(f => processedFileIds.add(f.id));
    }
  }

  // --- Pass 3: Find pHash duplicates for remaining image files ---
  const remainingImageFilesForPHash = allScannedFiles.filter(
    (f) => !processedFileIds.has(f.id) && f.type === 'image'
  );

  const pHashGroups: { original: ScannedFile; duplicates: ScannedFile[] }[] = [];
  const pHashProcessedIdsInPass = new Set<string>();

  for (let i = 0; i < remainingImageFilesForPHash.length; i++) {
    const currentFile = remainingImageFilesForPHash[i];
    if (pHashProcessedIdsInPass.has(currentFile.id)) continue;

    let currentGroup: { original: ScannedFile; duplicates: ScannedFile[] } = {
      original: currentFile,
      duplicates: [],
    };
    pHashProcessedIdsInPass.add(currentFile.id);

    for (let j = i + 1; j < remainingImageFilesForPHash.length; j++) {
      const compareFile = remainingImageFilesForPHash[j];
      if (pHashProcessedIdsInPass.has(compareFile.id)) continue;

      if (currentFile.pHash && compareFile.pHash) {
        const distance = getHammingDistance(currentFile.pHash, compareFile.pHash);
        if (distance <= currentSimilarityThreshold) { // Use currentSimilarityThreshold
          currentGroup.duplicates.push(compareFile);
          pHashProcessedIdsInPass.add(compareFile.id);
        }
      }
    }

    if (currentGroup.duplicates.length > 0) {
      pHashGroups.push(currentGroup);
      currentGroup.duplicates.forEach(f => pHashProcessedIdsInPass.add(f.id));
    }
  }

  for (const group of pHashGroups) {
    duplicateGroups.push({
      hash: group.original.pHash!,
      original: group.original,
      duplicates: group.duplicates.map(d => ({ ...d, detectionMethod: 'pHash' })),
      detectionMethod: 'pHash',
    });
    processedFileIds.add(group.original.id);
    group.duplicates.forEach(f => processedFileIds.add(f.id));
  }

  // --- Pass 4: Find SSIM duplicates for remaining image files ---
  const remainingImageFilesForSSIM = allScannedFiles.filter(
    (f) => !processedFileIds.has(f.id) && f.type === 'image'
  );

  const ssimProcessedIdsInPass = new Set<string>();
  for (let i = 0; i < remainingImageFilesForSSIM.length; i++) {
    const currentFile = remainingImageFilesForSSIM[i];
    if (ssimProcessedIdsInPass.has(currentFile.id)) continue;

    let ssimGroup: { original: ScannedFile; duplicates: ScannedFile[] } = {
      original: currentFile,
      duplicates: [],
    };
    ssimProcessedIdsInPass.add(currentFile.id);

    for (let j = i + 1; j < remainingImageFilesForSSIM.length; j++) {
      const compareFile = remainingImageFilesForSSIM[j];
      if (ssimProcessedIdsInPass.has(compareFile.id)) continue;

      const similarity = await getSsimSimilarity(currentFile.fullPath, compareFile.fullPath, currentNormalizedSize); // Pass normalizedSize
      if (similarity >= currentSsimThreshold) { // Use currentSsimThreshold
        ssimGroup.duplicates.push(compareFile);
        ssimProcessedIdsInPass.add(compareFile.id);
      }
    }

    if (ssimGroup.duplicates.length > 0) {
      duplicateGroups.push({
        hash: currentFile.md5Hash,
        original: currentFile,
        duplicates: ssimGroup.duplicates.map(d => ({ ...d, detectionMethod: 'SSIM' })),
        detectionMethod: 'SSIM',
      });
      processedFileIds.add(currentFile.id);
      ssimGroup.duplicates.forEach(f => processedFileIds.add(f.id));
    }
  }

  return duplicateGroups;
}