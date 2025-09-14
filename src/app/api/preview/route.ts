import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getTempFilePath } from '@/lib/file-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  const relativePath = searchParams.get('relativePath');

  if (!jobId || !relativePath) {
    return NextResponse.json({ message: 'Missing jobId or relativePath' }, { status: 400 });
  }

  try {
    const fullPath = await getTempFilePath(jobId + '-extracted-', relativePath);
    const fileBuffer = await fs.readFile(fullPath);

    const contentType = getContentType(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error(`Error serving preview for ${jobId}/${relativePath}:`, error);
    return NextResponse.json({ message: 'File not found or inaccessible' }, { status: 404 });
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream'; // Fallback for unknown types
  }
}