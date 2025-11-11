import React, { useState } from 'react';
import { AntimatterSplatViewer } from '@/components/AntimatterSplatViewer';
import { Upload, FileUp, AlertCircle } from 'lucide-react';

const SplatViewerTest = () => {
  const [plyUrl, setPlyUrl] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.ply')) {
        setError('Please upload a .ply file');
        return;
      }

      // Create a blob URL for the uploaded file
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setPlyUrl('');
      setError(null);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plyUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    setFileUrl(null);
    setError(null);
  };

  const viewerUrl = fileUrl || plyUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Antimatter15 Splat Viewer Test
          </h1>
          <p className="text-purple-200">
            Load and view 3D Gaussian Splatting PLY files
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="grid md:grid-cols-2 gap-6">
            {/* URL Input */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <FileUp className="w-5 h-5 mr-2" />
                Load from URL
              </h3>
              <form onSubmit={handleUrlSubmit} className="space-y-3">
                <input
                  type="url"
                  value={plyUrl}
                  onChange={(e) => setPlyUrl(e.target.value)}
                  placeholder="https://example.com/model.ply"
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg"
                >
                  Load Model
                </button>
              </form>
            </div>

            {/* File Upload */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Upload PLY File
              </h3>
              <label className="block">
                <input
                  type="file"
                  accept=".ply"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-full px-4 py-8 rounded-lg bg-white/10 border-2 border-dashed border-white/30 hover:border-purple-500 text-white text-center cursor-pointer transition-all duration-200">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm">Click to upload or drag & drop</p>
                  <p className="text-xs text-white/60 mt-1">.ply files only</p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center text-red-200">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Viewer Section */}
        {viewerUrl && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">3D Viewer</h3>
            <AntimatterSplatViewer
              url={viewerUrl}
              className="h-[600px] w-full rounded-lg overflow-hidden shadow-2xl"
              onError={(err) => setError(err)}
            />
          </div>
        )}

        {/* Info Section */}
        {!viewerUrl && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <h3 className="text-white font-semibold mb-3">How to use:</h3>
            <ul className="text-purple-200 space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Enter a URL to a .ply file hosted online (must support CORS)</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Or upload a .ply file from your local machine</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>The viewer uses the Antimatter15 Gaussian Splatting renderer</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Mouse controls: Left drag to rotate, right drag to pan, scroll to zoom</span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <p className="text-purple-100 text-sm font-medium mb-2">Example Test:</p>
              <p className="text-purple-200 text-xs">
                Place your 3DGS.ply file in the <code className="bg-black/30 px-2 py-1 rounded">public</code> folder,
                then load it using: <code className="bg-black/30 px-2 py-1 rounded">/3DGS.ply</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplatViewerTest;
