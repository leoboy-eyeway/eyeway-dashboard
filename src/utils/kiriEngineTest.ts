/**
 * Kiri Engine Test Utilities
 *
 * These utilities replicate the Python test scripts for testing the Kiri Engine API
 * Based on the original Python scripts for upload, status check, and download
 */

import {
  uploadVideoToKiriEngine,
  checkTaskStatus,
  downloadModel,
  getDownloadLink
} from '@/services/kiriEngine';

/**
 * Test 1: Upload a video file to Kiri Engine
 * Equivalent to: upload_video.py
 *
 * @param videoFile - File object or Blob of the video
 * @returns Task ID (serialize)
 */
export async function testUploadVideo(videoFile: File | Blob): Promise<string> {
  console.log('=== TEST 1: Upload Video ===');
  console.log(`Uploading file: ${videoFile instanceof File ? videoFile.name : 'video.mp4'}`);
  console.log(`Size: ${(videoFile.size / 1024 / 1024).toFixed(2)} MB`);

  try {
    const result = await uploadVideoToKiriEngine(videoFile, {
      scanType: '3dgs',
      isMesh: false,   // 0 = no mesh, 1 = also convert 3DGS to mesh
      isMask: false    // 0 = no auto masking, 1 = auto masking
    });

    console.log('Response:', result);

    if (result.data && result.data.serialize) {
      const serialize = result.data.serialize;
      console.log('✅ Upload success. Task ID (serialize):', serialize);
      console.log('calculateType:', result.data.calculateType); // should be 3 for 3DGS
      return serialize;
    } else {
      throw new Error('❌ Upload failed: No serialize ID returned');
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

/**
 * Test 2: Check status of a processing task
 * Equivalent to: check_status.py
 *
 * @param taskId - The serialize ID from upload
 */
export async function testCheckStatus(taskId: string): Promise<void> {
  console.log('=== TEST 2: Check Status ===');
  console.log(`Task ID: ${taskId}`);

  try {
    const status = await checkTaskStatus(taskId);

    console.log('Response:', status);

    const statusMap: Record<string, string> = {
      'pending': 'Queuing/Uploading',
      'processing': 'Processing',
      'failed': 'Failed',
      'completed': 'Successful'
    };

    console.log('✅ Task Status:', statusMap[status.status] || `Unknown (${status.status})`);
    console.log('   Progress:', status.progress + '%');
    if (status.error) {
      console.log('   Error:', status.error);
    }
  } catch (error) {
    console.error('❌ Status check error:', error);
    throw error;
  }
}

/**
 * Test 3: Download the completed 3D model
 * Equivalent to: download_model.py
 *
 * @param taskId - The serialize ID from upload
 * @param autoSave - Whether to automatically save the file
 */
export async function testDownloadModel(
  taskId: string,
  autoSave: boolean = true
): Promise<Blob> {
  console.log('=== TEST 3: Download Model ===');
  console.log(`Task ID: ${taskId}`);

  try {
    // Step 1: Request download link
    console.log('Step 1: Getting download link...');
    const modelUrl = await getDownloadLink(taskId);
    console.log('✅ Model download link:', modelUrl);

    // Step 2: Download the file with progress tracking
    console.log('Step 2: Downloading model...');
    console.log('⬇️ Downloading model as', `${taskId}.zip`);

    const blob = await downloadModel(taskId, (downloaded, total) => {
      const progress = Math.round((downloaded / total) * 100);
      const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
      const totalMB = (total / 1024 / 1024).toFixed(2);
      console.log(`Progress: ${progress}% (${downloadedMB}/${totalMB} MB)`);
    });

    console.log(`🎉 Download complete! Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // Auto-save if requested
    if (autoSave) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('💾 File saved as:', `${taskId}.zip`);
    }

    return blob;
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
}

/**
 * Complete workflow test
 * Runs all three tests in sequence
 *
 * @param videoFile - Video file to upload
 */
export async function testCompleteWorkflow(videoFile: File | Blob): Promise<void> {
  console.log('=== COMPLETE WORKFLOW TEST ===\n');

  try {
    // Test 1: Upload
    const taskId = await testUploadVideo(videoFile);
    console.log('\n');

    // Wait a bit before checking status
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Check Status
    await testCheckStatus(taskId);
    console.log('\n');

    // Poll until complete (with timeout)
    console.log('Polling for completion...');
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    let attempts = 0;
    let isComplete = false;

    while (attempts < maxAttempts && !isComplete) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = await checkTaskStatus(taskId);
      console.log(`[${attempts + 1}/${maxAttempts}] Status: ${status.status} (${status.progress}%)`);

      if (status.status === 'completed') {
        isComplete = true;
        console.log('✅ Processing complete!\n');

        // Test 3: Download
        await testDownloadModel(taskId);
      } else if (status.status === 'failed') {
        throw new Error('Processing failed: ' + (status.error || 'Unknown error'));
      }

      attempts++;
    }

    if (!isComplete) {
      console.log('⏱️ Timeout: Processing is still ongoing. Task ID:', taskId);
      console.log('You can check status later with: testCheckStatus("' + taskId + '")');
    }

    console.log('\n=== WORKFLOW TEST COMPLETE ===');
  } catch (error) {
    console.error('Workflow test failed:', error);
    throw error;
  }
}

/**
 * Quick status map for debugging
 * Equivalent to the Python status_map
 */
export const STATUS_MAP = {
  '-1': 'Uploading',
  '0': 'Processing',
  '1': 'Failed',
  '2': 'Successful',
  '3': 'Queuing',
  '4': 'Expired'
} as const;

/**
 * Example usage in console:
 *
 * // Get a video file from input
 * const fileInput = document.querySelector('input[type="file"]');
 * const videoFile = fileInput.files[0];
 *
 * // Run complete workflow
 * import { testCompleteWorkflow } from '@/utils/kiriEngineTest';
 * await testCompleteWorkflow(videoFile);
 *
 * // Or run individual tests
 * import { testUploadVideo, testCheckStatus, testDownloadModel } from '@/utils/kiriEngineTest';
 *
 * const taskId = await testUploadVideo(videoFile);
 * await testCheckStatus(taskId);
 * await testDownloadModel(taskId);
 */
