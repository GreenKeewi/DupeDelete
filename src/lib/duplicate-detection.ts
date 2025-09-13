import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import imageHash from 'image-hash';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp';
import { ssim } from 'ssim.js';
import { isBrokenImage, isZeroByteFile } from './file-validation';
import { FileType, ScannedFile, DuplicateGroup, SimilarImageGroup, DetectionConfig, ComprehensiveScanResult } from '@/types/detection'; // Import types

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
const DEFAULT_SIMILARITY_THRESHOLD = 5;
const DEFAULT_SSIM_THRESHOLD = 0.90;
const DEFAULT_NORMALIZED_SIZE = 256;

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
      mode: 'blockhash',
      bits: 16
    }, (error: Error | null, data: string) => {
      if (error) {
        console.error(`Error generating perceptual hash for ${filePath}:`, error);
        resolve('');
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

  const currentSimilarityThreshold = config?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const currentSsimThreshold = config?.ssimThreshold ?? DEFAULT_SSIM_THRESHOLD;
  const currentNormalizedSize = config?.normalizedSize ?? DEFAULT_NORMALIZED_SIZE;

  for (const file of files) {
    const fileType: FileType = isImageFile(file.fullPath) ? 'image' : 'other';
    let md5Hash: string = '';
    let pHash: string | undefined;
    let isFileBroken = false;

    try {
      if (await isZeroByteFile(file.fullPath)) {
        isFileBroken = true;
        console.warn(`[Scan] Zero-byte file detected: ${file.fullPath}`);
      } else if (fileType === 'image') {
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
  const processedFileIds = new Set<string>(brokenFiles.map(f => f.id));

  let md5DuplicatesCount = 0;
  let pHashSimilarCount = 0;
  let ssimSimilarCount = 0;

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
        hash: currentGroup.original.pHash!,
        original: currentGroup.original,
        similar: currentGroup.similar.map(s => ({ ...s, detectionMethod: 'pHash' })),
        detectionMethod: 'pHash',
      });
      processedFileIds.add(currentGroup.original.id);
      currentGroup.similar.forEach(f => processedFileIds.add(f.id));
      pHashSimilarCount += currentGroup.similar.length;
    }
  }

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
        hash: currentFile.md5Hash,
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