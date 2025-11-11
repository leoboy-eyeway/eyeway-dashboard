# Antimatter15 Splat Viewer Integration Guide

## Overview

This project now includes an integrated 3D Gaussian Splatting viewer based on the [antimatter15/splat](https://github.com/antimatter15/splat) implementation. This viewer allows you to display high-quality 3D Gaussian Splatting PLY files directly in your web application.

## What is 3D Gaussian Splatting?

3D Gaussian Splatting is a cutting-edge technique for representing and rendering 3D scenes using Gaussian primitives (splats). Each splat contains:
- **Position** (x, y, z)
- **Spherical Harmonics** (for view-dependent color)
- **Opacity**
- **Scale** (anisotropic)
- **Rotation** (quaternion)

This allows for photorealistic rendering with real-time performance.

## Your 3DGS.ply File Analysis

The file at `/Users/leonhelfortin/Downloads/Kiri Enterprise File/3DGS.ply` contains:
- **Format**: Binary little endian PLY
- **Splat Count**: 626,485 Gaussian splats
- **Properties**: Full 3DGS format with spherical harmonics (45 SH coefficients)
- **Quality**: High-quality reconstruction suitable for photorealistic rendering

## Components

### 1. AntimatterSplatViewer Component

Located at: `src/components/AntimatterSplatViewer.tsx`

**Usage:**
```tsx
import { AntimatterSplatViewer } from '@/components/AntimatterSplatViewer';

<AntimatterSplatViewer
  url="/path/to/model.ply"
  className="h-screen w-full"
  onError={(error) => console.error(error)}
/>
```

**Props:**
- `url` (required): URL or path to the PLY file
- `className` (optional): Tailwind CSS classes for styling
- `onError` (optional): Callback function when an error occurs

**Features:**
- Full WebGL2-based Gaussian Splatting renderer
- Mouse/touch controls (drag to rotate, right-click to pan, scroll to zoom)
- Keyboard navigation support
- Real-time FPS display
- Progress indicator during loading
- Automatic CORS handling

### 2. SplatViewerTest Page

Located at: `src/pages/SplatViewerTest.tsx`

A complete test page with file upload and URL loading capabilities.

**Access it at:** `http://localhost:8080/splat-viewer`

## How to Use with Your 3DGS.ply File

### Option 1: Local File (Recommended for Testing)

1. **Copy the PLY file to the public folder:**
   ```bash
   cp "/Users/leonhelfortin/Downloads/Kiri Enterprise File/3DGS.ply" \
      "/Users/leonhelfortin/Eyeway Dashboard/eyeway-dashboard/public/3DGS.ply"
   ```

2. **Access the test page:**
   ```
   http://localhost:8080/splat-viewer
   ```

3. **Load the model:**
   - Enter `/3DGS.ply` in the URL input
   - Click "Load Model"

### Option 2: File Upload

1. Go to `http://localhost:8080/splat-viewer`
2. Click on the upload area or drag & drop your PLY file
3. The viewer will load automatically

### Option 3: Remote URL

If your PLY file is hosted online:
```tsx
<AntimatterSplatViewer url="https://example.com/model.ply" />
```

**Note:** The server must support CORS for cross-origin requests.

### Option 4: Integrate into Your Dashboard

Example integration in `src/pages/Index.tsx`:

```tsx
import { AntimatterSplatViewer } from '@/components/AntimatterSplatViewer';

// Inside your component:
<div className="w-full h-[600px]">
  <AntimatterSplatViewer
    url="/3DGS.ply"
    className="h-full w-full rounded-lg shadow-xl"
  />
</div>
```

## Viewer Controls

Once loaded, you can interact with the 3D model:

| Action | Control |
|--------|---------|
| **Rotate** | Left mouse drag |
| **Pan** | Right mouse drag |
| **Zoom** | Mouse scroll wheel |
| **Move** | Arrow keys |
| **Reset view** | Refresh page |

## Technical Details

### WebGL2 Rendering Pipeline

The viewer uses a sophisticated WebGL2 pipeline:

1. **Vertex Shader**:
   - Projects 3D Gaussian splats to 2D screen space
   - Computes covariance matrices for ellipse rendering
   - Handles view-dependent transformations

2. **Fragment Shader**:
   - Renders Gaussian kernels using exponential falloff
   - Supports proper alpha blending for transparency

3. **Depth Sorting**:
   - Uses Web Worker for CPU-based sorting
   - Updates at ~4fps while rendering at 60fps

### Performance Optimizations

- **Progressive Loading**: Start interacting before full model loads
- **Instanced Rendering**: Efficiently renders hundreds of thousands of splats
- **Dynamic Downsampling**: Adapts to device pixel ratio
- **Half-precision Textures**: Reduces memory footprint

## Comparison with Other Viewers

| Viewer | Pros | Cons |
|--------|------|------|
| **AntimatterSplatViewer** | Full 3DGS support, no dependencies, well-tested | Simplified SH (performance trade-off) |
| **GSplatViewer** | Uses gsplat library, easy API | Requires npm package |
| **RobustSplatViewer** | Custom parser, robust | Point cloud mode only |

## Troubleshooting

### Common Issues

**1. "WebGL2 not supported" error**
- Update your browser to the latest version
- Check if WebGL is enabled in browser settings

**2. "Failed to fetch file" error**
- Ensure the PLY file path is correct
- Check CORS headers if loading from a different domain
- Verify the file is accessible (check network tab)

**3. Model appears black or empty**
- Check browser console for shader compilation errors
- Verify PLY file is in correct format (use `head -n 100 3DGS.ply`)

**4. Slow loading**
- PLY file might be very large (626K splats is substantial)
- Check network speed
- Consider compressing the file

### Browser Compatibility

- ✅ Chrome 79+
- ✅ Firefox 78+
- ✅ Safari 14.1+
- ✅ Edge 79+

All browsers must support WebGL2.

## File Format Reference

Your 3DGS.ply header structure:
```
ply
format binary_little_endian 1.0
element vertex 626485
property float x, y, z              # Position
property float nx, ny, nz           # Normals
property float f_dc_0..2            # Base color (SH degree 0)
property float f_rest_0..44         # Higher SH degrees
property float opacity              # Transparency
property float scale_0..2           # Anisotropic scale
property float rot_0..3             # Quaternion rotation
end_header
[binary data]
```

## Integration Examples

### Display in Pothole Details
```tsx
// src/pages/Index.tsx or PotholeDetails component
import { AntimatterSplatViewer } from '@/components/AntimatterSplatViewer';

<Card>
  <CardHeader>
    <CardTitle>3D Reconstruction</CardTitle>
  </CardHeader>
  <CardContent>
    <AntimatterSplatViewer
      url={pothole.gsplatUrl}
      className="h-96 w-full rounded-md"
    />
  </CardContent>
</Card>
```

### Display in Gallery View
```tsx
<div className="grid grid-cols-2 gap-4">
  {potholes.map(pothole => (
    <AntimatterSplatViewer
      key={pothole.id}
      url={pothole.gsplatUrl}
      className="h-64 w-full"
    />
  ))}
</div>
```

## Next Steps

1. **Copy your PLY file to the public folder** (see Option 1 above)
2. **Start the dev server**: `npm run dev`
3. **Navigate to**: `http://localhost:8080/splat-viewer`
4. **Test the viewer** with your 3DGS.ply file
5. **Integrate** into your dashboard pages as needed

## Resources

- [Antimatter15 Splat GitHub](https://github.com/antimatter15/splat)
- [3D Gaussian Splatting Paper](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)
- [WebGL2 Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

## Credits

This viewer is based on the excellent work by Kevin Kwok (antimatter15):
- GitHub: [@antimatter15](https://github.com/antimatter15)
- Original viewer: [antimatter15.com/splat](https://antimatter15.com/splat/)

## License

The antimatter15/splat viewer is under MIT License. See the original repository for details.
