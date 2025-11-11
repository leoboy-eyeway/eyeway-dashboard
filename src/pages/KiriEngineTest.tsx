import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkKiriEngineHealth } from '@/services/kiriEngine';

export const KiriEngineTest = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    status: 'ok' | 'error';
    message: string;
    apiKeyValid: boolean;
  } | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setResult(null);
    
    try {
      const health = await checkKiriEngineHealth();
      setResult(health);
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        apiKeyValid: false
      });
    } finally {
      setIsChecking(false);
    }
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
              <span className="hidden sm:inline">Back</span>
            </Button>

            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Kiri Engine Test
            </h1>

            <div className="w-16"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Kiri Engine Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Click the button below to check if the Kiri Engine API is accessible and your API key is valid.
            </p>

            <Button
              onClick={handleCheck}
              disabled={isChecking}
              className="w-full bg-pothole-500 hover:bg-pothole-600"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {result && (
              <div
                className={`p-4 rounded-lg border ${
                  result.status === 'ok'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {result.status === 'ok' ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <X className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-semibold mb-1 ${
                        result.status === 'ok' ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {result.status === 'ok' ? 'Connection Successful' : 'Connection Failed'}
                    </h3>
                    <p
                      className={`text-sm ${
                        result.status === 'ok' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {result.message}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-600">
                        <strong>API Key Valid:</strong>{' '}
                        {result.apiKeyValid ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-red-600">✗ No</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>API Endpoint:</strong> https://api.kiriengine.app/api/
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && result.status === 'error' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">Troubleshooting Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li>Check that your API key is correctly set in the .env file</li>
                      <li>Verify the API endpoint URL is correct</li>
                      <li>Ensure you have an active internet connection</li>
                      <li>Check if the Kiri Engine service is online</li>
                      <li>Verify your API key has not expired or been revoked</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Key Info */}
        <Card className="mt-4 border border-gray-200/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">API Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <strong>Environment Variable:</strong> <code className="bg-gray-100 px-2 py-1 rounded">VITE_KIRI_ENGINE_API_KEY</code>
              </p>
              <p className="text-gray-600">
                <strong>Configuration File:</strong> <code className="bg-gray-100 px-2 py-1 rounded">.env</code>
              </p>
              <p className="text-gray-600">
                <strong>API Documentation:</strong>{' '}
                <a
                  href="https://docs.kiriengine.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pothole-600 hover:underline"
                >
                  https://docs.kiriengine.app
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KiriEngineTest;
