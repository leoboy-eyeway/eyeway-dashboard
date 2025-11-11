# Kiri Engine API - Complete Implementation Guide

## 📚 Official API Documentation

Based on official Kiri Engine API docs with exact implementation details.

---

## 🔄 Complete Workflow

```
1. UPLOAD VIDEO → Get serialize ID
2. POLL STATUS → Check until status = 2 (Successful)
3. AUTO-DOWNLOAD → When status = 2, automatically fetch download URL
4. SAVE TO DATABASE → Store model URL in Supabase
5. USER DOWNLOADS → Click to download ZIP file
```

---

## 1️⃣ Upload Video

### API Endpoint
```
POST https://api.kiriengine.app/api/v1/open/3dgs/video
```

### Request Headers
```
Authorization: Bearer ${YOUR_API_KEY}
Content-Type: multipart/form-data
```

### Request Body
```
videoFile: [video file]
isMesh: "0" or "1"
isMask: "0" or "1"
```

### Response (Success)
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "serialize": "796a6f52457844b4918db3eadd64becc",
    "calculateType": 3
  },
  "ok": true
}
```

### TypeScript Implementation
```typescript
const result = await uploadVideoToKiriEngine(videoBlob, {
  scanType: '3dgs',
  isMesh: false,   // "0" = no mesh conversion
  isMask: false    // "0" = no auto masking
});

const taskId = result.data.serialize;
console.log('Task ID:', taskId);
```

### Success Codes
- `code: 0` - Documented standard (some endpoints)
- `code: 200` - Actual response for video/image uploads
- `ok: true` - Boolean success indicator

**Our implementation checks all three for compatibility** ✅

---

## 2️⃣ Check Status (Poll)

### API Endpoint
```
GET https://api.kiriengine.app/api/v1/open/model/getStatus?serialize=796a6f52457844b4918db3eadd64becc
```

### Request Headers
```
Authorization: Bearer ${YOUR_API_KEY}
```

### Response (Success)
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "serialize": "796a6f52457844b4918db3eadd64becc",
    "status": 2
  },
  "ok": true
}
```

### Status Codes

| Code | Status | Description | Internal Status | Progress |
|------|--------|-------------|-----------------|----------|
| -1 | Uploading | File is being uploaded to server | `processing` | 10% |
| 0 | Processing | Model is being processed | `processing` | 50% |
| 1 | Failed | Processing failed | `failed` | 0% |
| **2** | **Successful** | **Model is ready!** | `completed` | 100% |
| 3 | Queuing | Task is in queue | `pending` | 0% |
| 4 | Expired | Task has expired | `failed` | 0% |

### TypeScript Implementation
```typescript
const status = await checkTaskStatus(taskId);

switch (status.status) {
  case 'pending':    // Kiri status: 3 (Queuing)
    console.log('Waiting in queue...');
    break;
  case 'processing': // Kiri status: -1 (Uploading) or 0 (Processing)
    console.log(`Processing: ${status.progress}%`);
    break;
  case 'completed':  // Kiri status: 2 (Successful) ← READY TO DOWNLOAD!
    console.log('Model ready!', status.result?.modelUrl);
    break;
  case 'failed':     // Kiri status: 1 (Failed) or 4 (Expired)
    console.error('Failed:', status.error);
    break;
}
```

### Polling Interval
**Recommended**: 5 seconds
```typescript
const interval = setInterval(async () => {
  const status = await checkTaskStatus(taskId);

  if (status.status === 'completed') {
    clearInterval(interval);
    // Auto-download triggered!
  }
}, 5000);
```

---

## 3️⃣ Get Download Link (Auto-triggered when status = 2)

### API Endpoint
```
GET https://api.kiriengine.app/api/v1/open/model/getModelZip?serialize=796a6f52457844b4918db3eadd64becc
```

### Request Headers
```
Authorization: Bearer ${YOUR_API_KEY}
```

### Response (Success)
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "modelUrl": "https://cdn.kiriengine.com/models/...",
    "serialize": "796a6f52457844b4918db3eadd64becc"
  },
  "ok": true
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `modelUrl` | String | Download link for zipped 3D model |
| `serialize` | String | Task ID (same as request) |

**⚠️ Important**: Download URL is **valid for 60 minutes only**

### TypeScript Implementation
```typescript
// Automatically called when status = 2
const modelUrl = await getDownloadLink(taskId);

// Returns: "https://cdn.kiriengine.com/models/abc123.zip"
console.log('Download link:', modelUrl);
console.log('Valid for: 60 minutes');
```

---

## 🔄 Automatic Flow Implementation

### How It Works

When `checkTaskStatus()` detects `status = 2` (Successful):

1. **Automatically fetches download link**
   ```typescript
   const modelUrl = await getDownloadLink(serialize);
   ```

2. **Saves to task result**
   ```typescript
   result = {
     modelUrl: modelUrl,
     thumbnailUrl: ''
   };
   ```

3. **Updates Supabase**
   ```typescript
   await updateTask(task.id, {
     status: 'completed',
     progress: 100,
     modelUrl: modelUrl  // ← Stored in database!
   });
   ```

4. **User can download**
   - Download button becomes enabled
   - Clicking downloads the ZIP file
   - URL retrieved from database (valid 60 minutes)

---

## 📊 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│ STEP 1: UPLOAD                                              │
└────────────────────────────────────────────────────────────┘

User uploads video
     ↓
🌐 POST /api/v1/open/3dgs/video
     ↓
