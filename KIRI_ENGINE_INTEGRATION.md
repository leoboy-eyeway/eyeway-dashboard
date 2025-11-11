# Kiri Engine Integration Guide

This document explains how the Eyeway Dashboard integrates with Kiri Engine for 3D photogrammetry processing.

## Overview

Kiri Engine is a powerful 3D scanning service that supports:
- Photo Scan (for detailed, textured objects)
- Featureless Object Scan (for smooth/reflective surfaces)
- 3D Gaussian Splatting (for complex environments) - **Used in this project**

## Features Implemented

### 1. 3D Capture Workflow
The capture workflow now includes 4 steps:
1. **Location** - Set the pothole location
2. **Record** - Capture video of the pothole
3. **Progress** - Upload and process with Kiri Engine (NEW)
4. **Complete** - View the completed 3D model

### 2. Kiri Engine Service (`src/services/kiriEngine.ts`)

The service provides the following functionality:

#### Upload Video
```typescript
uploadVideoToKiriEngine(videoBlob: Blob, scanType: 'photo' | 'featureless' | '3dgs')
```
Uploads a video file to Kiri Engine for 3D processing. Returns a task ID for tracking.

#### Check Task Status
```typescript
checkTaskStatus(taskId: string)
```
Checks the current processing status of a task.

#### Poll Task Status
```typescript
pollTaskStatus(taskId: string, onProgress?: (progress: number, status: string) => void)
```
Continuously polls the task status until completion, with optional progress callbacks.

#### Download 3D Model
```typescript
download3DModel(modelUrl: string)
```
Downloads the completed 3D model.

## Setup Instructions

### 1. Get Kiri Engine API Key

1. Sign up at https://www.kiriengine.app/api/signup
2. Login at https://www.kiriengine.app/api/login
3. Get your API key at https://www.kiriengine.app/api/keys
4. Initial signup includes 20 free credits for testing

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_KIRI_ENGINE_API_KEY=your_api_key_here
```

### 3. API Pricing

- **1 credit = $1 USD**
- Minimum recharge: 500 credits
- Each API call costs 1 credit
- Scan types all cost 1 credit each:
  - Photo Scan: 1 credit
  - Featureless Scan: 1 credit
  - 3DGS Scan: 1 credit

## How It Works

### User Flow

1. User captures location data
2. User records a 360° video walking around the pothole
3. User clicks "Generate 3D Model"
4. Video is uploaded to Kiri Engine API
5. Progress screen shows real-time processing status
6. Upon completion, user is shown the completed model

### Technical Flow

1. **Video Capture**: Video recorded in browser using MediaRecorder API
2. **Upload**: Video blob sent to Kiri Engine via REST API
3. **Processing**: Kiri Engine processes video using 3D Gaussian Splatting
4. **Polling**: Client polls for status updates every 5 seconds
5. **Completion**: 3D model URL returned when processing completes

## API Endpoints

Base URL: `https://api.kiriengine.app/api/`

- `POST /upload` - Upload video for processing
- `GET /task/{taskId}` - Get task status
- Authentication via Bearer token in headers

## Progress Tracking

The Progress screen (Step 3) shows:
- Real-time progress percentage
- Current processing status message
- Task ID for reference
- Step-by-step checklist with completion indicators
- Estimated time remaining

## Error Handling

The integration includes comprehensive error handling:
- Upload failures
- Network errors
- API rate limiting
- Processing failures
- Timeout handling

Errors are displayed to users via toast notifications.

## Testing

For testing without a real API key:
1. The app includes fallback logic that simulates processing
2. After showing an error, it will complete the flow for demo purposes
3. To test with real API, set the `VITE_KIRI_ENGINE_API_KEY` environment variable

## Additional Resources

- **Main Website**: https://www.kiriengine.app/
- **API Documentation**: https://docs.kiriengine.app
- **GitHub SDK**: https://github.com/Kiri-Innovation/KIRI-ENGINE-SDK-API
- **Support Discord**: https://discord.com/invite/93fcVgR8EV
- **Contact Email**: contact@kiri-innov.com

## Version 4.0 Features

Kiri Engine 4.0 (released 2025) includes:
- **5x faster processing** - Photo Scans reduced from ~10 min to ~2 min
- **Higher photo limits** - Basic: 150 photos, Pro: 500 photos
- **AI-powered PBR materials** - Professional-grade material generation
- **Unlimited free exports** - For Basic accounts
- **Improved low-texture results**
- **New AR Mode**

## Future Enhancements

Potential improvements:
1. Support for multiple scan types (Photo, Featureless)
2. Batch processing of multiple videos
3. Direct 3D viewer integration
4. Export to different 3D formats
5. Integration with pothole database
6. Automatic severity assessment from 3D data
