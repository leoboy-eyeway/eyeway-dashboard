/**
 * Video compression utility for optimizing uploads
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  videoBitrate?: number; // bits per second
}

export interface CompressionProgress {
  progress: number; // 0-100
  stage: 'analyzing' | 'compressing' | 'finalizing';
}

/**
 * Compress video for faster upload
 */
export async function compressVideo(
  videoBlob: Blob,
  options: CompressionOptions = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<Blob> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.7,
    videoBitrate = 2500000, // 2.5 Mbps
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;

    video.onloadedmetadata = async () => {
      try {
        onProgress?.({ progress: 10, stage: 'analyzing' });

        // Calculate dimensions
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        onProgress?.({ progress: 30, stage: 'compressing' });

        // For web, we'll use MediaRecorder to re-encode
        // This provides better compression than frame-by-frame canvas capture
        const stream = canvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: videoBitrate,
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          onProgress?.({ progress: 90, stage: 'finalizing' });
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          URL.revokeObjectURL(video.src);
          onProgress?.({ progress: 100, stage: 'finalizing' });
          resolve(compressedBlob);
        };

        // Start recording and play video
        mediaRecorder.start();
        video.play();

        // Draw frames to canvas
        const drawFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, width, height);
            requestAnimationFrame(drawFrame);
          } else if (video.ended) {
            mediaRecorder.stop();
          }
        };

        video.onplay = () => {
          drawFrame();
        };

        video.onerror = () => {
          reject(new Error('Video processing failed'));
        };
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Get video file size in MB
 */
export function getVideoSizeMB(blob: Blob): number {
  return blob.size / (1024 * 1024);
}

/**
 * Estimate upload time based on file size
 * Assumes average upload speed of 5 Mbps
 */
export function estimateUploadTime(blob: Blob, uploadSpeedMbps: number = 5): number {
  const sizeMB = getVideoSizeMB(blob);
  const sizeInMegabits = sizeMB * 8;
  return Math.ceil(sizeInMegabits / uploadSpeedMbps); // seconds
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format seconds to human readable time
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