✅ Response: { serialize: "abc123...", code: 200 }
     ↓
💾 INSERT INTO processing_tasks (kiri_task_id: "abc123...")

┌────────────────────────────────────────────────────────────┐
│ STEP 2: POLL STATUS (Every 5s)                              │
└────────────────────────────────────────────────────────────┘

Auto-refresh timer fires
     ↓
🌐 GET /api/v1/open/model/getStatus?serialize=abc123...
     ↓
✅ Response: { status: 0, code: 0 }  ← "Processing"
     ↓
💾 UPDATE processing_tasks SET progress = 50
     ↓
... wait 5 seconds ...
     ↓
🌐 GET /api/v1/open/model/getStatus?serialize=abc123...
     ↓
✅ Response: { status: 2, code: 0 }  ← "Successful!" 🎉

┌────────────────────────────────────────────────────────────┐
│ STEP 3: AUTO-FETCH DOWNLOAD URL (Triggered by status = 2)  │
└────────────────────────────────────────────────────────────┘

Status check detects status = 2
     ↓
🌐 GET /api/v1/open/model/getModelZip?serialize=abc123...
     ↓
✅ Response: { modelUrl: "https://cdn.../model.zip" }
     ↓
💾 UPDATE processing_tasks SET model_url = "https://cdn.../model.zip"
     ↓
🔔 Real-time broadcast to all clients
     ↓
✨ Download button enabled in UI

┌────────────────────────────────────────────────────────────┐
│ STEP 4: USER DOWNLOADS                                      │
└────────────────────────────────────────────────────────────┘

User clicks "Download" button
     ↓
📥 Fetch from modelUrl (valid 60 min)
     ↓
💾 Save as: {taskId}.zip
     ↓
✅ Download complete!
```

---

## 🎯 Implementation Highlights

### 1. Automatic Download URL Retrieval ✅

```typescript
// In checkTaskStatus() - src/services/kiriEngine.ts:348-367
case 2:
  // Successful - Automatically get download link
  status = 'completed';
  progress = 100;

  // 🎯 AUTO-FETCH download link
  try {
    const modelUrl = await getDownloadLink(serialize);
    result = {
      modelUrl: modelUrl,
      thumbnailUrl: ''
    };
    console.log(`✅ Download URL retrieved`);
  } catch (error) {
    // Don't fail status check if download link fails
    // User can manually click download button
  }
  break;
```

### 2. Saves to Supabase ✅

```typescript
// In ProcessingProgress.tsx - Multiple locations
await updateTask(task.id, {
  status: status.status,
  progress: status.progress,
  modelUrl: status.result?.modelUrl  // ← Saved to database
});
```

### 3. Real-Time UI Updates ✅

```typescript
// Supabase real-time subscription
subscribeToTasks(async (payload) => {
  await loadTasks(); // Auto-refreshes UI
});
```

### 4. User-Friendly Notifications ✅

```typescript
if (status.status === 'completed') {
  toast({
    title: '✅ Model Ready!',
    description: 'Your 3D model is ready to download',
  });
}
```

---

## 🔧 Configuration

### Environment Variables

```env
VITE_KIRI_ENGINE_API_KEY=kiri_your_api_key_here
```

### API Base URL

```typescript
const KIRI_ENGINE_BASE_URL = 'https://api.kiriengine.app/api/v1';
```

---

## ⏱️ Timing & Limits

| Item | Value | Notes |
|------|-------|-------|
| **Upload timeout** | 10 minutes | For video upload |
| **Poll interval** | 5 seconds | Check status frequency |
| **Processing time** | 5-15 minutes | Average processing time |
| **Download URL validity** | 60 minutes | URL expires after 1 hour |
| **Max video length** | 3 minutes | Recommended max |
| **Max resolution** | 1920x1080 | Recommended max |

---

## 📋 Quick Reference

### Status Code Cheat Sheet

```
-1 = Uploading    → Show: "Uploading to Kiri Engine..."
 0 = Processing   → Show: "Processing 3D model..."
 1 = Failed       → Show: "Processing failed"
 2 = Successful   → Show: "✅ Model Ready!" + Download button
 3 = Queuing      → Show: "Waiting in queue..."
 4 = Expired      → Show: "Task expired"
```

### API Endpoints Cheat Sheet

```
Upload:   POST   /api/v1/open/3dgs/video
Status:   GET    /api/v1/open/model/getStatus?serialize={id}
Download: GET    /api/v1/open/model/getModelZip?serialize={id}
```

### Response Code Cheat Sheet

```
code: 0   = Success (status check, download)
code: 200 = Success (video upload)
ok: true  = Success indicator
```

---

## ✅ Implementation Checklist

- [x] Upload video to Kiri Engine
- [x] Save task ID to Supabase
- [x] Poll status every 5 seconds
- [x] Map Kiri status codes to internal status
- [x] **Auto-fetch download URL when status = 2**
- [x] **Save model URL to Supabase**
- [x] Enable download button when ready
- [x] Download ZIP file
- [x] Real-time sync across devices
- [x] Error handling for all operations
- [x] User notifications (toasts)

---

## 🎉 Summary

Your implementation now **automatically**:

1. ✅ Fetches download URL when model is ready (status = 2)
2. ✅ Saves URL to Supabase database
3. ✅ Notifies user with toast message
4. ✅ Enables download button
5. ✅ Syncs across all devices in real-time

**No manual intervention needed** - everything happens automatically! 🚀
