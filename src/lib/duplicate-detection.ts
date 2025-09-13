import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import imageHash from 'image-hash';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp'; // Changed to named import as per TypeScript suggestion
import { ssim } from 'ssim.js'; // Import ssim.js for SSIM comparison

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

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const SIMILARITY_THRESHOLD = 5; // Hamming distance threshold for image similarity (pHash)
const SSIM_THRESHOLD = 0.90; // SSIM similarity threshold

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
        // Fallback to SHA256 if perceptual hashing fails, though this should ideally not happen for images
        getSha256Hash(filePath).then(resolve).catch(reject);
      } else {
        resolve(data);
      }
    });
  });
}

// Helper to convert a hex character to a 4-bit binary string
function hexToBinary(hexChar: string): string {
  return parseInt(hexChar, 16).toString(2).padStart(4, '0');
}

// Calculate Hamming distance between two hexadecimal hash strings
function getHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    console.warn("Hashes have different lengths, cannot calculate Hamming distance accurately.");
    return Infinity; // Indicate a very large distance
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const bin1 = hexToBinary(hash1[i]);
    const bin2 = hexToBinary(hash2[i]);
    for (let j = 0; j < 4; j++) { // Compare each bit in the 4-bit representation
      if (bin1[j] !== bin2[j]) {
        distance++;
      }
    }
  }
  return distance;
}

async function getSsimSimilarity(imagePath1: string, imagePath2: string): Promise<number> {
  try {
    // Use type assertion to bypass TypeScript's check on 'read'
    const img1 = await (Jimp as any).read(imagePath1);
    const img2 = await (Jimp as any).read(imagePath2);

    // Resize images to a common smaller dimension for faster SSIM calculation
    // and to handle slight resolution differences.
    const commonSize = 256; // e.g., 256x256
    // Use type assertion to bypass TypeScript's check on 'constants'
    img1.resize({ w: commonSize, h: commonSize, mode: (Jimp as any).constants.RESIZE_BICUBIC });
    img2.resize({ w: commonSize, h: commonSize, mode: (Jimp as any).constants.RESIZE_BICUBIC });

    // Convert to raw pixel data for ssim.js
    // ssim.js expects Uint8ClampedArray for ImageData.data
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
      // Default options for ssim.js are usually fine
    });
    return mssim;
  } catch (error) {
    console.error(`Error calculating SSIM for ${imagePath1} and ${imagePath2}:`, error);
    return 0; // Return 0 on error to avoid false positives
  }
}

export async function scanFilesForDuplicates(
  files: { fullPath: string; relativePath: string; size: number }[]
): Promise<DuplicateGroup[]> {
  const allScannedFiles: ScannedFile[] = [];
  const duplicateGroups: DuplicateGroup[] = [];
  const processedFileIds = new Set<string>();

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
  const pHashProcessedIdsInPass = new Set<string>(); // To manage within this pass

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
        if (distance <= SIMILARITY_THRESHOLD) {
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

      const similarity = await getSsimSimilarity(currentFile.fullPath, compareFile.fullPath);
      if (similarity >= SSIM_THRESHOLD) {
        ssimGroup.duplicates.push(compareFile);
        ssimProcessedIdsInPass.add(compareFile.id);
      }
    }

    if (ssimGroup.duplicates.length > 0) {
      duplicateGroups.push({
        hash: currentFile.md5Hash, // Using MD5 as a fallback hash for the group
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