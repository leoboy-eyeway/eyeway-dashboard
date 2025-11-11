/**
 * Kiri Engine Test Page
 *
 * This page provides a UI for testing the Kiri Engine API
 * Replicates the functionality of the Python test scripts
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, CheckCircle, Download, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { testUploadVideo, testCheckStatus, testDownloadModel } from '@/utils/kiriEngineTest';
import { useToast } from '@/hooks/use-toast';

type TestStep = 'idle' | 'uploading' | 'checking' | 'downloading';

export const KiriEngineTestPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState('');
  const [manualTaskId, setManualTaskId] = useState('');
  const [currentStep, setCurrentStep] = useState<TestStep>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      addLog(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleTestUpload = async () => {
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a video file first',
      });
      return;
    }

    setCurrentStep('uploading');
    addLog('=== TEST 1: Upload Video ===');

    try {
      const serialize = await testUploadVideo(selectedFile);
      setTaskId(serialize);
      setManualTaskId(serialize);

      addLog(`✅ Upload success! Task ID: ${serialize}`);
      toast({
        title: 'Upload Successful',
        description: `Task ID: ${serialize.slice(0, 12)}...`,
      });
    } catch (error) {
      addLog(`❌ Upload failed: ${error}`);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCurrentStep('idle');
    }
  };

  const handleTestStatus = async () => {
    const idToCheck = manualTaskId || taskId;
    if (!idToCheck) {
      toast({
        variant: 'destructive',
        title: 'No Task ID',
        description: 'Please upload a file or enter a task ID',
      });
      return;
    }

    setCurrentStep('checking');
    addLog('=== TEST 2: Check Status ===');

    try {
      await testCheckStatus(idToCheck);
      addLog(`✅ Status check complete for: ${idToCheck}`);
      toast({
        title: 'Status Checked',
        description: 'See console for details',
      });
    } catch (error) {
      addLog(`❌ Status check failed: ${error}`);
      toast({
        variant: 'destructive',
        title: 'Status Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCurrentStep('idle');
    }
  };

  const handleTestDownload = async () => {
    const idToDownload = manualTaskId || taskId;
    if (!idToDownload) {
      toast({
        variant: 'destructive',
        title: 'No Task ID',
        description: 'Please upload a file or enter a task ID',
      });
      return;
    }

    setCurrentStep('downloading');
    addLog('=== TEST 3: Download Model ===');

    try {
      const blob = await testDownloadModel(idToDownload, true);
      addLog(`✅ Download complete! Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      toast({
        title: 'Download Complete',
        description: 'Model saved to downloads',
      });
    } catch (error) {
      addLog(`❌ Download failed: ${error}`);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCurrentStep('idle');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Kiri Engine API Test</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Python Script Test Utilities</p>
                <p className="text-blue-700">
                  This page replicates the Python test scripts for the Kiri Engine API.
                  Upload a video, check status, and download the result.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test 1: Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Test 1: Upload Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={currentStep !== 'idle'}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <Button
              onClick={handleTestUpload}
              disabled={!selectedFile || currentStep !== 'idle'}
              className="w-full"
            >
              {currentStep === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload to Kiri Engine
                </>
              )}
            </Button>
            {taskId && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 font-medium mb-1">Task ID:</p>
                <p className="text-sm text-green-900 font-mono break-all">{taskId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test 2: Check Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Test 2: Check Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Task ID (or use uploaded task)
              </label>
              <Input
                type="text"
                value={manualTaskId}
                onChange={(e) => setManualTaskId(e.target.value)}
                placeholder="Enter task ID or upload a file"
                disabled={currentStep !== 'idle'}
              />
            </div>
            <Button
              onClick={handleTestStatus}
              disabled={(!taskId && !manualTaskId) || currentStep !== 'idle'}
              className="w-full"
              variant="outline"
            >
              {currentStep === 'checking' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test 3: Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Test 3: Download Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Download the completed 3D model ZIP file. Only works when processing is complete.
            </p>
            <Button
              onClick={handleTestDownload}
              disabled={(!taskId && !manualTaskId) || currentStep !== 'idle'}
              className="w-full"
              variant="outline"
            >
              {currentStep === 'downloading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Model
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Console Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Console Output</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">No logs yet. Run a test to see output.</p>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`${
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('❌') ? 'text-red-400' :
                        log.includes('===') ? 'text-blue-400 font-bold' :
                        'text-gray-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reference */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm">Reference</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-600 space-y-2">
            <p>
              <strong>API Base:</strong> https://api.kiriengine.app/api/v1
            </p>
            <p>
              <strong>Status Codes:</strong> -1=Uploading, 0=Processing, 1=Failed, 2=Successful, 3=Queuing, 4=Expired
            </p>
            <p>
              <strong>Python Equivalents:</strong> See KIRI_ENGINE_PYTHON_REFERENCE.md
            </p>
            <p>
              <strong>Test Utilities:</strong> src/utils/kiriEngineTest.ts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KiriEngineTestPage;
