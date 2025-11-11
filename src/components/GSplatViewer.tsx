import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GSplatViewerProps {
  url: string;
  className?: string;
}

export const GSplatViewer: React.FC<GSplatViewerProps> = ({
  url,
  className = "h-96 w-full rounded-md overflow-hidden border border-gray-200"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    let mounted = true;

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Dynamically import gsplat
        const GSPLAT = await import('gsplat');

        // Create scene
        const scene = new GSPLAT.Scene();

        // Create camera
        const camera = new GSPLAT.Camera();

        // Create renderer
        const renderer = new GSPLAT.WebGLRenderer(canvas);

        // Create controls
        const controls = new GSPLAT.OrbitControls(camera, renderer.canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        try {
          // Try to load as Gaussian Splatting file
          await GSPLAT.Loader.LoadAsync(url, scene, (progress: number) => {
            console.log(`Loading 3DGS: ${Math.round(progress * 100)}%`);
          });
        } catch (loadError) {
          console.warn('Standard loader failed, trying PLY loader approach:', loadError);

          // If standard loader fails, try fetching and converting manually
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch PLY file: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();

          // Try to load using PLY loader if available
          if (GSPLAT.PLYLoader && typeof GSPLAT.PLYLoader.LoadFromFileData === 'function') {
            const splatData = await GSPLAT.PLYLoader.LoadFromFileData(arrayBuffer);
            scene.addSplat(splatData);
          } else {
            // Create a blob URL and try loading again
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);

            try {
              await GSPLAT.Loader.LoadAsync(blobUrl, scene, (progress: number) => {
                console.log(`Loading 3DGS from blob: ${Math.round(progress * 100)}%`);
              });
              URL.revokeObjectURL(blobUrl);
            } catch (blobError) {
              URL.revokeObjectURL(blobUrl);
              throw new Error('Unable to load PLY file. The file may not be in the correct Gaussian Splatting format.');
            }
          }
        }

        // Store viewer reference
        viewerRef.current = { renderer, scene, camera, controls };

        // Animation loop
        const animate = () => {
          if (!mounted) return;

          controls.update();
          renderer.render(scene, camera);
          animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing GSplat viewer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load 3DGS model');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (viewerRef.current) {
        // Cleanup renderer
        if (viewerRef.current.renderer && typeof viewerRef.current.renderer.dispose === 'function') {
          viewerRef.current.renderer.dispose();
        }
        viewerRef.current = null;
      }
    };
  }, [url]);

  // Handle canvas resize
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const handleResize = () => {
      if (containerRef.current && canvasRef.current && viewerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();

        // Update canvas size
        canvasRef.current.width = width * window.devicePixelRatio;
        canvasRef.current.height = height * window.devicePixelRatio;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        // Update camera aspect ratio if available
        if (viewerRef.current.camera && viewerRef.current.camera.data) {
          viewerRef.current.camera.data.aspect = width / height;
        }

        // Update renderer size if method exists
        if (viewerRef.current.renderer && typeof viewerRef.current.renderer.setSize === 'function') {
          viewerRef.current.renderer.setSize(width, height);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Initial resize
    setTimeout(handleResize, 100);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: loading ? 'none' : 'block' }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-600">Loading 3DGS model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center p-4">
            <p className="text-sm text-red-600 font-medium mb-2">Failed to load model</p>
            <p className="text-xs text-red-500">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Controls Legend */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm p-3 rounded-lg text-xs shadow-lg border">
            <div className="font-medium text-gray-800 mb-1">Gaussian Splatting Viewer</div>
            <div className="text-gray-600 space-y-1">
              <div>• Left click + drag: Rotate</div>
              <div>• Right click + drag: Pan</div>
              <div>• Scroll: Zoom</div>
            </div>
          </div>

          {/* Viewer Badge */}
          <div className="absolute top-2 right-2 bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-medium">
            GSplat
          </div>
        </>
      )}
    </div>
  );
};

export default GSplatViewer;
