import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GSplatViewerIframeProps {
  url: string;
  className?: string;
  onError?: (error: string) => void;
}

export const GSplatViewerIframe: React.FC<GSplatViewerIframeProps> = ({
  url,
  className = "h-96 w-full rounded-md overflow-hidden border border-gray-200",
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create HTML content for the iframe with embedded Gaussian Splatting viewer
    const viewerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3DGS Viewer</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #1a1a1a;
    }
    #canvas {
      width: 100%;
      height: 100vh;
      display: block;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    }
    #error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6b6b;
      font-family: Arial, sans-serif;
      text-align: center;
      display: none;
    }
    .controls {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(255,255,255,0.9);
      padding: 10px;
      border-radius: 8px;
      font-size: 12px;
      color: #333;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="loading">Loading 3DGS model...</div>
  <div id="error">Failed to load model</div>
  <div class="controls">
    <strong>Controls:</strong><br>
    Left drag: Rotate<br>
    Right drag: Pan<br>
    Scroll: Zoom
  </div>

  <script type="module">
    try {
      const SPLAT = await import('https://cdn.jsdelivr.net/npm/gsplat@1.2.9/+esm');

      const canvas = document.getElementById('canvas');
      const loading = document.getElementById('loading');
      const errorDiv = document.getElementById('error');

      const scene = new SPLAT.Scene();
      const camera = new SPLAT.Camera();
      const renderer = new SPLAT.WebGLRenderer(canvas);
      const controls = new SPLAT.OrbitControls(camera, canvas);

      // Smooth controls
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.5;
      controls.panSpeed = 0.8;
      controls.zoomSpeed = 1.2;

      // Notify parent that we're starting
      window.parent.postMessage({ type: 'loading' }, '*');

      // Load the file
      await SPLAT.Loader.LoadAsync('${url}', scene, (progress) => {
        loading.textContent = 'Loading: ' + Math.round(progress * 100) + '%';
      });

      loading.style.display = 'none';
      window.parent.postMessage({ type: 'loaded' }, '*');

      // Smooth animation loop with delta time
      let lastTime = performance.now();
      const frame = (currentTime) => {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);

      // Handle resize
      const resize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.data.aspect = width / height;
        renderer.setSize(width, height);
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
      };
      window.addEventListener('resize', resize);
      resize();

    } catch (err) {
      console.error('Error loading 3DGS:', err);
      const loading = document.getElementById('loading');
      const errorDiv = document.getElementById('error');
      loading.style.display = 'none';
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Failed to load model: ' + err.message;
      window.parent.postMessage({ type: 'error', error: err.message }, '*');
    }
  </script>
</body>
</html>
    `;

    if (iframeRef.current) {
      const blob = new Blob([viewerHTML], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      iframeRef.current.src = blobUrl;

      // Cleanup blob URL after iframe loads
      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
      };
      iframeRef.current.addEventListener('load', cleanup, { once: true });

      // Listen for messages from iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'loaded') {
          setLoading(false);
          setError(null);
        } else if (event.data.type === 'error') {
          const errorMsg = event.data.error || 'Failed to load model';
          setLoading(false);
          setError(errorMsg);
          // Notify parent component about the error
          if (onError) {
            setTimeout(() => onError(errorMsg), 1000); // Small delay to show error state
          }
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
        cleanup();
      };
    }
  }, [url]);

  return (
    <div className={`relative ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="3DGS Viewer"
        sandbox="allow-scripts allow-same-origin"
        allow="cross-origin-isolated"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 pointer-events-none">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-white animate-spin" />
            <p className="text-sm text-white">Loading 3DGS model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 pointer-events-none">
          <div className="text-center p-4">
            <p className="text-sm text-white font-medium mb-2">Failed to load model</p>
            <p className="text-xs text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Viewer Badge */}
      <div className="absolute top-2 right-2 bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-medium pointer-events-none">
        GSplat Viewer
      </div>
    </div>
  );
};

export default GSplatViewerIframe;
