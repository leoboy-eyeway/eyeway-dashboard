import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Check, X, Download, Film, Image as ImageIcon, Info, List, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadImagesToKiriEngine, uploadVideoToKiriEngine, upload3DGSFilesToKiriEngine, checkTaskStatus, downloadModel, getDownloadLink, ScanType, FileFormat } from '@/services/kiriEngine';
import { useToast } from '@/hooks/use-toast';
import { getAllTasks, addTask, updateTask, deleteTask, subscribeToTasks, ProcessingTask } from '@/services/supabaseTasksManager';
import { PLY3DGSViewer } from '@/components/3DGSViewer';
import { GSplatViewer } from '@/components/GSplatViewer';
import { GSplatViewerIframe } from '@/components/GSplatViewerIframe';
import { AdaptiveGSplatViewer } from '@/components/AdaptiveGSplatViewer';
import { OBJViewer } from '@/components/OBJViewer';

type Step = 'upload' | 'processing' | 'completed' | 'failed';
type View = 'workflow' | 'tasklist';

export const ProcessingProgress = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentView, setCurrentView] = useState<View>('workflow');
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadType, setUploadType] = useState<'images' | 'video' | '3dgs' | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [scanType, setScanType] = useState<ScanType>('3dgs');
  const [fileFormat, setFileFormat] = useState<FileFormat>('glb');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taskId, setTaskId] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [allTasks, setAllTasks] = useState<ProcessingTask[]>([]);
  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [local3DGSUrl, setLocal3DGSUrl] = useState<string>('');
  const [localModelFileType, setLocalModelFileType] = useState<'ply' | 'obj' | 'splat' | null>(null);

  // Memoized function to load tasks
  const loadTasks = useCallback(async () => {
    const tasks = await getAllTasks();
    setAllTasks(tasks);
  }, []);

  // Memoized function to refresh all active tasks
  const refreshAllTasks = useCallback(async () => {
    const tasks = await getAllTasks();
    const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'processing');

    for (const task of activeTasks) {
      try {
        const status = await checkTaskStatus(task.taskId);

        let statusMsg = '';
        if (status.progress <= 10) statusMsg = 'Uploading to Kiri Engine...';
        else if (status.progress <= 30) statusMsg = 'Extracting frames & features...';
        else if (status.progress <= 50) statusMsg = 'Detecting & matching features...';
        else if (status.progress <= 75) statusMsg = 'Building 3D point cloud...';
        else if (status.progress <= 95) statusMsg = 'Generating 3D model...';
        else statusMsg = 'Finalizing...';

        // Update task with status and model URL if available
        await updateTask(task.id, {
          status: status.status,
          progress: status.progress,
          statusMessage: statusMsg,
          error: status.error,
          modelUrl: status.result?.modelUrl // Save download URL when completed
        });
      } catch (err) {
        console.error('Error updating task:', err);
      }
    }

    await loadTasks();
  }, [loadTasks]);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTasks(async (payload) => {
      console.log('Real-time update:', payload);
      try {
        // Reload tasks when any change occurs
        await loadTasks();
      } catch (error) {
        console.error('Failed to reload tasks after real-time update:', error);
        toast({
          variant: 'destructive',
          title: 'Sync Error',
          description: 'Failed to refresh task list. Please refresh manually.',
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadTasks, toast]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (local3DGSUrl) {
        URL.revokeObjectURL(local3DGSUrl);
      }
    };
  }, [local3DGSUrl]);

  // Auto-refresh all active tasks
  useEffect(() => {
    if (currentView === 'tasklist') {
      const interval = setInterval(() => {
        refreshAllTasks();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentView, refreshAllTasks]);

  const handleRefreshAllTasks = async () => {
    setIsRefreshingAll(true);

    try {
      await refreshAllTasks();
      toast({
        title: 'Tasks Refreshed',
        description: 'All active tasks have been updated',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh tasks',
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Poll for status updates
  useEffect(() => {
    if (currentStep === 'processing' && taskId) {
      const interval = setInterval(async () => {
        try {
          const status = await checkTaskStatus(taskId);
          setProcessingProgress(status.progress);

          // Update status message based on progress
          if (status.progress <= 10) setStatusMessage('Uploading to Kiri Engine...');
          else if (status.progress <= 30) setStatusMessage('Extracting frames & features...');
          else if (status.progress <= 50) setStatusMessage('Detecting & matching features...');
          else if (status.progress <= 75) setStatusMessage('Building 3D point cloud...');
          else if (status.progress <= 95) setStatusMessage('Generating 3D model...');
          else setStatusMessage('Finalizing...');

          if (status.status === 'completed') {
            setCurrentStep('completed');
            setStatusMessage('3D model ready!');

            // Save download URL if available
            if (status.result?.modelUrl) {
              setDownloadUrl(status.result.modelUrl);
            }

            toast({
              title: 'Processing Complete!',
              description: 'Your 3D model is ready to download',
            });
          } else if (status.status === 'failed') {
            setCurrentStep('failed');
            setError(status.error || 'Processing failed');
            toast({
              variant: 'destructive',
              title: 'Processing Failed',
              description: status.error || 'Unknown error occurred',
            });
          }
        } catch (err) {
          console.error('Error checking status:', err);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentStep, taskId, toast]);

  const handleFileSelect = (type: 'images' | 'video' | '3dgs') => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === 'images' ? 'image/*' :
        type === 'video' ? 'video/*' :
        type === '3dgs' ? '.ply,.obj,.mtl,.splat,.json,.jpg,.jpeg,.png,.bmp,.tga' : '';
      fileInputRef.current.multiple = type === 'images' || type === '3dgs';
      fileInputRef.current.click();
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    console.log('Files selected:', files.length, files.map(f => f.name));
    console.log('Upload type:', uploadType);

    if (uploadType === 'images') {
      if (files.length < 20 || files.length > 300) {
        toast({
          variant: 'destructive',
          title: 'Invalid Image Count',
          description: 'Please select between 20 and 300 images',
        });
        return;
      }
    }

    setSelectedFiles(files);

    toast({
      title: 'Files Selected',
      description: `${files.length} file(s) ready to upload`,
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Handle 3DGS files separately - for local viewing only
      if (uploadType === '3dgs') {
        console.log('Loading 3DGS files for local viewing...');
        console.log('Selected files:', selectedFiles.map(f => ({ name: f.name, type: f.type })));

        const plyFile = selectedFiles.find(f => f.name.toLowerCase().endsWith('.ply'));
        const objFile = selectedFiles.find(f => f.name.toLowerCase().endsWith('.obj'));
        const mtlFile = selectedFiles.find(f => f.name.toLowerCase().endsWith('.mtl'));
        const splatFile = selectedFiles.find(f => f.name.toLowerCase().endsWith('.splat'));
        const textureFiles = selectedFiles.filter(f => {
          const ext = f.name.toLowerCase();
          return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') ||
                 ext.endsWith('.bmp') || ext.endsWith('.tga');
        });
        const jsonFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.json'));
        const camerasFile = jsonFiles[0];

        console.log('Found PLY file:', plyFile?.name);
        console.log('Found OBJ file:', objFile?.name);
        console.log('Found MTL file:', mtlFile?.name);
        console.log('Found texture files:', textureFiles.map(f => f.name));
        console.log('Found SPLAT file:', splatFile?.name);
        console.log('Found cameras file:', camerasFile?.name);

        const modelFile = plyFile || objFile || splatFile;

        if (!modelFile) {
          throw new Error('Please select a .ply, .obj, or .splat file to view');
        }

        // For OBJ files with MTL and textures, we need to handle them specially
        if (objFile && mtlFile) {
          // Create blob URLs for all files
          const objBlob = URL.createObjectURL(objFile);
          const mtlBlob = URL.createObjectURL(mtlFile);
          const textureBlobs = new Map<string, string>();

          textureFiles.forEach(file => {
            textureBlobs.set(file.name, URL.createObjectURL(file));
          });

          // Store URLs in window for the viewer to access
          (window as any).modelFiles = {
            obj: objBlob,
            mtl: mtlBlob,
            textures: textureBlobs,
            objFileName: objFile.name,
            mtlFileName: mtlFile.name
          };

          setLocal3DGSUrl(objBlob);
          setLocalModelFileType('obj');
        } else {
          // Create local URL for the model file and detect type
          const localUrl = URL.createObjectURL(modelFile);
          setLocal3DGSUrl(localUrl);

          // Set the file type for the viewer
          if (modelFile.name.toLowerCase().endsWith('.obj')) {
            setLocalModelFileType('obj');
          } else if (modelFile.name.toLowerCase().endsWith('.ply')) {
            setLocalModelFileType('ply');
          } else if (modelFile.name.toLowerCase().endsWith('.splat')) {
            setLocalModelFileType('splat');
          }
        }

        setCurrentStep('completed');
        setUploadProgress(100);

        toast({
          title: '3DGS Files Loaded!',
          description: 'Your 3DGS model is ready to view',
        });

        setIsUploading(false);
        return;
      }

      // Handle images and video - process with Kiri Engine
      let result;

      console.log('Starting upload...', { uploadType, scanType, filesCount: selectedFiles.length });

      if (uploadType === 'images') {
        // Upload images
        result = await uploadImagesToKiriEngine(selectedFiles, {
          scanType,
          isMesh: true,
          fileFormat: fileFormat,
        });
      } else if (uploadType === 'video') {
        // Upload video
        console.log('Uploading video to Kiri Engine...');
        result = await uploadVideoToKiriEngine(selectedFiles[0], {
          scanType,
          isMesh: true,
          fileFormat: fileFormat,
        });
      }

      console.log('Upload result:', result);

      if (!result || !result.data || !result.data.serialize) {
        throw new Error('Invalid response: missing task ID');
      }

      const serialize = result.data.serialize;
      console.log('Task ID received:', serialize);

      setTaskId(serialize);
      setCurrentStep('processing');
      setUploadProgress(100);

      // Save task to Supabase
      await addTask(serialize);
      await loadTasks();

      toast({
        title: 'Upload Successful!',
        description: `Processing started. Task ID: ${serialize.slice(0, 8)}`,
      });
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!taskId) return;

    try {
      toast({
        title: 'Downloading...',
        description: 'Your 3D model is being downloaded',
      });

      const blob = await downloadModel(taskId, (downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100);
        console.log(`Download progress: ${progress}%`);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3d-model-${taskId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete!',
        description: 'Your 3D model has been downloaded',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleReset = () => {
    // Clean up object URL if it exists
    if (local3DGSUrl) {
      URL.revokeObjectURL(local3DGSUrl);
      setLocal3DGSUrl('');
    }

    setCurrentStep('upload');
    setUploadType(null);
    setSelectedFiles([]);
    setTaskId('');
    setProcessingProgress(0);
    setStatusMessage('');
    setError('');
    setDownloadUrl('');
    setLocalModelFileType(null); // Reset file type
    setFileFormat('glb'); // Reset to default format
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {/* Step 1: Upload */}
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
          currentStep === 'upload' ? 'border-blue-500 bg-blue-50 text-blue-600' :
          ['processing', 'completed', 'failed'].includes(currentStep) ? 'border-green-500 bg-green-50 text-green-600' :
          'border-gray-300 bg-white text-gray-400'
        }`}>
          {['processing', 'completed', 'failed'].includes(currentStep) ? <Check className="w-5 h-5" /> : '1'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">Upload</span>
      </div>

      {/* Connector */}
      <div className={`w-12 h-0.5 ${
        ['processing', 'completed', 'failed'].includes(currentStep) ? 'bg-green-500' : 'bg-gray-300'
      }`}></div>

      {/* Step 2: Processing */}
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
          currentStep === 'processing' ? 'border-blue-500 bg-blue-50 text-blue-600' :
          ['completed', 'failed'].includes(currentStep) ? 'border-green-500 bg-green-50 text-green-600' :
          'border-gray-300 bg-white text-gray-400'
        }`}>
          {['completed', 'failed'].includes(currentStep) ? <Check className="w-5 h-5" /> :
           currentStep === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : '2'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">Processing</span>
      </div>

      {/* Connector */}
      <div className={`w-12 h-0.5 ${
        currentStep === 'completed' ? 'bg-green-500' : 'bg-gray-300'
      }`}></div>

      {/* Step 3: Download */}
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
          currentStep === 'completed' ? 'border-green-500 bg-green-50 text-green-600' :
          currentStep === 'failed' ? 'border-red-500 bg-red-50 text-red-600' :
          'border-gray-300 bg-white text-gray-400'
        }`}>
          {currentStep === 'completed' ? <Check className="w-5 h-5" /> :
           currentStep === 'failed' ? <X className="w-5 h-5" /> : '3'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">
          {currentStep === 'failed' ? 'Failed' : 'Download'}
        </span>
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 1: Upload Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Type Selection */}
        {!uploadType && (
          <>
            {/* Process New Model Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Process New 3D Model</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleFileSelect('images')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-semibold text-lg mb-2">Upload Images</h3>
                  <p className="text-sm text-gray-600">20-300 images for best results</p>
                </button>

                <button
                  onClick={() => handleFileSelect('video')}
                  className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Film className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-semibold text-lg mb-2">Upload Video</h3>
                  <p className="text-sm text-gray-600">Single video file (max 3 min)</p>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* View Existing 3DGS Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">View Existing 3DGS Model</h3>
              <button
                onClick={() => handleFileSelect('3dgs')}
                className="w-full p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold text-lg mb-2">Upload 3D Model Files for Viewing</h3>
                <p className="text-sm text-gray-600">.ply, .obj (with textures), or .splat files</p>
                <p className="text-xs text-green-600 mt-2">View pre-processed 3D models and 3DGS outputs</p>
                <p className="text-xs text-gray-500 mt-1">Supports: OBJ + MTL + textures, Nerfstudio, COLMAP, Kiri Engine</p>
              </button>
            </div>
          </>
        )}

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={uploadType === 'images' || uploadType === '3dgs'}
          accept={uploadType === 'images' ? 'image/*' :
                  uploadType === 'video' ? 'video/*' :
                  uploadType === '3dgs' ? '.ply,.obj,.mtl,.splat,.json,.jpg,.jpeg,.png,.bmp,.tga' : undefined}
          onChange={handleFilesChange}
        />

        {/* Selected Files Info */}
        {selectedFiles.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900 mb-2">
              {uploadType === 'images' ? `${selectedFiles.length} images selected` :
               uploadType === 'video' ? 'Video selected' :
               uploadType === '3dgs' ? `${selectedFiles.length} file(s) selected` : ''}
            </p>
            {uploadType === 'images' && selectedFiles.length < 20 && (
              <p className="text-sm text-blue-700">⚠️ At least 20 images recommended</p>
            )}
            {uploadType === 'images' && selectedFiles.length > 300 && (
              <p className="text-sm text-blue-700">⚠️ Maximum 300 images allowed</p>
            )}
            {uploadType === '3dgs' && !selectedFiles.some(f => {
              const name = f.name.toLowerCase();
              return name.endsWith('.ply') || name.endsWith('.obj') || name.endsWith('.splat');
            }) && (
              <p className="text-sm text-blue-700">⚠️ Please select a .ply, .obj, or .splat file</p>
            )}
            {uploadType === '3dgs' && selectedFiles.some(f => {
              const name = f.name.toLowerCase();
              return name.endsWith('.ply') || name.endsWith('.obj') || name.endsWith('.splat');
            }) && (
              <p className="text-sm text-green-700">✓ Ready to view 3DGS model</p>
            )}
          </div>
        )}

        {/* Scan Type Selection - Hide for 3DGS uploads */}
        {selectedFiles.length > 0 && uploadType !== '3dgs' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Scan Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setScanType('3dgs')}
                className={`p-3 border rounded-lg text-left ${
                  scanType === '3dgs' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">3D Gaussian Splatting</p>
                <p className="text-xs text-gray-600">Best for most objects</p>
              </button>
              <button
                onClick={() => setScanType('photo')}
                className={`p-3 border rounded-lg text-left ${
                  scanType === 'photo' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">Photo Scan</p>
                <p className="text-xs text-gray-600">Best for detailed textures</p>
              </button>
              <button
                onClick={() => setScanType('featureless')}
                className={`p-3 border rounded-lg text-left ${
                  scanType === 'featureless' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">Featureless</p>
                <p className="text-xs text-gray-600">Best for smooth/reflective</p>
              </button>
            </div>
          </div>
        )}

        {/* Output Format Selection - Hide for 3DGS uploads */}
        {selectedFiles.length > 0 && uploadType !== '3dgs' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Output Format</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setFileFormat('glb')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'glb' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.GLB</p>
                <p className="text-xs text-gray-600">Web & games</p>
              </button>
              <button
                onClick={() => setFileFormat('obj')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'obj' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.OBJ</p>
                <p className="text-xs text-gray-600">3D software</p>
              </button>
              <button
                onClick={() => setFileFormat('fbx')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'fbx' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.FBX</p>
                <p className="text-xs text-gray-600">Game engines</p>
              </button>
              <button
                onClick={() => setFileFormat('stl')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'stl' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.STL</p>
                <p className="text-xs text-gray-600">3D printing</p>
              </button>
              <button
                onClick={() => setFileFormat('ply')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'ply' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.PLY</p>
                <p className="text-xs text-gray-600">Point cloud</p>
              </button>
              <button
                onClick={() => setFileFormat('gltf')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'gltf' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.GLTF</p>
                <p className="text-xs text-gray-600">Web standard</p>
              </button>
              <button
                onClick={() => setFileFormat('usdz')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'usdz' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.USDZ</p>
                <p className="text-xs text-gray-600">Apple AR</p>
              </button>
              <button
                onClick={() => setFileFormat('xyz')}
                className={`p-3 border rounded-lg text-left ${
                  fileFormat === 'xyz' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <p className="font-medium">.XYZ</p>
                <p className="text-xs text-gray-600">Point cloud</p>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {selectedFiles.length > 0 && (
            <>
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  (uploadType === 'images' && (selectedFiles.length < 20 || selectedFiles.length > 300)) ||
                  (uploadType === '3dgs' && !selectedFiles.some(f => {
                    const name = f.name.toLowerCase();
                    return name.endsWith('.ply') || name.endsWith('.obj') || name.endsWith('.splat');
                  }))
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadType === '3dgs' ? 'Loading...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadType === '3dgs' ? 'Load Model' : 'Start Processing'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-gray-50 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use 20-300 high-quality images or a short video</li>
              <li>Capture from different angles around the object</li>
              <li>Ensure good lighting and avoid motion blur</li>
              <li>Processing typically takes 5-15 minutes</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Step 2: Processing 3D Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{statusMessage}</h3>
          <p className="text-gray-600 mb-4">Task ID: {taskId.slice(0, 12)}...</p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="bg-blue-600 h-full transition-all duration-500"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{Math.round(processingProgress)}% Complete</p>
          </div>
        </div>

        {/* Detailed Stages */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 text-center mb-4">Processing Stages</p>

          {[
            { range: [0, 10], label: 'Uploading to Kiri Engine' },
            { range: [10, 30], label: 'Extracting frames & features' },
            { range: [30, 50], label: 'Detecting & matching features' },
            { range: [50, 75], label: 'Building 3D point cloud' },
            { range: [75, 95], label: 'Generating 3D model' },
            { range: [95, 100], label: 'Finalizing' },
          ].map((stage, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                processingProgress >= stage.range[1] ? 'bg-green-500 text-white' :
                processingProgress >= stage.range[0] ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {processingProgress >= stage.range[1] ? <Check className="w-4 h-4" /> :
                 processingProgress >= stage.range[0] ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 index + 1}
              </div>
              <p className={`text-sm ${
                processingProgress >= stage.range[0] ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {stage.label}
              </p>
              {processingProgress >= stage.range[0] && processingProgress < stage.range[1] && (
                <span className="ml-auto text-sm text-blue-600 font-medium">
                  {Math.round(processingProgress)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Estimated Time */}
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <Info className="w-5 h-5 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-blue-900">
            This usually takes 5-15 minutes depending on file size
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompletedStep = () => {
    // Check if this is a local 3DGS viewing session
    const isLocal3DGS = uploadType === '3dgs' && local3DGSUrl;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {isLocal3DGS ? 'View Your 3DGS Model' : 'Step 3: Download Your 3D Model'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {isLocal3DGS ? '3DGS Model Loaded!' : '3D Model Complete!'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isLocal3DGS ? 'Your 3DGS model is ready to view below' : 'Your 3D model is ready to download'}
            </p>

            {!isLocal3DGS && (
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Model
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  Process Another
                </Button>
              </div>
            )}

            {isLocal3DGS && (
              <Button
                onClick={handleReset}
                variant="outline"
              >
                View Another Model
              </Button>
            )}
          </div>

          {/* 3DGS Viewer for local files */}
          {isLocal3DGS && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">3D Model Preview</h4>
                {localModelFileType === 'obj' ? (
                  <OBJViewer
                    url={local3DGSUrl}
                    className="h-[600px] w-full rounded-md overflow-hidden border border-gray-200"
                  />
                ) : (
                  <AdaptiveGSplatViewer
                    url={local3DGSUrl}
                    className="h-[600px] w-full rounded-md overflow-hidden border border-gray-200"
                  />
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Interactive 3D viewer - Use mouse to rotate, pan, and zoom
                </p>
              </div>

              {/* Format Requirements Notice */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700 font-medium mb-2">File Format Information:</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-900 font-medium">✓ Gaussian Splatting Formats:</p>
                    <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc mt-1">
                      <li>.splat files (native format) - best performance</li>
                      <li>.ply files from 3DGS software (Nerfstudio, COLMAP, Kiri Engine)</li>
                      <li>Must contain: position, scale, rotation, color, and opacity data</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-gray-900 font-medium">✓ Standard 3D Formats:</p>
                    <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc mt-1">
                      <li>Regular .ply mesh files (point cloud visualization)</li>
                      <li>Standard 3D scan outputs</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2 pt-2 border-t">
                  The viewer automatically detects your file format and uses the appropriate renderer.
                </p>
              </div>
            </div>
          )}

          {/* Model Info - only for processed models */}
          {!isLocal3DGS && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Model Information</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Task ID: {taskId}</p>
                <p>Scan Type: {scanType.toUpperCase()}</p>
                <p>Format: {fileFormat.toUpperCase()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderFailedStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-red-600">Processing Failed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <X className="w-12 h-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error || 'Unknown error occurred'}</p>

          <Button
            onClick={handleReset}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    await loadTasks();
    toast({
      title: 'Task Deleted',
      description: 'Processing task removed',
    });
  };

  const handleToggle3DView = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const handleCheckTaskStatus = async (taskId: string) => {
    setCheckingTaskId(taskId);

    try {
      const status = await checkTaskStatus(taskId);

      let statusMsg = '';
      if (status.progress <= 10) statusMsg = 'Uploading to Kiri Engine...';
      else if (status.progress <= 30) statusMsg = 'Extracting frames & features...';
      else if (status.progress <= 50) statusMsg = 'Detecting & matching features...';
      else if (status.progress <= 75) statusMsg = 'Building 3D point cloud...';
      else if (status.progress <= 95) statusMsg = 'Generating 3D model...';
      else statusMsg = 'Finalizing...';

      // Find the task and update it
      const tasks = await getAllTasks();
      const task = tasks.find(t => t.taskId === taskId);

      if (task) {
        await updateTask(task.id, {
          status: status.status,
          progress: status.progress,
          statusMessage: statusMsg,
          error: status.error,
          modelUrl: status.result?.modelUrl // Save download URL when completed
        });

        await loadTasks();

        // Show special toast if completed
        if (status.status === 'completed') {
          toast({
            title: '✅ Model Ready!',
            description: 'Your 3D model is ready to download',
          });
        } else {
          toast({
            title: 'Status Updated',
            description: `${statusMsg} (${status.progress}%)`,
          });
        }
      }
    } catch (err) {
      console.error('Error checking task status:', err);
      toast({
        variant: 'destructive',
        title: 'Status Check Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setCheckingTaskId(null);
    }
  };

  const handleDownloadTask = async (taskId: string) => {
    try {
      toast({
        title: 'Preparing Download...',
        description: 'Getting download link for your 3D model',
      });

      // Get the download URL directly instead of downloading the blob
      const downloadUrl = await getDownloadLink(taskId);

      // Create download link and trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `3d-model-${taskId.slice(0, 8)}.zip`;
      a.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(a);

      // Try programmatic download first
      try {
        a.click();
        toast({
          title: 'Download Started!',
          description: 'Your 3D model download has been initiated',
        });
      } catch (clickError) {
        // Fallback: open in new tab
        window.open(downloadUrl, '_blank');
        toast({
          title: 'Download Opened!',
          description: 'Your 3D model opened in a new tab',
        });
      }

      document.body.removeChild(a);

    } catch (err) {
      console.error('Download error:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5" />;
      case 'failed':
        return <X className="w-5 h-5" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      default:
        return null;
    }
  };

  const renderTaskList = () => {
    const activeTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'processing');

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <span>All Processing Tasks</span>
                <span className="text-sm font-normal text-gray-600">
                  {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
                  {activeTasks.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      ({activeTasks.length} active)
                    </span>
                  )}
                </span>
              </CardTitle>
              {activeTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAllTasks}
                  disabled={isRefreshingAll}
                  className="gap-2"
                >
                  {isRefreshingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Refreshing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Refresh All</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
        <CardContent>
          {allTasks.length === 0 ? (
            <div className="text-center py-8">
              <List className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No tasks yet. Start processing to see tasks here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Status Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                      </div>

                      {/* Task Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            Task {task.taskId.slice(0, 8)}...
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {task.statusMessage || 'Processing...'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(task.createdAt).toLocaleString()}
                        </p>

                        {/* Progress Bar */}
                        {(task.status === 'pending' || task.status === 'processing') && (
                          <div className="mt-2">
                            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all duration-500"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round(task.progress)}% complete
                            </p>
                          </div>
                        )}

                        {/* Error */}
                        {task.status === 'failed' && task.error && (
                          <p className="text-sm text-red-600 mt-2">
                            Error: {task.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Check Status Button - Show for all tasks */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckTaskStatus(task.taskId)}
                        disabled={checkingTaskId === task.taskId}
                      >
                        {checkingTaskId === task.taskId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>

                      {/* View 3D Model Button - Show only for completed */}
                      {task.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle3DView(task.id)}
                          className="gap-1"
                        >
                          {expandedTaskId === task.id ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide 3D
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              View 3D
                            </>
                          )}
                        </Button>
                      )}

                      {/* Download Button - Show only for completed */}
                      {task.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownloadTask(task.taskId)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}

                      {/* Delete Button - Show only for completed/failed */}
                      {(task.status === 'completed' || task.status === 'failed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 3D Model Viewer - Show when expanded */}
                  {expandedTaskId === task.id && task.status === 'completed' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">3D Model Preview</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle3DView(task.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </Button>
                      </div>
                      <AdaptiveGSplatViewer
                        url={`https://kiri-enterprise.s3.us-east-2.amazonaws.com/${task.taskId}/output/${task.taskId}.ply`}
                        className="h-[500px] w-full rounded-md overflow-hidden border border-gray-200"
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Interactive 3D viewer - Use mouse to rotate, pan, and zoom
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>

            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              3D Model Processing
            </h1>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView(currentView === 'workflow' ? 'tasklist' : 'workflow')}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">
                {currentView === 'workflow' ? 'View All Tasks' : 'New Process'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'workflow' ? (
          <>
            {renderStepIndicator()}
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'completed' && renderCompletedStep()}
            {currentStep === 'failed' && renderFailedStep()}
          </>
        ) : (
          renderTaskList()
        )}
      </div>
    </div>
  );
};

export default ProcessingProgress;
