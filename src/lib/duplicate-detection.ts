import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { imageHash } from 'image-hash';
import Jimp from 'jimp';

export type FileType = 'image' | 'other';

export interface ScannedFile {
  id: string;
  fileName: string;
  relativePath: string; // Path relative to the extracted folder root
  fullPath: string; // Absolute path on the server
  type: FileType;
  hash: string;
  size: number;
}

export interface DuplicateGroup {
  hash: string;
  original: ScannedFile;
  duplicates: ScannedFile[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

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
      // Other options can be configured if needed, e.g., 'bits'
    }, (error, data) => {
      if (error) {
        console.error(`Error generating perceptual hash for ${filePath}:`, error);
        // Fallback to SHA256 or a placeholder hash if perceptual hashing fails
        getSha256Hash(filePath).then(resolve).catch(reject);
      } else {
        resolve(data);
      }
    });
  });
}

export async function scanFilesForDuplicates(
  files: { fullPath: string; relativePath: string; size: number }[]
): Promise<DuplicateGroup[]> {
  const fileHashes: { [hash: string]: ScannedFile[] } = {};
  const scannedFiles: ScannedFile[] = [];

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
      continue; // Skip files that cannot be hashed
    }

    const scannedFile: ScannedFile = {
      id: uuidv4(),
      fileName: path.basename(file.fullPath),
      relativePath: file.relativePath,
      fullPath: file.fullPath,
      type: fileType,
      hash,
      size: file.size,
    };
    scannedFiles.push(scannedFile);

    if (!fileHashes[hash]) {
      fileHashes[hash] = [];
    }
    fileHashes[hash].push(scannedFile);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  for (const hash in fileHashes) {
    if (fileHashes[hash].length > 1) {
      // The first file in the list is considered the "original" for this group
      const original = fileHashes[hash][0];
      const duplicates = fileHashes[hash].slice(1);
      duplicateGroups.push({ hash, original, duplicates });
    }
  }

  return duplicateGroups;
}