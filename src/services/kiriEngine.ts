/**
 * Kiri Engine API Integration - Complete Implementation
 * API Documentation: https://docs.kiriengine.app
 * Base URL: https://api.kiriengine.app/api/v1
 *
 * Scan Types:
 * - "3dgs" : 3D Gaussian Splatting (best for most objects)
 * - "photo" : Photo Scan (best for detailed textured objects)
 * - "featureless" : Featureless Object Scan (best for smooth/reflective objects)
 *
 * Output Formats (when is_mesh=true):
 * - "glb" : Binary GLTF (best for web/games)
 * - "obj" : Wavefront OBJ (best for 3D software)
 * - "fbx" : Autodesk FBX (best for game engines)
 * - "stl" : STL (best for 3D printing)
 */

const KIRI_ENGINE_BASE_URL = 'https://api.kiriengine.app/api/v1';

// Get API key from environment variables
const KIRI_ENGINE_API_KEY = import.meta.env.VITE_KIRI_ENGINE_API_KEY || '';

export type ScanType = '3dgs' | 'photo' | 'featureless';
export type FileFormat = 'glb' | 'obj' | 'fbx' | 'stl' | 'ply' | 'gltf' | 'usdz' | 'xyz';

export interface KiriEngineTask {
  serialize: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  calculateType: number; // 1: Photo Scan, 2: Featureless, 3: 3DGS
  result?: {
    modelUrl: string;
    thumbnailUrl: string;
  };
  error?: string;
}

export interface KiriEngineStatusResponse {
  code: number; // 0 = success, other = error
  msg: string;
  data?: {
    serialize: string;
    status: number; // -1=Uploading, 0=Processing, 1=Failed, 2=Successful, 3=Queuing, 4=Expired
  };
  ok: boolean;
}

export interface KiriEngineUploadResponse {
  code: number;
  msg: string;
  data: {
    serialize: string;
    calculateType: number;
  };
  ok?: boolean; // Optional - may not be present in all responses
}

export interface KiriEngineHealthResponse {
  status: 'ok' | 'error';
  message: string;
  apiKeyValid: boolean;
}

/**
 * Check if Kiri Engine API is accessible and API key is valid
 * @returns Health status of the API
 */
export async function checkKiriEngineHealth(): Promise<KiriEngineHealthResponse> {
  try {
    // Check if API key is configured
    if (!KIRI_ENGINE_API_KEY) {
      return {
        status: 'error',
        message: 'API key not configured',
        apiKeyValid: false
      };
    }

    // Kiri Engine doesn't have a dedicated health endpoint
    // So we'll just verify the API key format and return ready
    // The actual validation will happen during upload
    if (KIRI_ENGINE_API_KEY.startsWith('kiri_') && KIRI_ENGINE_API_KEY.length > 10) {
      return {
        status: 'ok',
        message: 'Kiri Engine API is configured',
        apiKeyValid: true
      };
    } else {
      return {
        status: 'error',
        message: 'Invalid API key format',
        apiKeyValid: false
      };
    }
  } catch (error) {
    console.error('Error checking Kiri Engine health:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      apiKeyValid: false
    };
  }
}

/**
 * Upload images to Kiri Engine for 3D reconstruction
 * @param imageFiles - Array of image files (20-300 images recommended)
 * @param options - Processing options
 * @returns Upload response with serialize ID
 */
