import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

interface PLY3DGSViewerProps {
  url?: string;
  className?: string;
}

// PLY Model Loader Component for 3DGS
const PLY3DGSModel = ({ url }: { url?: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current && !url) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const loader = new PLYLoader();

    loader.load(
      url,
      (geometry) => {
        setGeometry(geometry);
        setLoading(false);
        setError(null);

        // Center and scale the geometry
        geometry.computeBoundingBox();
        if (geometry.boundingBox) {
          const center = new THREE.Vector3();
          geometry.boundingBox.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);

          // Scale to fit in view
          const size = new THREE.Vector3();
          geometry.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.0 / maxDim; // Slightly larger scale for 3DGS models
          geometry.scale(scale, scale, scale);
        }

        geometry.computeVertexNormals();
      },
      (progress) => {
        console.log('Loading 3DGS PLY:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading 3DGS PLY:', error);
        setError('Failed to load 3DGS PLY file');
        setLoading(false);
      }
    );

    return () => {
      if (geometry) {
        geometry.dispose();
      }
    };
  }, [url]);

  if (loading) {
    return (
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#10b981" wireframe />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#059669" wireframe />
        </mesh>
      </group>
    );
  }

  if (error || !geometry) {
    return (
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    );
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial
        color="#10b981"
        shininess={30}
        specular="#ffffff"
        transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
};

// 3DGS Scene Component
const PLY3DGSScene = ({ url }: { url?: string }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      {/* Enhanced grid for 3DGS */}
      <gridHelper
        args={[4, 20]}
        position={[0, -1, 0]}
        material-color="#e5e7eb"
        material-opacity={0.5}
      />

      <PLY3DGSModel url={url} />

      <OrbitControls
        enableDamping
        dampingFactor={0.15}
        rotateSpeed={0.5}
        panSpeed={0.8}
        maxPolarAngle={Math.PI / 1.5}
        minDistance={0.5}
        maxDistance={10}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </>
  );
};

export const PLY3DGSViewer: React.FC<PLY3DGSViewerProps> = ({
  url,
  className = "h-80 w-full rounded-md overflow-hidden border border-gray-200 bg-gray-50"
}) => {
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        <PerspectiveCamera makeDefault position={[3, 2, 3]} />
        <PLY3DGSScene url={url} />
      </Canvas>

      {/* 3DGS Controls Legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm p-3 rounded-lg text-xs shadow-lg border">
        <div className="font-medium text-gray-800 mb-1">3D Gaussian Splatting</div>
        <div className="text-gray-600 space-y-1">
          <div>• Left click + drag: Rotate</div>
          <div>• Right click + drag: Pan</div>
          <div>• Scroll: Zoom</div>
          {url ? (
            <div className="text-green-600 font-medium mt-2">✓ Model loaded successfully</div>
          ) : (
            <div className="text-gray-500 mt-2">No PLY file provided</div>
          )}
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        3DGS Viewer
      </div>
    </div>
  );
};

export default PLY3DGSViewer;











