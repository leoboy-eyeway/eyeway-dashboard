/**
 * Enhanced Kiri Engine upload with progress tracking
 */

const KIRI_ENGINE_BASE_URL = 'https://api.kiriengine.app/api/v1/open';
const KIRI_ENGINE_API_KEY = import.meta.env.VITE_KIRI_ENGINE_API_KEY || '';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  isMesh?: '0' | '1';
  isMask?: '0' | '1';
  fileFormat?: 'obj' | 'fbx' | 'stl' | 'ply' | 'glb' | 'gltf' | 'usdz' | 'xyz';
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal; // For cancellation
}

/**
 * Upload video to Kiri Engine with progress tracking using XMLHttpRequest
 */
export function uploadVideoWithProgress(
  videoBlob: Blob,
  options: UploadOptions = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('videoFile', videoBlob, 'capture.mp4');
    formData.append('isMesh', options.isMesh || '0');
    formData.append('isMask', options.isMask || '0');

    if (options.fileFormat) {
      formData.append('fileFormat', options.fileFormat);
    }

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (data.code !== 0) {
            reject(new Error(data.msg || `Upload failed with code ${data.code}`));
          } else if (!data.data || !data.data.serialize) {
            reject(new Error('No task ID returned from Kiri Engine'));
          } else {
            resolve(data);
          }
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Handle cancellation
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // Start upload
    xhr.open('POST', `${KIRI_ENGINE_BASE_URL}/3dgs/video`);
    xhr.setRequestHeader('Authorization', `Bearer ${KIRI_ENGINE_API_KEY}`);
    xhr.send(formData);
  });
}

