import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Video, Upload, Download, ArrowLeft, MapPin, Navigation, X, Check, Info, Square, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { uploadVideoToKiriEngine, checkKiriEngineHealth } from '@/services/kiriEngine';
import { addTask } from '@/services/supabaseTasksManager';
import { useToast } from '@/hooks/use-toast';

export const Capture3D = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [address, setAddress] = useState<string>('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [kiriEngineReady, setKiriEngineReady] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const MAPBOX_TOKEN = 'pk.eyJ1IjoibGVvYm95MTQiLCJhIjoiY21nb3d5M2VoMjRtbzJscTI3MnQ2Mnh4aiJ9.sqwaGRi4rx40uestYAB_Xg';

  const steps = [
    { number: 1, title: 'Location', description: 'Set location', icon: MapPin },
    { number: 2, title: 'Capture', description: 'Record video', icon: Video }
  ];

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
    checkKiriEngine();
  }, []);

  const checkKiriEngine = async () => {
    try {
      const health = await checkKiriEngineHealth();
      setKiriEngineReady(health.status === 'ok' && health.apiKeyValid);
    } catch (error) {
      console.error('Error checking Kiri Engine:', error);
      setKiriEngineReady(false);
    }
  };

  // Initialize map when location is available
  useEffect(() => {
    if (!location || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [location.lng, location.lat],
      zoom: 16,
      pitch: 45,
      bearing: 0
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add marker at location
    const marker = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
      .setLngLat([location.lng, location.lat])
      .addTo(map);

    markerRef.current = marker;

    // Update location when marker is dragged
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setLocation({
        lat: lngLat.lat,
        lng: lngLat.lng,
        accuracy: location.accuracy
      });
      reverseGeocode(lngLat.lat, lngLat.lng);
    });

    // Add accuracy circle
    map.on('load', () => {
      map.addSource('accuracy-circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          properties: {}
        }
      });

      map.addLayer({
        id: 'accuracy-circle-layer',
        type: 'circle',
        source: 'accuracy-circle',
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, location.accuracy * 2]
            ],
            base: 2
          },
          'circle-color': '#3b82f6',
          'circle-opacity': 0.2,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.5
        }
      });
    });

    return () => {
      map.remove();
    };
  }, [location]);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(loc);
        setIsLoadingLocation(false);
        reverseGeocode(loc.lat, loc.lng);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setAddress(data.features[0].place_name);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordingDuration(0);

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setCapturedVideo(videoUrl);
      setIsRecording(false);
      setRecordingDuration(0);
    };

    mediaRecorder.start();
    setIsRecording(true);

    // Start duration timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const processGaussianSplatting = async () => {
    if (!capturedVideo || !location) {
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    // AbortController for cancellation
    const abortController = new AbortController();

    try {
      // Step 1: Convert video URL to Blob
      toast({
        title: 'Preparing video...',
        description: 'Converting video format',
      });
      const response = await fetch(capturedVideo);
      const videoBlob = await response.blob();
      
      // Import compression utilities
      const { compressVideo, formatBytes, formatTime, estimateUploadTime } = await import('@/utils/videoCompression');
      const { uploadVideoWithProgress } = await import('@/services/kiriEngineUpload');
      
      const originalSize = formatBytes(videoBlob.size);
      console.log('Original video size:', originalSize);

      // Step 2: Compress video (saves 50-70% size)
      toast({
        title: 'Compressing video...',
        description: `Original: ${originalSize}. This improves upload speed.`,
      });
      
      const compressedBlob = await compressVideo(videoBlob, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.7,
        videoBitrate: 2500000,
      }, (progress) => {
        setUploadProgress(progress.progress * 0.2); // 0-20%
      });

      const compressedSize = formatBytes(compressedBlob.size);
      const savings = Math.round((1 - compressedBlob.size / videoBlob.size) * 100);
      console.log(`Compressed to ${compressedSize} (${savings}% smaller)`);

      // Step 3: Create pothole record in database
      const { supabase } = await import('@/integrations/supabase/client');

      const roadId = `road_${Math.floor(location.lat * 100)}_${Math.floor(location.lng * 100)}`;
      const potholeNumber = Math.floor(Math.random() * 1000) + 1;

      const { data: potholeData, error: potholeError } = await supabase
        .from('potholes')
        .insert({
          road_id: roadId,
          pothole_number: potholeNumber,
          latitude: location.lat,
          longitude: location.lng,
          severity: 'medium',
          detection_accuracy: 0.95,
          status: 'reported',
          description: `3D scan captured at ${address || 'unknown location'}`,
          reported_by: 'mobile_app'
        })
        .select()
        .single();

      if (potholeError) {
        throw new Error(`Database error: ${potholeError.message}`);
      }

      // Step 4: Upload to Kiri Engine with progress tracking
      const estimatedTime = estimateUploadTime(compressedBlob);
      toast({
        title: 'Uploading to Kiri Engine...',
        description: `${compressedSize} • Est. ${formatTime(estimatedTime)}`,
      });

      const uploadResult = await uploadVideoWithProgress(compressedBlob, {
        isMesh: '0',
        fileFormat: 'ply',
        signal: abortController.signal,
        onProgress: (progress) => {
          // Map upload progress to 20-90%
          setUploadProgress(20 + (progress.percentage * 0.7));
        },
      });

      console.log('Upload successful, task ID:', uploadResult.data.serialize);

      // Step 5: Save task to Supabase and navigate immediately (optimistic UI)
      const task = await addTask(uploadResult.data.serialize, capturedVideo, potholeData.id);
      setUploadProgress(100);

      if (!task) {
        throw new Error('Failed to save task to database');
      }

      toast({
        title: 'Upload complete!',
        description: 'Processing your 3D model now...',
      });

      // Navigate immediately - don't make user wait
      navigate(`/processing/${task.id}`);
    } catch (error) {
      console.error('Error processing with Kiri Engine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it was cancelled
      if (errorMessage.includes('cancelled') || errorMessage.includes('aborted')) {
        toast({
          title: 'Upload cancelled',
          description: 'You can try again when ready',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: errorMessage,
        });
      }
      
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Only handle one video file
    const videoUrl = URL.createObjectURL(file);
    setCapturedVideo(videoUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
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
              <span className="hidden sm:inline">Back</span>
            </Button>

            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              3D Capture
            </h1>

            <div className="flex items-center gap-2">
              {kiriEngineReady === null ? (
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">Checking...</span>
                </div>
              ) : kiriEngineReady ? (
                <div className="flex items-center gap-1.5 text-green-600 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">Kiri Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600 text-xs">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="hidden sm:inline">Kiri Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Step Indicator */}
      <div className="sticky top-16 sm:top-20 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        currentStep > step.number
                          ? 'bg-green-500 text-white'
                          : currentStep === step.number
                          ? 'bg-pothole-500 text-white ring-4 ring-pothole-100'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${currentStep === step.number ? 'text-pothole-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 pt-32 sm:pt-36">

        {/* Step 1: Location */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {isLoadingLocation ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-4">
                    <Loader2 className="w-12 h-12 text-pothole-500 animate-spin" />
                  </div>
                  <p className="text-gray-900 font-medium mb-1">Finding your location...</p>
                  <p className="text-sm text-gray-500">Please allow location access</p>
                </CardContent>
              </Card>
            ) : locationError ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-900 font-semibold mb-4">{locationError}</p>
                  <Button
                    onClick={getCurrentLocation}
                    className="gap-2 bg-pothole-500 hover:bg-pothole-600"
                  >
                    <Navigation className="w-4 h-4" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : location ? (
              <>
                {/* Map */}
                <Card className="overflow-hidden border border-gray-200/50 shadow-sm">
                  <div className="relative aspect-[4/3] sm:aspect-[16/9]">
                    <div ref={mapContainerRef} className="absolute inset-0" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
                      <p className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Drag to adjust
                      </p>
                    </div>
                    {!locationConfirmed && (
                      <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:w-auto bg-green-500 text-white rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs font-medium">✓ Location found · ±{Math.round(location.accuracy)}m</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Address */}
                {address && (
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-pothole-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
                          <p className="text-sm text-gray-900">{address}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Continue Button */}
                <Button
                  onClick={() => {
                    setLocationConfirmed(true);
                    setCurrentStep(2);
                  }}
                  className="w-full h-12 text-base font-semibold bg-pothole-500 hover:bg-pothole-600"
                  disabled={!location}
                >
                  Continue to Capture
                </Button>
              </>
            ) : null}
          </div>
        )}

        {/* Step 2: Capture */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Camera Viewfinder */}
            <Card className="overflow-hidden">
              <div className="relative bg-gray-900">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto object-contain"
                />
                {!isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 min-h-[300px]">
                    <Camera className="w-16 h-16 text-gray-400 mb-3" />
                    <p className="text-gray-300 font-medium">Camera inactive</p>
                    <p className="text-sm text-gray-500 mt-1">Start camera to begin capturing</p>
                  </div>
                )}
                {/* Recording Status Overlay */}
                {isCapturing && (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                    {isRecording ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-semibold">
                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    ) : capturedVideo ? (
                      <p className="text-sm font-semibold">✓ Video recorded</p>
                    ) : (
                      <p className="text-sm font-semibold">Ready to record</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3">
              {!isCapturing ? (
                <>
                  <Button
                    onClick={startCamera}
                    className="h-12 gap-2 bg-pothole-500 hover:bg-pothole-600"
                  >
                    <Video className="w-4 h-4" />
                    Start Camera
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 gap-2"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </Button>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                </>
              ) : (
                <>
                  {!isRecording && !capturedVideo ? (
                    <Button
                      onClick={startRecording}
                      className="h-12 gap-2 bg-red-600 hover:bg-red-700 col-span-2"
                    >
                      <Video className="w-5 h-5" />
                      Start Recording
                    </Button>
                  ) : isRecording ? (
                    <Button
                      onClick={stopRecording}
                      className="h-12 gap-2 bg-red-600 hover:bg-red-700 col-span-2"
                    >
                      <Square className="w-5 h-5" />
                      Stop Recording
                    </Button>
                  ) : null}
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="h-12 gap-2 col-span-2"
                  >
                    <X className="w-4 h-4" />
                    Stop Camera
                  </Button>
                </>
              )}
            </div>

            {/* Kiri Engine Status */}
            {capturedVideo && kiriEngineReady === false && (
              <Card className="border border-gray-200/50 shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-900 mb-1">Kiri Engine Unavailable</p>
                      <p className="text-xs text-red-700">Please check your API key configuration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips - Collapsible */}
            {!capturedVideo && (
              <Card className="border border-gray-200/50 shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900 mb-1">Tips for best results</p>
                      <p className="text-xs text-blue-700">Record a 360° video walking around the pothole, capturing all angles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video Preview */}
            {capturedVideo && (
              <>
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Captured Video</p>
                        <p className="text-xs text-gray-500">Ready to process</p>
                      </div>
                      <Button
                        onClick={() => setCapturedVideo(null)}
                        variant="ghost"
                        size="sm"
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear
                      </Button>
                    </div>

                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={capturedVideo}
                        controls
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Kiri Engine Status Warning */}
                {!kiriEngineReady && (
                  <Card className="border border-gray-200/50 shadow-sm">
                    <CardContent className="py-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-900 mb-1">Kiri Engine Unavailable</p>
                          <p className="text-xs text-amber-700">
                            The 3D processing service is currently unavailable. You can still capture videos, but processing may fail.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Progress Bar */}
                {isProcessing && uploadProgress > 0 && (
                  <Card className="border border-gray-200/50 shadow-sm">
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-900 font-medium">Uploading to Kiri Engine</span>
                          <span className="text-blue-700">{uploadProgress}%</span>
                        </div>
                        <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-blue-600">
                          {uploadProgress < 20 && "Preparing video..."}
                          {uploadProgress >= 20 && uploadProgress < 70 && "Uploading to Kiri Engine..."}
                          {uploadProgress >= 70 && "Finalizing upload..."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generate Button */}
                <Button
                  onClick={processGaussianSplatting}
                  disabled={isProcessing || !capturedVideo || !kiriEngineReady}
                  className="w-full h-12 text-base font-semibold bg-pothole-500 hover:bg-pothole-600 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {uploadProgress === 0 ? 'Starting Upload...' : 'Processing 3D Model...'}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Generate 3D Model
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Capture3D;
