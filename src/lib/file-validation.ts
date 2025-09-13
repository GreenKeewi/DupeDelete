import { promises as fs } from 'fs';
import { Jimp } from 'jimp';

/**
 * Checks if an image file is broken by attempting to load it with Jimp.
 * @param filePath The absolute path to the image file.
 * @returns True if the image is broken or unreadable, false otherwise.
 */
export async function isBrokenImage(filePath: string): Promise<boolean> {
  try {
    // Attempt to read the image. Jimp will throw an error for corrupted or unsupported formats.
    await (Jimp as any).read(filePath);
    return false; // Image loaded successfully
  } catch (error) {
    console.warn(`[File Validation] Image file ${filePath} appears broken or unsupported:`, (error as Error).message);
    return true; // Image is broken or cannot be read
  }
}

/**
 * Checks if a file is zero-byte.
 * @param filePath The absolute path to the file.
 * @returns True if the file size is 0 bytes, false otherwise.
 */
export async function isZeroByteFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size === 0;
  } catch (error) {
    console.error(`[File Validation] Error checking file size for ${filePath}:`, error);
    return false; // Assume not zero-byte if stats can't be read
  }
}