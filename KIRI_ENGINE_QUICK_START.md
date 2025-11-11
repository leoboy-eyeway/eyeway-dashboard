# Kiri Engine - Quick Start Guide

## 🚀 Quick Test (5 minutes)

### Step 1: Set up API Key
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API key
VITE_KIRI_ENGINE_API_KEY=kiri_your_key_here

# Restart dev server
npm run dev
```

### Step 2: Open Test Page
```
http://localhost:8080/kiri-test
```

### Step 3: Test Upload
1. Click "Choose File" → Select a video (MP4, max 3 min)
2. Click "Upload to Kiri Engine"
3. Wait for Task ID to appear
4. Copy the Task ID

### Step 4: Check Status
1. Task ID should auto-populate
2. Click "Check Status"
3. See console output for detailed status
4. Repeat until status = "Successful"

### Step 5: Download
1. When status = "Successful"
2. Click "Download Model"
3. ZIP file downloads automatically

---

## 📝 Console Testing

### Upload Video
```typescript
// Get video file from input
const input = document.querySelector('input[type="file"]');
const video = input.files[0];

// Upload
import { testUploadVideo } from '@/utils/kiriEngineTest';
const taskId = await testUploadVideo(video);
// ✅ Upload success. Task ID: abc123...
```

### Check Status
```typescript
import { testCheckStatus } from '@/utils/kiriEngineTest';
await testCheckStatus('abc123...');
// ✅ Task Status: Processing (50%)
```

### Download Model
```typescript
import { testDownloadModel } from '@/utils/kiriEngineTest';
await testDownloadModel('abc123...');
// 🎉 Download complete! Size: 25.43 MB
```

### Complete Workflow
```typescript
import { testCompleteWorkflow } from '@/utils/kiriEngineTest';
await testCompleteWorkflow(video);
// Runs all steps automatically with polling
```

---

## 🎯 Python → TypeScript Cheat Sheet

| Python | TypeScript |
|--------|-----------|
| `upload_video.py` | `testUploadVideo(videoFile)` |
| `check_status.py` | `testCheckStatus(taskId)` |
| `download_model.py` | `testDownloadModel(taskId)` |

### Python
```python
# Upload
resp = requests.post("https://api.kiriengine.app/api/v1/open/3dgs/video",
    headers={"Authorization": f"Bearer {API_KEY}"},
    data={"isMesh": "0", "isMask": "0"},
    files={"videoFile": open("video.mp4", "rb")})
task_id = resp.json()["data"]["serialize"]

# Status
resp = requests.get(f"https://api.kiriengine.app/api/v1/open/model/getStatus?serialize={task_id}",
    headers={"Authorization": f"Bearer {API_KEY}"})
status = resp.json()["data"]["status"]

# Download
resp = requests.get(f"https://api.kiriengine.app/api/v1/open/model/getModelZip?serialize={task_id}",
    headers={"Authorization": f"Bearer {API_KEY}"})
model_url = resp.json()["data"]["modelUrl"]
```

### TypeScript
```typescript
// Upload
const result = await uploadVideoToKiriEngine(videoBlob, {
  scanType: '3dgs',
  isMesh: false,
  isMask: false
});
const taskId = result.data.serialize;

// Status
const status = await checkTaskStatus(taskId);
console.log(status.status, status.progress);

// Download
const blob = await downloadModel(taskId);
```

---

## 📊 Status Codes

| Code | Meaning | What to Do |
|------|---------|-----------|
| -1 | Uploading | Wait, check again in 5s |
| 0 | Processing | Wait, check again in 5s |
| 1 | Failed | Check error message |
| **2** | **Successful** | **Ready to download!** |
| 3 | Queuing | Wait, check again in 10s |
| 4 | Expired | Re-upload file |

---

## 🔧 Troubleshooting

### Error: "API key not configured"
```bash
# Check .env file exists
ls -la .env

# Check it has the key
cat .env | grep KIRI

# Restart dev server
npm run dev
```

### Error: 401 Unauthorized
```bash
# Invalid API key - get new one from:
https://www.kiriengine.app/api/keys
```

### Error: No task ID returned
```typescript
// Check console for full error
console.log(result);

// Verify video file is valid
console.log(videoFile.type, videoFile.size);
```

### Status stuck at 0 (Processing)
```typescript
// This is normal - processing takes 5-15 minutes
// Keep polling every 5 seconds
// Or use testCompleteWorkflow() to auto-poll
```

---

## 🎬 Example Videos for Testing

**Good test videos:**
- 30 seconds - 2 minutes
- 720p or 1080p resolution
- Clear, well-lit subject
- 360° rotation around object
- Minimal motion blur

**Avoid:**
- Very long videos (>3 min)
- Low resolution (<480p)
- Dark/poorly lit
- Too much camera shake

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `src/services/kiriEngine.ts` | API functions |
| `src/utils/kiriEngineTest.ts` | Test utilities |
| `src/pages/KiriEngineTestPage.tsx` | Test UI |
| `KIRI_ENGINE_PYTHON_REFERENCE.md` | Python scripts |
| `KIRI_ENGINE_IMPLEMENTATION_SUMMARY.md` | Full docs |

---

## 🌐 URLs

- **Test Page**: `/kiri-test`
- **3D Capture**: `/capture-3d`
- **Processing**: `/processing`
- **API Docs**: https://docs.kiriengine.app
- **Get API Key**: https://www.kiriengine.app/api/keys

---

## ⚡ One-Liner Tests

```typescript
// Browser console quick tests:

// 1. Upload (paste this in console)
const f = document.querySelector('input[type="file"]').files[0];
const { testUploadVideo } = await import('/src/utils/kiriEngineTest.ts');
await testUploadVideo(f);

// 2. Check status (replace with your task ID)
const { testCheckStatus } = await import('/src/utils/kiriEngineTest.ts');
await testCheckStatus('YOUR_TASK_ID_HERE');

// 3. Download (when status = 2)
const { testDownloadModel } = await import('/src/utils/kiriEngineTest.ts');
await testDownloadModel('YOUR_TASK_ID_HERE');
```

---

**Need more help?** See `KIRI_ENGINE_IMPLEMENTATION_SUMMARY.md` for complete documentation.