export async function uploadImagesToKiriEngine(
  imageFiles: File[],
  options: {
    scanType?: ScanType;  // Default: '3dgs'
    isMesh?: boolean;     // Default: true (convert to mesh)
    isMask?: boolean;     // Default: false (auto masking)
    fileFormat?: FileFormat;  // Default: 'glb'
  } = {}
): Promise<KiriEngineUploadResponse> {
  try {
    const {
      scanType = '3dgs',
      isMesh = true,
      isMask = false,
      fileFormat = 'glb'
    } = options;

    if (imageFiles.length < 20 || imageFiles.length > 300) {
      console.warn(`Recommended: 20-300 images, you provided ${imageFiles.length}`);
    }

    // Determine endpoint based on scan type
    const endpoints: Record<ScanType, string> = {
      '3dgs': `${KIRI_ENGINE_BASE_URL}/open/3dgs/image`,
      'photo': `${KIRI_ENGINE_BASE_URL}/open/photo/image`,
      'featureless': `${KIRI_ENGINE_BASE_URL}/open/featureless/image`
    };

    const endpoint = endpoints[scanType];

    // Prepare form data
    const formData = new FormData();
    formData.append('isMesh', isMesh ? '1' : '0');
    formData.append('isMask', isMask ? '1' : '0');

    if (fileFormat && isMesh) {
      formData.append('fileFormat', fileFormat);
    }

    // Add all image files
    imageFiles.forEach((file) => {
      formData.append('imagesFiles', file, file.name);
    });

    console.log(`📤 Uploading ${imageFiles.length} images (${scanType} scan)...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const data: KiriEngineUploadResponse = await response.json();

    // Kiri Engine returns different success codes:
    // - code: 0 for some endpoints (documented)
    // - code: 200 for uploads (actual behavior)
    // - ok: true is also an indicator of success
    const isSuccess = data.ok === true || data.code === 0 || data.code === 200;

    if (!isSuccess) {
      throw new Error(data.msg || `Upload failed with code ${data.code}`);
    }

    if (!data.data || !data.data.serialize) {
      throw new Error('No task ID returned from Kiri Engine');
    }

    console.log(`✅ Upload successful! Task ID: ${data.data.serialize}`);
    console.log(`   Type: ${data.data.calculateType} (1=Photo, 2=Featureless, 3=3DGS)`);

    return data;
  } catch (error) {
    console.error('Error uploading images to Kiri Engine:', error);
    throw error;
  }
}

/**
 * Upload video to Kiri Engine for 3D processing using 3D Gaussian Splatting
 * @param videoBlob - The video file to process (max 1920x1080, max 3 minutes)
 * @param options - Additional options for processing
 * @returns Upload response with serialize ID
 */
export async function uploadVideoToKiriEngine(
  videoBlob: Blob,
  options: {
    scanType?: ScanType;  // Default: '3dgs'
    isMesh?: boolean;     // Default: false (turn off 3DGS to Mesh)
    isMask?: boolean;     // Default: false (turn off Auto Masking)
    fileFormat?: FileFormat;
  } = {}
): Promise<KiriEngineUploadResponse> {
  try {
    const {
      scanType = '3dgs',
      isMesh = false,
      isMask = false,
      fileFormat = 'glb'
    } = options;

    // Determine endpoint based on scan type
    const endpoints: Record<ScanType, string> = {
      '3dgs': `${KIRI_ENGINE_BASE_URL}/open/3dgs/video`,
      'photo': `${KIRI_ENGINE_BASE_URL}/open/photo/video`,
      'featureless': `${KIRI_ENGINE_BASE_URL}/open/featureless/video`
    };

    const endpoint = endpoints[scanType];

    const formData = new FormData();
    formData.append('videoFile', videoBlob, 'capture.mp4');
    formData.append('isMesh', isMesh ? '1' : '0');
    formData.append('isMask', isMask ? '1' : '0');

    if (fileFormat && isMesh) {
      formData.append('fileFormat', fileFormat);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'No response body';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const data: KiriEngineUploadResponse = await response.json();

    console.log('Kiri Engine Video Upload Response:', data); // Debug log

    // Check if the response structure is valid
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from Kiri Engine API');
    }

    // Kiri Engine returns different success codes:
    // - code: 0 for some endpoints (documented)
    // - code: 200 for video upload (actual behavior)
    // - ok: true is also an indicator of success
    const isSuccess = data.ok === true || data.code === 0 || data.code === 200;

    if (!isSuccess) {
      throw new Error(data.msg || `Upload failed with code ${data.code}`);
    }

    // Verify we have the serialize ID
    if (!data.data || !data.data.serialize) {
      throw new Error('No task ID returned from Kiri Engine');
    }

    console.log(`✅ Video upload successful! Task ID: ${data.data.serialize}`);
    return data;
  } catch (error) {
    console.error('Error uploading to Kiri Engine:', error);
    throw error;
  }
}

/**
 * Check the processing status of a task
 * Uses the exact endpoint from Python scripts: /api/v1/open/model/getStatus
 * @param serialize - The serialize ID returned from upload
 * @returns Current task status and progress
 */
export async function checkTaskStatus(serialize: string): Promise<KiriEngineTask> {
  try {
    // Use the EXACT endpoint from Python script
    const response = await fetch(`${KIRI_ENGINE_BASE_URL}/open/model/getStatus?serialize=${serialize}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    const data: KiriEngineStatusResponse = await response.json();
    console.log('Kiri Engine Status Response:', JSON.stringify(data, null, 2));

    // Check for success - Kiri Engine may return code: 0 or code: 200
    const isSuccess = data.ok === true || data.code === 0 || data.code === 200;

    if (!isSuccess) {
      throw new Error(data.msg || `Status check failed with code ${data.code}`);
    }

    if (!data.data) {
      throw new Error('No data returned from Kiri Engine status check');
    }

    // Map Kiri Engine status codes to our internal status
    // Kiri status: -1=Uploading, 0=Processing, 1=Failed, 2=Successful, 3=Queuing, 4=Expired
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    let progress = 0;
    let result = undefined;
    let errorMsg = undefined;

    switch (data.data.status) {
      case -1:
        // Uploading
        status = 'processing';
        progress = 10;
        console.log(`Task ${serialize}: Uploading to Kiri Engine`);
        break;
      case 0:
        // Processing
        status = 'processing';
        progress = 50; // Mid-point, since we don't get granular progress
        console.log(`Task ${serialize}: Processing by Kiri Engine`);
        break;
      case 1:
        // Failed
        status = 'failed';
        progress = 0;
        errorMsg = 'Processing failed';
        console.error(`Task ${serialize}: Failed`);
        break;
      case 2:
        // Successful - Automatically get download link
        status = 'completed';
        progress = 100;
        console.log(`Task ${serialize}: Completed successfully!`);

        // Automatically fetch download link (valid for 60 minutes)
        try {
          const modelUrl = await getDownloadLink(serialize);
          result = {
            modelUrl: modelUrl,
            thumbnailUrl: '' // Kiri Engine doesn't provide thumbnail in this endpoint
          };
          console.log(`✅ Download URL retrieved: ${modelUrl.substring(0, 50)}...`);
        } catch (error) {
          console.error('Failed to get download link:', error);
          // Don't fail the status check if download link fails
          // User can manually click download button
        }
        break;
      case 3:
        // Queuing
        status = 'pending';
        progress = 0;
        console.log(`Task ${serialize}: In queue, waiting to process`);
        break;
      case 4:
        // Expired
        status = 'failed';
        progress = 0;
        errorMsg = 'Task expired';
        console.error(`Task ${serialize}: Expired`);
        break;
      default:
        console.warn(`Task ${serialize}: Unknown status code ${data.data.status}`);
        status = 'pending';
        progress = 0;
    }

    return {
      serialize: serialize,
      status: status,
      progress: progress,
      calculateType: 3, // 3DGS
      result: result,
      error: errorMsg
    };
  } catch (error) {
    console.error('Error checking task status:', error);
    throw error;
  }
}

/**
 * Get download link for completed 3D model ZIP (valid for 60 minutes)
 * Uses the exact endpoint from Python scripts: /api/v1/open/model/getModelZip
 * @param serialize - The serialize ID from upload
 * @returns Download URL for the model ZIP
 */
export async function getDownloadLink(serialize: string): Promise<string> {
  try {
    // Use the EXACT endpoint from Python script
    const endpoint = `${KIRI_ENGINE_BASE_URL}/open/model/getModelZip?serialize=${serialize}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get download link: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('Download link response:', data);

    // Check response structure
    if (!data.ok) {
      throw new Error(data.msg || 'Failed to get download link');
    }

    if (!data.data || !data.data.modelUrl) {
      throw new Error('No model URL in response');
    }

    console.log(`✅ Download link obtained (valid 60 minutes)`);
    return data.data.modelUrl;
  } catch (error) {
    console.error('Error getting download link:', error);
    throw error;
  }
}

/**
 * Download the completed 3D model file
 * @param serialize - The serialize ID from upload
 * @param onProgress - Optional callback for download progress
 * @returns Blob of the downloaded model
 */
export async function downloadModel(
  serialize: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<Blob> {
  try {
    const downloadUrl = await getDownloadLink(serialize);

    console.log(`⬇️ Downloading model...`);

    // For development, try direct download first, then fallback to proxy if needed
    const isDevelopment = import.meta.env.DEV;
    let finalUrl = downloadUrl;

    if (isDevelopment) {
      // Try direct download first
      try {
        console.log('Trying direct download...');
        const response = await fetch(downloadUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': '*/*',
          },
        });

        if (response.ok) {
          console.log('Direct download successful');
          return await processResponse(response, onProgress);
        } else {
          console.log('Direct download failed, trying proxy...');
          // Extract the path after the bucket domain for proxy
          const urlParts = downloadUrl.split('amazonaws.com/');
          if (urlParts.length > 1) {
            finalUrl = `/api/s3/${urlParts[1]}`;
          }
        }
      } catch (directError) {
        console.log('Direct download failed with CORS, trying proxy...', directError);
        // Extract the path after the bucket domain for proxy
        const urlParts = downloadUrl.split('amazonaws.com/');
        if (urlParts.length > 1) {
          finalUrl = `/api/s3/${urlParts[1]}`;
        }
      }
    }

    console.log(`Using URL: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return await processResponse(response, onProgress);
  } catch (error) {
    console.error('Error downloading model:', error);
    throw error;
  }
}

async function processResponse(
  response: Response,
  onProgress?: (downloaded: number, total: number) => void
): Promise<Blob> {
  const total = parseInt(response.headers.get('content-length') || '0');
  console.log('Content-Length:', total);

  let downloaded = 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read response body');
  }

  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    if (value) {
      chunks.push(value);
      downloaded += value.length;

      if (onProgress && total) {
        onProgress(downloaded, total);
      }
    }
  }

  const blob = new Blob(chunks);
  console.log(`✅ Downloaded: ${(blob.size / 1024 / 1024).toFixed(2)} MB, chunks: ${chunks.length}`);

  return blob;
}

