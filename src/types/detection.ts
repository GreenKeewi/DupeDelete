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
  isBroken?: boolean; // Flag for broken files
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