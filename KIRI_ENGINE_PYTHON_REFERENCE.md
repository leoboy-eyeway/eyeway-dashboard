# Kiri Engine Python Scripts Reference

This document contains the original Python scripts that demonstrate the Kiri Engine API workflow. These have been implemented in TypeScript in our application.

## Overview

The Kiri Engine API workflow consists of three main steps:

1. **Upload** - Upload video/images to Kiri Engine for 3D processing
2. **Poll Status** - Check processing status until complete
3. **Download** - Download the processed 3D model

---

## 1. Upload Script (`upload_video.py`)

Uploads a video file to Kiri Engine for 3D Gaussian Splatting processing.

```python
import requests

API_KEY = "kiri_bcRJgkwX5O8_qHEV-hi_DMZ83XNCeJ9bRDF2vmbajnE"  # <-- put your real key
VIDEO_FILE = "pothole.mp4"

print(f"Uploading file: {VIDEO_FILE}")

url = "https://api.kiriengine.app/api/v1/open/3dgs/video"
headers = {"Authorization": f"Bearer {API_KEY}"}
forms = {
    "isMesh": "0",   # 0 = no mesh, 1 = also convert 3DGS to mesh (PLY/OBJ/etc.)
    "isMask": "0"    # 0 = no auto masking, 1 = auto masking
}
files = {"videoFile": open(VIDEO_FILE, "rb")}

resp = requests.post(url, headers=headers, data=forms, files=files)
resp.raise_for_status()
data = resp.json()

print("Response:", data)

if data.get("ok"):
    serialize = data["data"]["serialize"]
    print("✅ Upload success. Task ID (serialize):", serialize)
    print("calculateType:", data["data"]["calculateType"])  # should be 3 for 3DGS
else:
    print("❌ Upload failed:", data)
```

### TypeScript Equivalent

```typescript
import { uploadVideoToKiriEngine } from '@/services/kiriEngine';

const videoBlob = /* your video blob */;

const result = await uploadVideoToKiriEngine(videoBlob, {
  scanType: '3dgs',
  isMesh: false,   // 0 = no mesh
  isMask: false    // 0 = no auto masking
});

const taskId = result.data.serialize;
console.log('Task ID:', taskId);
```

---

## 2. Status Check Script (`check_status.py`)

Checks the processing status of a submitted task.

```python
import requests

API_KEY = "kiri_bcRJgkwX5O8_qHEV-hi_DMZ83XNCeJ9bRDF2vmbajnE"
TASK_ID = "11234ce8a0fb46c1ae78fbb22e5a1ec6"

url = f"https://api.kiriengine.app/api/v1/open/model/getStatus?serialize={TASK_ID}"
headers = {"Authorization": f"Bearer {API_KEY}"}

resp = requests.get(url, headers=headers)
resp.raise_for_status()
data = resp.json()

print("Response:", data)

if data.get("ok"):
    status_map = {
        -1: "Uploading",
        0: "Processing",
        1: "Failed",
        2: "Successful",
        3: "Queuing",
        4: "Expired"
    }
    status = data["data"]["status"]
    print("✅ Task Status:", status_map.get(status, f"Unknown ({status})"))
else:
    print("❌ Error:", data)
```

### TypeScript Equivalent

```typescript
import { checkTaskStatus } from '@/services/kiriEngine';

const status = await checkTaskStatus(taskId);

console.log('Status:', status.status);    // 'pending' | 'processing' | 'completed' | 'failed'
console.log('Progress:', status.progress); // 0-100
```

---

## 3. Download Script (`download_model.py`)

Downloads the completed 3D model as a ZIP file.

```python
import requests
from tqdm import tqdm
import os

API_KEY = "kiri_bcRJgkwX5O8_qHEV-hi_DMZ83XNCeJ9bRDF2vmbajnE"
TASK_ID = "11234ce8a0fb46c1ae78fbb22e5a1ec6"

# Step 1: Request download link
url = f"https://api.kiriengine.app/api/v1/open/model/getModelZip?serialize={TASK_ID}"
headers = {"Authorization": f"Bearer {API_KEY}"}

resp = requests.get(url, headers=headers)
resp.raise_for_status()
data = resp.json()

if not data.get("ok"):
    print("❌ Error getting model URL:", data)
    exit()

model_url = data["data"]["modelUrl"]
print("✅ Model download link:", model_url)

# Step 2: Download the file with progress bar
zip_filename = f"{TASK_ID}.zip"
print(f"⬇️ Downloading model as {zip_filename}...")

with requests.get(model_url, stream=True) as r:
    r.raise_for_status()
    total_size = int(r.headers.get("content-length", 0))
    chunk_size = 1024 * 1024  # 1 MB chunks
    with open(zip_filename, "wb") as f, tqdm(
        total=total_size, unit='B', unit_scale=True, desc=zip_filename
    ) as pbar:
        for chunk in r.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)
                pbar.update(len(chunk))

print(f"🎉 Download complete! Saved as {zip_filename}")
```