/**
 * Upload pre-existing 3DGS files (.ply + cameras.json) to Kiri Engine
 * @param plyFile - The .ply file containing the 3D model
 * @param camerasFile - The cameras.json file containing camera parameters
 * @param options - Processing options
 * @returns Upload response with serialize ID
 */
export async function upload3DGSFilesToKiriEngine(
  plyFile: File,
  camerasFile: File,
  options: {
    fileFormat?: FileFormat;  // Default: 'glb'
  } = {}
): Promise<KiriEngineUploadResponse> {
  try {
    const {
      fileFormat = 'glb'
    } = options;

    console.log('Uploading 3DGS files to Kiri Engine...', {
      plyFile: plyFile.name,
      camerasFile: camerasFile.name,
      fileFormat
    });

    const endpoint = `${KIRI_ENGINE_BASE_URL}/open/3dgs/files`;

    // Prepare form data
    const formData = new FormData();
    formData.append('plyFile', plyFile);
    formData.append('camerasFile', camerasFile);
    formData.append('fileFormat', fileFormat);

    // Make the request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();

    console.log('3DGS files uploaded successfully:', result);

    return result;
  } catch (error) {
    console.error('Error uploading 3DGS files:', error);
    throw error;
  }
}

/**
 * Poll task status until completion
 * @param serialize - The serialize ID to monitor
 * @param onProgress - Callback for progress updates
 * @param pollInterval - Polling interval in milliseconds (default: 5000)
 * @returns Final task result
 */
