# Duplicate Image Detection System

A comprehensive duplicate image detection system for Next.js with multi-stage detection pipeline and configurable thresholds.

## Features

### 🔍 Multi-Stage Detection Pipeline
1. **Exact File Hash (MD5/SHA256)** - Detects perfect duplicates (copy-paste, same file different name)
2. **Perceptual Hashing (pHash)** - Detects recompressed JPG/PNG versions with configurable Hamming distance
3. **SSIM (Structural Similarity)** - Fallback for near-identical images with configurable similarity threshold

### ⚙️ Configurable Thresholds
- **Perceptual Hash Threshold**: Hamming distance ≤ 5 (default), adjustable 1-20
- **SSIM Threshold**: Similarity ≥ 0.90 (default), adjustable 0.5-1.0
- **Normalized Size**: 512px (default), adjustable 256-1024px

### 🎨 Enhanced UI
- Drag & drop file uploader
- Real-time settings panel with sliders
- Duplicate group display with thumbnails
- Side-by-side comparison dialog
- Detection method badges (MD5, pHash, SSIM)

## API Endpoints

### `/api/detect-duplicates`
**POST** - Main duplicate detection endpoint

**Query Parameters:**
- `similarityThreshold` (number): Hamming distance threshold for pHash (1-20)
- `ssimThreshold` (number): SSIM similarity threshold (0.5-1.0)
- `normalizedSize` (number): Image normalization size (256-1024)

**Request Body:**
- `file` (File): ZIP file containing images to scan

**Response:**
```json
{
  "jobId": "uuid",
  "duplicateGroups": [...],
  "totalFiles": 50,
  "duplicateCount": 12,
  "detectionConfig": {
    "similarityThreshold": 5,
    "ssimThreshold": 0.90,
    "normalizedSize": 512
  },
  "summary": {
    "md5Duplicates": 3,
    "pHashDuplicates": 5,
    "ssimDuplicates": 4
  }
}
```

### `/api/preview`
**GET** - Serves image previews for comparison

**Query Parameters:**
- `jobId` (string): Job identifier
- `relativePath` (string): Relative path to image

### `/api/download`
**POST** - Downloads cleaned folder with selected files

**Request Body:**
```json
{
  "jobId": "uuid",
  "filesToKeep": ["path1.jpg", "path2.png"]
}
```

## Usage

### Frontend Integration
```typescript
// Upload and detect duplicates
const formData = new FormData();
formData.append('file', zipFile);

const url = new URL('/api/detect-duplicates', window.location.origin);
url.searchParams.set('similarityThreshold', '5');
url.searchParams.set('ssimThreshold', '0.90');
url.searchParams.set('normalizedSize', '512');

const response = await fetch(url.toString(), {
  method: 'POST',
  body: formData,
});

const { duplicateGroups, totalFiles, duplicateCount } = await response.json();
```

### Backend Integration
```typescript
import { scanFilesForDuplicates, DetectionConfig } from '@/lib/duplicate-detection';

const config: DetectionConfig = {
  similarityThreshold: 5,
  ssimThreshold: 0.90,
  normalizedSize: 512
};

const duplicateGroups = await scanFilesForDuplicates(files, config);
```

## Detection Methods

### 1. MD5 Hash Detection
- **Purpose**: Exact file matches
- **Use Case**: Copy-paste duplicates, same file different name
- **Accuracy**: 100% for identical files
- **Performance**: Fastest

### 2. Perceptual Hash (pHash)
- **Purpose**: Similar images with minor differences
- **Use Case**: Recompressed JPG/PNG, slight quality changes
- **Accuracy**: High for visually similar images
- **Performance**: Medium
- **Threshold**: Hamming distance ≤ 5 (configurable)

### 3. SSIM (Structural Similarity)
- **Purpose**: Near-identical images
- **Use Case**: Slightly resized, minor edits, format conversions
- **Accuracy**: Very high for structural similarity
- **Performance**: Slowest
- **Threshold**: Similarity ≥ 0.90 (configurable)

## Image Preprocessing

The system normalizes images for better comparison:
- Resizes to configurable size (default 512x512)
- Converts to RGB color space
- Strips metadata
- Uses bicubic resampling for quality

## Supported Formats

- **Images**: JPG, JPEG, PNG, GIF, BMP, WEBP, TIFF, TIF
- **Containers**: ZIP files with nested folder structures
- **Limits**: 100 files (free tier), 1GB max file size

## Performance Considerations

- **Small Images**: Fast processing, high accuracy
- **Large Images**: Slower but more accurate
- **Batch Processing**: Optimized for multiple files
- **Memory Usage**: Temporary files cleaned up automatically

## Error Handling

- Invalid file formats return 400 status
- File size limits return 413 status
- Processing errors return 500 status
- Automatic cleanup of temporary files

## Testing

Run the test script to verify functionality:
```bash
node test-detection.js
```

## Dependencies

- `image-hash`: Perceptual hashing
- `jimp`: Image processing and normalization
- `ssim.js`: Structural similarity calculation
- `crypto`: MD5/SHA256 hashing
- `unzipper`: ZIP file extraction
- `jszip`: ZIP file creation

## Configuration Examples

### Strict Detection (Fewer False Positives)
```typescript
{
  similarityThreshold: 3,
  ssimThreshold: 0.95,
  normalizedSize: 1024
}
```

### Loose Detection (More Duplicates Found)
```typescript
{
  similarityThreshold: 8,
  ssimThreshold: 0.80,
  normalizedSize: 256
}
```

### Balanced Detection (Recommended)
```typescript
{
  similarityThreshold: 5,
  ssimThreshold: 0.90,
  normalizedSize: 512
}
```
