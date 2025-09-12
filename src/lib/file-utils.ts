import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const TEMP_BASE_DIR = path.join(os.tmpdir(), 'dupe-delete-temp');

export async function createTempDir(prefix: string = 'job-'): Promise<string> {
  const dirName = `${prefix}${uuidv4()}`;
  const tempDirPath = path.join(TEMP_BASE_DIR, dirName);
  await fs.mkdir(tempDirPath, { recursive: true });
  return tempDirPath;
}

export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${dirPath}`);
  } catch (error) {
    console.error(`Error cleaning up temporary directory ${dirPath}:`, error);
  }
}

export async function getTempFilePath(jobId: string, fileName: string): Promise<string> {
  const jobDirPath = path.join(TEMP_BASE_DIR, jobId);
  return path.join(jobDirPath, fileName);
}

export async function getFilesInDir(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      files.push(...(await getFilesInDir(fullPath))); // Recursively get files in subdirectories
    }
  }
  return files;
}