export async function pollTaskStatus(
  serialize: string,
  onProgress?: (progress: number, status: string) => void,
  pollInterval: number = 5000
): Promise<KiriEngineTask> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const task = await checkTaskStatus(serialize);

        if (onProgress) {
          onProgress(task.progress, task.status);
        }

        if (task.status === 'completed') {
          resolve(task);
        } else if (task.status === 'failed') {
          reject(new Error(task.error || 'Task processing failed'));
        } else {
          // Continue polling
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Download the 3D model result and upload to Supabase storage
 * @param serializeOrUrl - Serialize ID or direct URL of the completed 3D model
 * @param potholeId - ID of the pothole to associate with the model
 * @param onProgress - Optional callback for download progress
 * @returns Public URL of the uploaded model
 */
export async function downloadAndUpload3DModel(
  serializeOrUrl: string,
  potholeId: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<string> {
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');

    let modelBlob: Blob;

    // Check if it's a serialize ID or a URL
    if (serializeOrUrl.startsWith('http')) {
      // It's a URL, download directly
      const response = await fetch(serializeOrUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      modelBlob = await response.blob();
    } else {
      // It's a serialize ID, use our download function
      modelBlob = await downloadModel(serializeOrUrl, onProgress);
    }

    // Generate a unique filename
    const fileName = `pothole_${potholeId}_${Date.now()}.ply`;
    const filePath = `3d-models/${fileName}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('models')
      .upload(filePath, modelBlob, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('models')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded model');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error downloading and uploading 3D model:', error);
    throw error;
  }
}