### TypeScript Equivalent

```typescript
import { downloadModel } from '@/services/kiriEngine';

const blob = await downloadModel(taskId, (downloaded, total) => {
  const progress = Math.round((downloaded / total) * 100);
  console.log(`Download progress: ${progress}%`);
});

// Save to file
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${taskId}.zip`;
a.click();
```

---

## API Endpoints Reference

### Base URL
```
https://api.kiriengine.app/api/v1
```

### Authentication
All requests require a Bearer token:
```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

| Endpoint | Method | Purpose | Python Script | TS Function |
|----------|--------|---------|---------------|-------------|
| `/open/3dgs/video` | POST | Upload video for 3DGS | `upload_video.py` | `uploadVideoToKiriEngine()` |
| `/open/model/getStatus` | GET | Check processing status | `check_status.py` | `checkTaskStatus()` |
| `/open/model/getModelZip` | GET | Get download URL | `download_model.py` | `getDownloadLink()` |

### Status Codes

| Code | Meaning | Internal Status |
|------|---------|-----------------|
| -1 | Uploading | `processing` |
| 0 | Processing | `processing` |
| 1 | Failed | `failed` |
| 2 | Successful | `completed` |
| 3 | Queuing | `pending` |
| 4 | Expired | `failed` |

### Form Parameters (Upload)

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `videoFile` | File | - | The video file to process |
| `isMesh` | String | "0" or "1" | Convert 3DGS to mesh format |
| `isMask` | String | "0" or "1" | Enable auto masking |

---

## Complete Workflow Example

### Python

```python
import requests
import time

API_KEY = "your_api_key"
VIDEO_FILE = "pothole.mp4"

# 1. Upload
url = "https://api.kiriengine.app/api/v1/open/3dgs/video"
resp = requests.post(url,
    headers={"Authorization": f"Bearer {API_KEY}"},
    data={"isMesh": "0", "isMask": "0"},
    files={"videoFile": open(VIDEO_FILE, "rb")})
task_id = resp.json()["data"]["serialize"]
print("Task ID:", task_id)

# 2. Poll Status
while True:
    url = f"https://api.kiriengine.app/api/v1/open/model/getStatus?serialize={task_id}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {API_KEY}"})
    status = resp.json()["data"]["status"]

    if status == 2:  # Successful
        break
    elif status == 1:  # Failed
        raise Exception("Processing failed")

    time.sleep(5)

# 3. Download
url = f"https://api.kiriengine.app/api/v1/open/model/getModelZip?serialize={task_id}"
resp = requests.get(url, headers={"Authorization": f"Bearer {API_KEY}"})
model_url = resp.json()["data"]["modelUrl"]

with open(f"{task_id}.zip", "wb") as f:
    f.write(requests.get(model_url).content)
```

### TypeScript

```typescript
import { testCompleteWorkflow } from '@/utils/kiriEngineTest';

// Automatically handles upload -> poll -> download
await testCompleteWorkflow(videoFile);
```

---

## Testing

You can test the implementation using the test utilities:

```typescript
import { testUploadVideo, testCheckStatus, testDownloadModel } from '@/utils/kiriEngineTest';

// Test upload
const taskId = await testUploadVideo(videoFile);

// Test status check
await testCheckStatus(taskId);

// Test download (when ready)
await testDownloadModel(taskId);
```

Or run the complete workflow:

```typescript
import { testCompleteWorkflow } from '@/utils/kiriEngineTest';

await testCompleteWorkflow(videoFile);
```

---

## Notes

- **API Key**: The API key shown in the Python scripts has been exposed and should be rotated
- **Polling Interval**: Recommended to poll every 5 seconds
- **Download URL Expiry**: Download URLs are valid for 60 minutes
- **Video Limits**: Max 1920x1080 resolution, max 3 minutes duration
- **Processing Time**: Typically takes 5-15 minutes depending on video length and quality
- **Success Codes**: Kiri Engine API returns different success codes:
  - `code: 0` - Documented standard success code
  - `code: 200` - Actual success code for video/image uploads
  - `ok: true` - Boolean indicator for success
  - The implementation checks all three conditions for compatibility

---

## Implementation Files

- TypeScript Service: `src/services/kiriEngine.ts`
- Test Utilities: `src/utils/kiriEngineTest.ts`
- React Component (Upload): `src/pages/Capture3D.tsx`
- React Component (Status/Download): `src/pages/ProcessingProgress.tsx`
