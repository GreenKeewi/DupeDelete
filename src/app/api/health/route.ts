import { NextResponse } from 'next/server';

interface HealthCheckResults {
  timestamp: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
  memoryUsage: NodeJS.MemoryUsage;
  crypto?: { working: boolean; testHash?: string; error?: string };
  fs?: { working: boolean; tmpdir?: string; error?: string };
  imageHash?: { working: boolean; error?: string };
  jimp?: { working: boolean; error?: string };
  unzipper?: { working: boolean; error?: string };
}

export async function GET() {
  try {
    // Test basic functionality
    const testResults: HealthCheckResults = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
    };

    // Test if we can import the required modules
    try {
      const { createHash } = await import('crypto');
      const hash = createHash('md5').update('test').digest('hex');
      testResults.crypto = { working: true, testHash: hash };
    } catch (error) {
      testResults.crypto = { working: false, error: (error as Error).message };
    }

    try {
      const { promises: fs } = await import('fs');
      const { tmpdir } = await import('os');
      testResults.fs = { working: true, tmpdir: tmpdir() };
    } catch (error) {
      testResults.fs = { working: false, error: (error as Error).message };
    }

    try {
      const imageHash = await import('image-hash');
      testResults.imageHash = { working: true };
    } catch (error) {
      testResults.imageHash = { working: false, error: (error as Error).message };
    }

    try {
      const { Jimp } = await import('jimp');
      testResults.jimp = { working: true };
    } catch (error) {
      testResults.jimp = { working: false, error: (error as Error).message };
    }

    try {
      const unzipper = await import('unzipper');
      testResults.unzipper = { working: true };
    } catch (error) {
      testResults.unzipper = { working: false, error: (error as Error).message };
    }

    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      results: testResults
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}