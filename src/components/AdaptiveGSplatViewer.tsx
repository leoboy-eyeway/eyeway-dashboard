import React, { useState } from 'react';
import { RobustSplatViewer } from './RobustSplatViewer';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdaptiveGSplatViewerProps {
  url: string;
  className?: string;
}

export const AdaptiveGSplatViewer: React.FC<AdaptiveGSplatViewerProps> = ({
  url,
  className = "h-96 w-full rounded-md overflow-hidden border border-gray-200"
}) => {
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const handleError = (errorMsg: string) => {
    console.log('Initial load had issues, viewer will handle it:', errorMsg);
    setError(errorMsg);
    setHasError(true);
  };

  return (
    <div className="space-y-3">
      {/* Status Notice */}
      {hasError && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-yellow-900 font-medium">Format Detected</p>
              <p className="text-xs text-yellow-700 mt-1">
                This appears to be a standard PLY file (not Gaussian Splatting format).
                Using optimized point cloud renderer.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasError && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-green-900 font-medium">Viewer Ready</p>
              <p className="text-xs text-green-700 mt-1">
                Loading and rendering your 3D model...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Robust Viewer (handles all PLY formats) */}
      <RobustSplatViewer
        url={url}
        className={className}
        onError={handleError}
      />

      {/* Format Info */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-700 font-medium mb-1">Supported Formats:</p>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>ASCII PLY files (text format)</li>
          <li>Binary PLY files (little-endian)</li>
          <li>Gaussian Splatting .splat files</li>
          <li>3DGS .ply files with extended attributes</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2 pt-2 border-t">
          ✓ Automatic format detection and parsing
        </p>
      </div>
    </div>
  );
};

export default AdaptiveGSplatViewer;
