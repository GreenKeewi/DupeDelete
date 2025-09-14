import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp'; // Corrected to named import
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
const SIMILARITY_THRESHOLD = 5; // Hamming distance threshold for image similarity (dHash)
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

/**
 * Generates a Difference Hash (dHash) for an image.
 * Resizes the image to 9x8, converts to grayscale, and compares adjacent pixels.
 * Returns a 64-bit hash as a 16-character hexadecimal string.
 */
async function getDifferenceHash(filePath: string): Promise<string> {
  try {
    const image = await Jimp.read(filePath);
    // Resize to 9x8 for 8x8 comparisons and convert to greyscale
    const resizedImage = image.resize(9, 8).greyscale(); // Corrected 'grayscale' to 'greyscale'

    let hashBinary = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelLeft = resizedImage.getPixelColor(x, y);
        const pixelRight = resizedImage.getPixelColor(x + 1, y);

        // Extract average intensity (since it's greyscale, R, G, B are same)
        const avgLeft = (pixelLeft >> 24) & 0xFF; // Red component (or any channel for greyscale)
        const avgRight = (pixelRight >> 24) & 0xFF;

        hashBinary += (avgLeft > avgRight) ? '1' : '0';
      }
    }
    // Convert 64-bit binary string to 16-character hex string
    return parseInt(hashBinary, 2).toString(16).padStart(16, '0');
  } catch (error) {
    console.error(`Error generating difference hash for ${filePath}:`, error);
    // Fallback to SHA256 if perceptual hashing fails
    return getSha256Hash(filePath);
  }
}

async function getPerceptualHash(filePath: string): Promise<string> {
  // Now using dHash instead of pHash from image-hash library
  return getDifferenceHash(filePath);
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
    const img1 = await Jimp.read(imagePath1);
    const img2 = await Jimp.read(imagePath2);

    // Resize images to a common smaller dimension for faster SSIM calculation
    // and to handle slight resolution differences.
    const commonSize = 256; // e.g., 256x256
    img1.resize(commonSize, commonSize); // Removed Jimp.RESIZE_BICUBIC
    img2.resize(commonSize, commonSize); // Removed Jimp.RESIZE_BICUBIC

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