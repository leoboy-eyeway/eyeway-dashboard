import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RobustSplatViewerProps {
  url: string;
  className?: string;
  onError?: (error: string) => void;
}

export const RobustSplatViewer: React.FC<RobustSplatViewerProps> = ({
  url,
  className = "h-96 w-full rounded-md overflow-hidden border border-gray-200",
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Advanced Gaussian Splatting Viewer with Robust PLY Parser
    const viewerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gaussian Splat Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: white; font-family: Arial, sans-serif; text-align: center; z-index: 10;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white;
      border-radius: 50%; width: 40px; height: 40px;
      animation: spin 1s linear infinite; margin: 0 auto 15px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .controls {
      position: absolute; bottom: 10px; left: 10px;
      background: rgba(0,0,0,0.8); color: white; padding: 8px 12px;
      border-radius: 6px; font-size: 11px; line-height: 1.6; z-index: 10;
    }
    .badge {
      position: absolute; top: 10px; right: 10px;
      background: rgba(34, 197, 94, 0.9); color: white;
      padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="loading">
    <div class="spinner"></div>
    <div id="status">Initializing...</div>
  </div>
  <div class="controls">
    <strong>Controls</strong><br>
    Left drag: Rotate<br>
    Right drag: Pan<br>
    Scroll: Zoom
  </div>
  <div class="badge">3DGS Viewer</div>

  <script type="module">
    const canvas = document.getElementById('canvas');
    const status = document.getElementById('status');
    const loading = document.getElementById('loading');

    function updateStatus(text) {
      status.textContent = text;
    }

    function hideLoading() {
      loading.style.display = 'none';
      window.parent.postMessage({ type: 'loaded' }, '*');
    }

    function showError(text) {
      loading.querySelector('.spinner').style.display = 'none';
      status.textContent = 'Error: ' + text;
      status.style.color = '#ff6b6b';
      window.parent.postMessage({ type: 'error', error: text }, '*');
    }

    // Robust PLY Parser (handles ASCII and Binary formats)
    class PLYParser {
      static async parse(arrayBuffer) {
        const text = new TextDecoder().decode(arrayBuffer.slice(0, 5000));

        // Check if binary or ASCII
        const isBinary = text.includes('format binary');
        const isASCII = text.includes('format ascii');

        if (!isBinary && !isASCII) {
          throw new Error('Invalid PLY format: missing format specification');
        }

        // Parse header
        const headerEnd = text.indexOf('end_header');
        if (headerEnd === -1) throw new Error('Invalid PLY: no end_header found');

        const headerText = text.substring(0, headerEnd);
        const headerEndByte = new TextEncoder().encode(text.substring(0, headerEnd + 10)).length;

        // Extract vertex count
        const vertexMatch = headerText.match(/element vertex (\\d+)/);
        if (!vertexMatch) throw new Error('No vertex count in PLY header');
        const vertexCount = parseInt(vertexMatch[1]);

        // Extract properties
        const properties = [];
        const propLines = headerText.split('\\n').filter(l => l.startsWith('property'));
        for (const line of propLines) {
          const parts = line.split(/\\s+/);
          properties.push({ type: parts[1], name: parts[2] });
        }

        console.log('PLY Format:', isBinary ? 'Binary' : 'ASCII');
        console.log('Vertex Count:', vertexCount);
        console.log('Properties:', properties);

        let vertices;
        if (isASCII) {
          vertices = this.parseASCII(arrayBuffer, headerEndByte, vertexCount, properties);
        } else {
          vertices = this.parseBinary(arrayBuffer, headerEndByte, vertexCount, properties);
        }

        return { vertices, vertexCount, properties };
      }

      static parseASCII(arrayBuffer, headerEndByte, vertexCount, properties) {
        const text = new TextDecoder().decode(arrayBuffer);
        const dataStart = text.indexOf('end_header') + 'end_header'.length;
        const dataText = text.substring(dataStart).trim();
        const lines = dataText.split('\\n').filter(l => l.trim());

        const vertices = [];
        for (let i = 0; i < Math.min(vertexCount, lines.length); i++) {
          const values = lines[i].trim().split(/\\s+/).map(parseFloat);
          vertices.push({
            x: values[0] || 0,
            y: values[1] || 0,
            z: values[2] || 0,
            r: values[3] !== undefined ? values[3] / 255 : 1,
            g: values[4] !== undefined ? values[4] / 255 : 1,
            b: values[5] !== undefined ? values[5] / 255 : 1,
          });
        }
        return vertices;
      }

      static parseBinary(arrayBuffer, headerEndByte, vertexCount, properties) {
        const dataView = new DataView(arrayBuffer, headerEndByte);
        const vertices = [];

        // Calculate stride (bytes per vertex)
        let stride = 0;
        for (const prop of properties) {
          if (prop.type === 'float') stride += 4;
          else if (prop.type === 'uchar') stride += 1;
          else if (prop.type === 'int' || prop.type === 'uint') stride += 4;
          else if (prop.type === 'double') stride += 8;
        }

        console.log('Stride:', stride, 'bytes per vertex');
        console.log('Properties:', properties);

        // Check if buffer is large enough
        const expectedSize = vertexCount * stride;
        const actualSize = arrayBuffer.byteLength - headerEndByte;

        if (actualSize < expectedSize) {
          console.warn(\`Buffer size mismatch: expected \${expectedSize}, got \${actualSize}\`);
          vertexCount = Math.floor(actualSize / stride);
        }

        console.log('Reading', vertexCount, 'vertices...');

        // Sample for debugging
        let sampleVertex = null;

        for (let i = 0; i < vertexCount; i++) {
          const offset = i * stride;
          let byteOffset = 0;

          const vertex = { x: 0, y: 0, z: 0, r: 0.5, g: 0.5, b: 0.5 };

          for (let j = 0; j < properties.length; j++) {
            const prop = properties[j];
            let value;

            try {
              if (prop.type === 'float') {
                value = dataView.getFloat32(offset + byteOffset, true);
                byteOffset += 4;
              } else if (prop.type === 'uchar') {
                value = dataView.getUint8(offset + byteOffset);
                byteOffset += 1;
              } else if (prop.type === 'int') {
                value = dataView.getInt32(offset + byteOffset, true);
                byteOffset += 4;
              } else if (prop.type === 'uint') {
                value = dataView.getUint32(offset + byteOffset, true);
                byteOffset += 4;
              } else if (prop.type === 'double') {
                value = dataView.getFloat64(offset + byteOffset, true);
                byteOffset += 8;
              }

              // Map to vertex properties
              const name = prop.name.toLowerCase();
              if (name === 'x') vertex.x = value;
              else if (name === 'y') vertex.y = value;
              else if (name === 'z') vertex.z = value;
              else if (name === 'red' || name === 'r' || name === 'diffuse_red') {
                vertex.r = prop.type === 'uchar' ? value / 255 : value;
              }
              else if (name === 'green' || name === 'g' || name === 'diffuse_green') {
                vertex.g = prop.type === 'uchar' ? value / 255 : value;
              }
              else if (name === 'blue' || name === 'b' || name === 'diffuse_blue') {
                vertex.b = prop.type === 'uchar' ? value / 255 : value;
              }
            } catch (e) {
              console.error(\`Error reading property \${prop.name} at vertex \${i}:\`, e);
              break;
            }
          }

          // Save first vertex for debugging
          if (i === 0) {
            sampleVertex = vertex;
          }

          vertices.push(vertex);
        }

        console.log('Sample vertex:', sampleVertex);
        console.log('Parsed', vertices.length, 'vertices');

        return vertices;
      }
    }

    // Simple WebGL Point Renderer
    class PointCloudRenderer {
      constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', {
          antialias: true,
          alpha: false,
          depth: true,
          powerPreference: 'high-performance'
        });

        if (!this.gl) throw new Error('WebGL 2 not supported');

        this.camera = {
          position: [0, 0, 3],
          rotation: [0, 0],
          zoom: 1
        };

        this.setupShaders();
        this.setupControls();
        this.resize();
      }

      setupShaders() {
        const gl = this.gl;

        const vertexShaderSource = \`#version 300 es
          in vec3 position;
          in vec3 color;
          out vec3 vColor;
          uniform mat4 uProjection;
          uniform mat4 uView;
          uniform float uPointSize;

          void main() {
            vColor = color;
            gl_Position = uProjection * uView * vec4(position, 1.0);
            gl_PointSize = uPointSize;
          }
        \`;

        const fragmentShaderSource = \`#version 300 es
          precision highp float;
          in vec3 vColor;
          out vec4 fragColor;

          void main() {
            // Make points circular
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) discard;
            fragColor = vec4(vColor, 1.0);
          }
        \`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
          console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
          throw new Error('Vertex shader compilation failed');
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
          console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
          throw new Error('Fragment shader compilation failed');
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          console.error('Program link error:', gl.getProgramInfoLog(this.program));
          throw new Error('Program linking failed');
        }

        this.locations = {
          position: gl.getAttribLocation(this.program, 'position'),
          color: gl.getAttribLocation(this.program, 'color'),
          projection: gl.getUniformLocation(this.program, 'uProjection'),
          view: gl.getUniformLocation(this.program, 'uView'),
          pointSize: gl.getUniformLocation(this.program, 'uPointSize')
        };

        console.log('Shader locations:', this.locations);
      }

      loadData(vertices) {
        const gl = this.gl;
        const positions = [];
        const colors = [];

        console.log('Loading', vertices.length, 'vertices into GPU...');

        for (const v of vertices) {
          positions.push(v.x, v.y, v.z);
          colors.push(v.r, v.g, v.b);
        }

        console.log('Position data length:', positions.length);
        console.log('Color data length:', colors.length);

        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Color buffer
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.vertexCount = vertices.length;

        console.log('Vertex count set to:', this.vertexCount);

        // Center and scale
        this.centerAndScale(vertices);
      }

      centerAndScale(vertices) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const v of vertices) {
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
          minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
        }

        this.center = [
          (minX + maxX) / 2,
          (minY + maxY) / 2,
          (minZ + maxZ) / 2
        ];

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const size = Math.max(sizeX, sizeY, sizeZ);
        this.scale = 2 / size;

        console.log('Model bounds:', {
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ],
          size: [sizeX, sizeY, sizeZ],
          center: this.center,
          scale: this.scale
        });
      }

      setupControls() {
        let dragging = false;
        let lastX = 0, lastY = 0;
        let button = 0;

        this.canvas.addEventListener('mousedown', (e) => {
          dragging = true;
          button = e.button;
          lastX = e.clientX;
          lastY = e.clientY;
          e.preventDefault();
        });

        this.canvas.addEventListener('mousemove', (e) => {
          if (!dragging) return;

          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;

          if (button === 0) {
            this.camera.rotation[1] += dx * 0.01;
            this.camera.rotation[0] += dy * 0.01;
            this.camera.rotation[0] = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation[0]));
          } else if (button === 2) {
            this.camera.position[0] -= dx * 0.005;
            this.camera.position[1] += dy * 0.005;
          }

          lastX = e.clientX;
          lastY = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => { dragging = false; });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
          this.camera.zoom *= e.deltaY > 0 ? 1.1 : 0.9;
          this.camera.zoom = Math.max(0.1, Math.min(10, this.camera.zoom));
          e.preventDefault();
        });
      }

      render() {
        const gl = this.gl;

        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;

        // Check for WebGL errors from previous frame
        let error = gl.getError();
        if (error !== gl.NO_ERROR) {
          console.error('WebGL error before render:', error);
        }

        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(this.program);

        // Set up projection matrix
        const aspect = this.canvas.width / this.canvas.height;
        const fov = 60 * Math.PI / 180;
        const near = 0.1, far = 100;
        const f = 1 / Math.tan(fov / 2);
        const projection = new Float32Array([
          f / aspect, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (far + near) / (near - far), -1,
          0, 0, (2 * far * near) / (near - far), 0
        ]);

        // Set up view matrix
        const view = this.getViewMatrix();

        gl.uniformMatrix4fv(this.locations.projection, false, projection);
        gl.uniformMatrix4fv(this.locations.view, false, view);

        // Set point size (larger for better visibility)
        const pointSize = Math.max(3.0, 10.0 / this.camera.zoom);
        gl.uniform1f(this.locations.pointSize, pointSize);

        // Draw points
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.locations.color);
        gl.vertexAttribPointer(this.locations.color, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, this.vertexCount);

        // Check for errors after draw
        error = gl.getError();
        if (error !== gl.NO_ERROR) {
          console.error('WebGL draw error:', error);
        }

        // Debug first frame
        if (this.frameCount === 1) {
          console.log('First frame rendered!');
          console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
          console.log('Aspect:', aspect);
          console.log('Vertex count:', this.vertexCount);
          console.log('Point size:', pointSize);
          console.log('Camera:', this.camera);
        }

        requestAnimationFrame(() => this.render());
      }

      getViewMatrix() {
        // Simple lookAt-style view matrix
        const rx = this.camera.rotation[0];
        const ry = this.camera.rotation[1];
        const zoom = this.camera.zoom;

        // Camera distance from origin
        const distance = 5 / zoom;

        // Calculate camera position based on rotation
        const camX = distance * Math.sin(ry) * Math.cos(rx);
        const camY = distance * Math.sin(rx);
        const camZ = distance * Math.cos(ry) * Math.cos(rx);

        // Translation from panning
        const panX = this.camera.position[0];
        const panY = this.camera.position[1];

        // Build view matrix manually
        // This is a simplified lookAt matrix looking at origin
        const view = new Float32Array(16);

        // For now, use a simple approach: translate and rotate
        const cosX = Math.cos(-rx);
        const sinX = Math.sin(-rx);
        const cosY = Math.cos(-ry);
        const sinY = Math.sin(-ry);

        // Rotation part (inverse of camera rotation)
        view[0] = cosY;
        view[1] = 0;
        view[2] = -sinY;
        view[3] = 0;

        view[4] = sinX * sinY;
        view[5] = cosX;
        view[6] = sinX * cosY;
        view[7] = 0;

        view[8] = cosX * sinY;
        view[9] = -sinX;
        view[10] = cosX * cosY;
        view[11] = 0;

        // Translation part (move camera back and apply pan)
        view[12] = (-panX - this.center[0]) * this.scale;
        view[13] = (-panY - this.center[1]) * this.scale;
        view[14] = -distance - this.center[2] * this.scale;
        view[15] = 1;

        return view;
      }

      resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Main initialization
    async function main() {
      try {
        updateStatus('Fetching PLY file...');
        const response = await fetch('${url}');
        if (!response.ok) throw new Error('Failed to fetch file');

        updateStatus('Downloading...');
        const arrayBuffer = await response.arrayBuffer();

        updateStatus('Parsing PLY data...');
        const { vertices, vertexCount } = await PLYParser.parse(arrayBuffer);

        updateStatus(\`Rendering \${vertexCount} points...\`);
        const renderer = new PointCloudRenderer(canvas);
        console.log('Renderer created');

        renderer.loadData(vertices);
        console.log('Data loaded into renderer');

        hideLoading();
        console.log('Starting render loop...');
        renderer.render();

        window.addEventListener('resize', () => renderer.resize());

      } catch (err) {
        console.error('Error:', err);
        showError(err.message);
      }
    }

    main();
  </script>
</body>
</html>
    `;

    if (iframeRef.current) {
      const blob = new Blob([viewerHTML], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      iframeRef.current.src = blobUrl;

      const cleanup = () => URL.revokeObjectURL(blobUrl);
      iframeRef.current.addEventListener('load', cleanup, { once: true });

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'loaded') {
          setLoading(false);
          setError(null);
        } else if (event.data.type === 'error') {
          const errorMsg = event.data.error || 'Failed to load model';
          setLoading(false);
          setError(errorMsg);
          if (onError) {
            setTimeout(() => onError(errorMsg), 1000);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
        cleanup();
      };
    }
  }, [url, onError]);

  return (
    <div className={`relative ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="3D Viewer"
        sandbox="allow-scripts allow-same-origin"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 pointer-events-none">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-white animate-spin" />
            <p className="text-sm text-white">Loading model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 pointer-events-none">
          <div className="text-center p-4">
            <p className="text-sm text-white font-medium mb-2">Failed to load</p>
            <p className="text-xs text-red-200">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobustSplatViewer;
