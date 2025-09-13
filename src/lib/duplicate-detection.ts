import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import imageHash from 'image-hash';
import { v4 as uuidv4 } from 'uuid';

export type FileType = 'image' | 'other';

export interface ScannedFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  fullPath: string; // Absolute path on the server
  type: FileType;
  hash: string; // Perceptual hash for images, SHA256 for others
  size: number;
}

export interface DuplicateGroup {
  hash: string; // The hash of the original file in the group
  original: ScannedFile;
  duplicates: ScannedFile[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
const SIMILARITY_THRESHOLD = 5; // Hamming distance threshold for image similarity

function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
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
        // Fallback to SHA256 if perceptual hashing fails
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

export async function scanFilesForDuplicates(
  files: { fullPath: string; relativePath: string; size: number }[]
): Promise<DuplicateGroup[]> {
  const allScannedFiles: ScannedFile[] = [];

  // First, scan all files and generate their hashes
  for (const file of files) {
    const fileType: FileType = isImageFile(file.fullPath) ? 'image' : 'other';
    let hash: string;

    try {
      if (fileType === 'image') {
        hash = await getPerceptualHash(file.fullPath);
      } else {
        hash = await getSha256Hash(file.fullPath);
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
      hash,
      size: file.size,
    });
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const processedFileIds = new Set<string>();

  // Now, compare hashes to find duplicates
  for (let i = 0; i < allScannedFiles.length; i++) {
    const currentFile = allScannedFiles[i];

    if (processedFileIds.has(currentFile.id)) {
      continue; // Skip if already part of a group
    }

    let currentGroup: DuplicateGroup = {
      hash: currentFile.hash, // Hash of the original
      original: currentFile,
      duplicates: [],
    };
    processedFileIds.add(currentFile.id);

    for (let j = i + 1; j < allScannedFiles.length; j++) {
      const compareFile = allScannedFiles[j];

      if (processedFileIds.has(compareFile.id)) {
        continue; // Skip if already part of a group
      }

      // Only compare images using perceptual hash distance
      if (currentFile.type === 'image' && compareFile.type === 'image') {
        const distance = getHammingDistance(currentFile.hash, compareFile.hash);
        if (distance <= SIMILARITY_THRESHOLD) {
          currentGroup.duplicates.push(compareFile);
          processedFileIds.add(compareFile.id);
        }
      } else if (currentFile.type === 'other' && compareFile.type === 'other') {
        // For non-images, use exact SHA256 hash match
        if (currentFile.hash === compareFile.hash) {
          currentGroup.duplicates.push(compareFile);
          processedFileIds.add(compareFile.id);
        }
      }
      // Files of different types (image vs. other) are not considered duplicates by this logic
    }

    if (currentGroup.duplicates.length > 0) {
      duplicateGroups.push(currentGroup);
    }
  }

  return duplicateGroups;
}