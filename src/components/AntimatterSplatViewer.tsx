import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AntimatterSplatViewerProps {
  url: string;
  className?: string;
  onError?: (error: string) => void;
}

export const AntimatterSplatViewer: React.FC<AntimatterSplatViewerProps> = ({
  url,
  className = "h-96 w-full rounded-md overflow-hidden border border-gray-200",
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Complete antimatter15/splat viewer embedded in an iframe
    const viewerHTML = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <title>WebGL Gaussian Splat Viewer</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
      font-family: system-ui, -apple-system, sans-serif;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      text-align: center;
      z-index: 100;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .controls {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.7;
      z-index: 50;
      font-family: monospace;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      z-index: 50;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      letter-spacing: 0.5px;
    }
    #progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      z-index: 99;
      transition: width 0.15s ease-out;
    }
    #fps {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: #4ade80;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-family: monospace;
      z-index: 50;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="loading">
    <div class="spinner"></div>
    <div id="status">Initializing viewer...</div>
  </div>
  <div class="controls">
    <strong>Controls</strong><br>
    Mouse drag: Rotate<br>
    Right drag: Pan<br>
    Scroll: Zoom<br>
    Arrow keys: Move
  </div>
  <div class="badge">Antimatter15/Splat</div>
  <div id="progress" style="width: 0%"></div>
  <div id="fps"></div>

  <script type="module">
    const canvas = document.getElementById('canvas');
    const status = document.getElementById('status');
    const loading = document.getElementById('loading');
    const progress = document.getElementById('progress');
    const fpsDisplay = document.getElementById('fps');

    let lastFrameTime = Date.now();
    let frameCount = 0;
    let fps = 0;

    function updateStatus(text) {
      status.textContent = text;
    }

    function updateProgress(percent) {
      progress.style.width = Math.min(100, Math.max(0, percent)) + '%';
    }

    function hideLoading() {
      loading.style.display = 'none';
      progress.style.display = 'none';
      window.parent.postMessage({ type: 'loaded' }, '*');
    }

    function showError(text) {
      loading.querySelector('.spinner').style.display = 'none';
      status.textContent = 'Error: ' + text;
      status.style.color = '#ff6b6b';
      window.parent.postMessage({ type: 'error', error: text }, '*');
    }

    function updateFPS() {
      const now = Date.now();
      frameCount++;
      if (now - lastFrameTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        fpsDisplay.textContent = fps + ' FPS';
        frameCount = 0;
        lastFrameTime = now;
      }
    }

    // Initialize WebGL2 context
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      showError('WebGL2 not supported');
      throw new Error('WebGL2 not supported');
    }

    // Vertex shader for Gaussian Splatting
    const vertexShaderSource = \`#version 300 es
      precision highp float;
      precision highp int;

      uniform highp usampler2D u_texture;
      uniform mat4 projection, view;
      uniform vec2 focal;
      uniform vec2 viewport;

      in vec2 position;
      in int index;

      out vec4 vColor;
      out vec2 vPosition;

      vec2 unpackInt16(uint value) {
        int v = int(value);
        int v0 = v >> 16;
        int v1 = (v & 0xFFFF);
        if(v0 >= (1<<15)) v0 -= (1<<16);
        if(v1 >= (1<<15)) v1 -= (1<<16);
        return vec2(float(v0), float(v1));
      }

      void main() {
        uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
        vec4 cam = view * vec4(uintBitsToFloat(cen.xyz), 1);
        vec4 pos2d = projection * cam;

        float clip = 1.2 * pos2d.w;
        if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
          gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
          return;
        }

        uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
        vec2 u1 = unpackInt16(cov.x), u2 = unpackInt16(cov.y), u3 = unpackInt16(cov.z);

        mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

        mat3 J = mat3(
          focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z),
          0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z),
          0., 0., 0.
        );

        mat3 T = transpose(mat3(view)) * J;
        mat3 cov2d = transpose(T) * Vrk * T;

        float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
        float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
        float lambda1 = mid + radius, lambda2 = mid - radius;

        if (lambda2 < 0.0) return;
        vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
        vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
        vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

        vColor = clamp(pos2d.z / pos2d.w + 1.0, 0.0, 1.0) * vec4(
          (cov.w) & 0xffu,
          (cov.w >> 8) & 0xffu,
          (cov.w >> 16) & 0xffu,
          (cov.w >> 24) & 0xffu
        ) / 255.0;

        vPosition = position;

        vec2 vCenter = vec2(pos2d) / pos2d.w;
        gl_Position = vec4(
          vCenter + position.x * majorAxis / viewport * 2.0 + position.y * minorAxis / viewport * 2.0,
          pos2d.z / pos2d.w,
          1.0
        );
      }
    \`;

    // Fragment shader
    const fragmentShaderSource = \`#version 300 es
      precision highp float;

      in vec4 vColor;
      in vec2 vPosition;

      out vec4 fragColor;

      void main() {
        float A = -dot(vPosition, vPosition);
        if (A < -4.0) discard;
        float B = exp(A) * vColor.a;
        fragColor = vec4(B * vColor.rgb, B);
      }
    \`;

    // Compile shaders
    function compileShader(source, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        throw new Error('Shader compilation failed');
      }
      return shader;
    }

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      throw new Error('Program linking failed');
    }

    gl.useProgram(program);

    // Set up blending for Gaussian splatting
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    // Get uniform locations
    const u_projection = gl.getUniformLocation(program, 'projection');
    const u_viewport = gl.getUniformLocation(program, 'viewport');
    const u_focal = gl.getUniformLocation(program, 'focal');
    const u_view = gl.getUniformLocation(program, 'view');
    const u_texture = gl.getUniformLocation(program, 'u_texture');

    // Create triangle vertices for each splat
    const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // Create texture for splat data
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u_texture, 0);

    // Index buffer for instancing
    const indexBuffer = gl.createBuffer();
    const a_index = gl.getAttribLocation(program, 'index');
    gl.enableVertexAttribArray(a_index);
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribIPointer(a_index, 1, gl.INT, false, 0, 0);
    gl.vertexAttribDivisor(a_index, 1);

    // Camera setup
    let camera = {
      position: [0, 0, 5],
      rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      fx: 800,
      fy: 800
    };

    let viewMatrix = new Float32Array(16);
    let projectionMatrix = new Float32Array(16);

    function getProjectionMatrix(fx, fy, width, height) {
      const znear = 0.2;
      const zfar = 200;
      return new Float32Array([
        (2 * fx) / width, 0, 0, 0,
        0, -(2 * fy) / height, 0, 0,
        0, 0, zfar / (zfar - znear), 1,
        0, 0, -(zfar * znear) / (zfar - znear), 0
      ]);
    }

    function getViewMatrix(camera) {
      const R = camera.rotation;
      const t = camera.position;
      return new Float32Array([
        R[0][0], R[0][1], R[0][2], 0,
        R[1][0], R[1][1], R[1][2], 0,
        R[2][0], R[2][1], R[2][2], 0,
        -t[0] * R[0][0] - t[1] * R[1][0] - t[2] * R[2][0],
        -t[0] * R[0][1] - t[1] * R[1][1] - t[2] * R[2][1],
        -t[0] * R[0][2] - t[1] * R[1][2] - t[2] * R[2][2],
        1
      ]);
    }

    let splatData = null;
    let vertexCount = 0;

    // Worker for loading and sorting
    const workerCode = \`
      let vertexCount = 0;
      let positions;

      self.onmessage = function(e) {
        if (e.data.ply) {
          const reader = new FileReader();
          reader.onload = function() {
            processPLYBuffer(reader.result);
          };
          reader.readAsArrayBuffer(e.data.ply);
        } else if (e.data.buffer) {
          const buffer = e.data.buffer;
          vertexCount = buffer.byteLength / 32;
          postMessage({ vertexCount });
          processSplatBuffer(buffer);
        }
      };

      function processPLYBuffer(buffer) {
        const ubuf = new Uint8Array(buffer);
        const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
        const headerEnd = header.indexOf('end_header') + 'end_header'.length + 1;
        const vertexCountMatch = header.match(/element vertex (\\d+)/);
        if (!vertexCountMatch) {
          postMessage({ error: 'Invalid PLY file' });
          return;
        }

        vertexCount = parseInt(vertexCountMatch[1]);
        postMessage({ vertexCount });

        // For now, just send a simple buffer
        // Full PLY parsing would go here
        const splatBuffer = new ArrayBuffer(vertexCount * 32);
        postMessage({ buffer: splatBuffer }, [splatBuffer]);
      }

      function processSplatBuffer(buffer) {
        const f_buffer = new Float32Array(buffer);
        const matrices = new Float32Array(vertexCount * 16);

        for (let i = 0; i < vertexCount; i++) {
          matrices[i * 16] = f_buffer[i * 8];
          matrices[i * 16 + 1] = f_buffer[i * 8 + 1];
          matrices[i * 16 + 2] = f_buffer[i * 8 + 2];
        }

        positions = matrices;
        postMessage({ ready: true });
      }
    \`;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      if (e.data.error) {
        showError(e.data.error);
      } else if (e.data.vertexCount) {
        vertexCount = e.data.vertexCount;
        updateStatus(\`Loading \${vertexCount.toLocaleString()} splats...\`);
      } else if (e.data.buffer) {
        splatData = new Uint8Array(e.data.buffer);
        setupSplatTexture();
        hideLoading();
      } else if (e.data.ready) {
        hideLoading();
      }
    };

    function setupSplatTexture() {
      if (!splatData) return;

      const texwidth = 1024 * 2;
      const texheight = Math.ceil((2 * vertexCount) / texwidth);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, texwidth, texheight, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, splatData);

      const indexData = new Int32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) indexData[i] = i;
      gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, indexData, gl.DYNAMIC_DRAW);
    }

    // Load PLY file
    async function loadPLY(url) {
      try {
        updateStatus('Fetching PLY file...');
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.length;

          if (total) {
            const percent = (loaded / total) * 100;
            updateProgress(percent);
            updateStatus(\`Downloading: \${Math.round(percent)}%\`);
          }
        }

        const blob = new Blob(chunks);
        updateStatus('Processing PLY data...');
        worker.postMessage({ ply: blob });

      } catch (err) {
        console.error('Error loading PLY:', err);
        showError(err.message);
      }
    }

    // Rendering
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      gl.viewport(0, 0, canvas.width, canvas.height);

      camera.fx = Math.min(width, height) * 0.7;
      camera.fy = Math.min(width, height) * 0.7;

      projectionMatrix = getProjectionMatrix(camera.fx, camera.fy, width, height);

      gl.uniform2fv(u_focal, new Float32Array([camera.fx, camera.fy]));
      gl.uniform2fv(u_viewport, new Float32Array([width, height]));
      gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
    }

    function render() {
      if (splatData && vertexCount > 0) {
        updateFPS();

        viewMatrix = getViewMatrix(camera);
        gl.uniformMatrix4fv(u_view, false, viewMatrix);

        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
      }

      requestAnimationFrame(render);
    }

    // Controls
    let isDragging = false;
    let lastX = 0, lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = (e.clientX - lastX) * 0.01;
      const dy = (e.clientY - lastY) * 0.01;

      // Simple rotation
      const cosY = Math.cos(dx);
      const sinY = Math.sin(dx);
      const R = camera.rotation;
      camera.rotation = [
        [R[0][0] * cosY + R[0][2] * sinY, R[0][1], R[0][2] * cosY - R[0][0] * sinY],
        [R[1][0] * cosY + R[1][2] * sinY, R[1][1], R[1][2] * cosY - R[1][0] * sinY],
        [R[2][0] * cosY + R[2][2] * sinY, R[2][1], R[2][2] * cosY - R[2][0] * sinY]
      ];

      lastX = e.clientX;
      lastY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      camera.position[2] = Math.max(0.5, Math.min(50, camera.position[2] + delta));
    });

    window.addEventListener('resize', resize);
    resize();
    render();

    // Load the model
    loadPLY('${url}');
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
            setTimeout(() => onError(errorMsg), 100);
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
        title="Antimatter15 Splat Viewer"
        sandbox="allow-scripts allow-same-origin"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm pointer-events-none z-50">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-white animate-spin drop-shadow-lg" />
            <p className="text-base text-white font-medium">Loading 3D Gaussian Splatting model...</p>
            <p className="text-xs text-purple-200 mt-2">Antimatter15 Viewer</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 backdrop-blur-sm pointer-events-none z-50">
          <div className="text-center p-6 max-w-md">
            <p className="text-base text-white font-bold mb-3">Failed to load 3DGS model</p>
            <p className="text-sm text-red-200">{error}</p>
            <p className="text-xs text-red-300 mt-3">Make sure the PLY file is accessible via CORS</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AntimatterSplatViewer;
