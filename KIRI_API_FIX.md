# Kiri Engine API Fix - Correct Endpoint & Status Codes

## 🐛 Problem Fixed
The UI wasn't showing any processing tasks because:
1. ❌ Wrong API endpoint was being used
2. ❌ Wrong status code mapping
3. ❌ Tasks weren't being displayed

---

## ✅ Solution - Using Correct Kiri Engine API

### **Correct API Endpoint**
```
GET https://api.kiriengine.app/api/v1/open/model/getStatus?serialize={serialize_id}
```

**Headers**:
```
Authorization: Bearer ${YOUR_API_KEY}
```

---

### **Correct Status Codes**

| Status Code | Meaning | Internal Status | Progress |
|-------------|---------|----------------|----------|
| `-1` | Uploading | `processing` | 10% |
| `0` | Processing | `processing` | 50% |
| `1` | Failed | `failed` | 0% |
| `2` | Successful | `completed` | 100% |
| `3` | Queuing | `pending` | 0% |
| `4` | Expired | `failed` | 0% |

---

## 📋 API Response Format

### Example Request:
```bash
curl --location --request GET 'https://api.kiriengine.app/api/v1/open/model/getStatus?serialize=796a6f52457844b4918db3eadd64becc' \
--header 'Authorization: Bearer ${YOUR_API_KEY}'
```

### Example Response:
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

---

## 🔄 Status Flow

```
Upload Video
    ↓
Get serialize ID
    ↓
Check Status → Status 3 (Queuing)
    ↓
Status -1 (Uploading)
    ↓
Status 0 (Processing)
    ↓
Status 2 (Successful) → Download model
    OR
Status 1 (Failed) → Show error
    OR
Status 4 (Expired) → Show expired
```

---

## 💻 Implementation

### Updated `checkTaskStatus()` function:

```typescript
export async function checkTaskStatus(serialize: string): Promise<KiriEngineTask> {
  try {
    // Correct endpoint
    const response = await fetch(
      `${KIRI_ENGINE_BASE_URL}/model/getStatus?serialize=${serialize}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
        },
      }
    );

    const data: KiriEngineStatusResponse = await response.json();

    // Map Kiri status codes to internal status
    switch (data.data.status) {
      case -1: // Uploading
        return { status: 'processing', progress: 10, ... };
      case 0:  // Processing
        return { status: 'processing', progress: 50, ... };
      case 1:  // Failed
        return { status: 'failed', progress: 0, ... };
      case 2:  // Successful
        return { status: 'completed', progress: 100, ... };
      case 3:  // Queuing
        return { status: 'pending', progress: 0, ... };
      case 4:  // Expired
        return { status: 'failed', progress: 0, error: 'Task expired' };
    }
  } catch (error) {
    console.error('Error checking task status:', error);
    throw error;
  }
}
```

---

## 📊 Progress Mapping

Since Kiri Engine doesn't provide granular progress (0-100%), we map discrete states to progress ranges:

| Kiri Status | Progress | UI Display |
|-------------|----------|------------|
| 3 (Queuing) | 0% | "Waiting in queue..." |
| -1 (Uploading) | 10% | "Uploading to Kiri Engine..." |
| 0 (Processing) | 50% | "Processing by Kiri Engine" |
| 2 (Successful) | 100% | "Processing complete!" |
| 1/4 (Failed/Expired) | 0% | "Processing failed" |

---

## 🎨 UI Status Messages

Based on progress percentage:

```typescript
if (progress === 0 && status === 'pending') 
  → "Waiting in queue..."
  
if (progress <= 10) 
  → "Uploading to Kiri Engine..."
  
if (progress <= 30) 
  → "Extracting frames..."
  
if (progress <= 60) 
  → "Building 3D point cloud..."
  
if (progress > 60 && progress < 100) 
  → "Generating Gaussian Splatting model..."
  
if (progress === 100) 
  → "Processing complete!"
```

---

## 🔍 Debug Information

### Console Logs Now Show:
```javascript
// Correct API response
Kiri Engine Status Response: {
  "code": 0,
  "msg": "success",
  "data": {
    "serialize": "abc123...",
    "status": 0
  },
  "ok": true
}

// Status interpretation
Task abc123: Processing by Kiri Engine
```

---

## 🎯 What's Fixed

### Before:
- ❌ Wrong endpoint: `/task/status/{serialize}` 
- ❌ Wrong status codes: 0=pending, 1=processing, 2=completed
- ❌ No tasks showing in UI
- ❌ Status always failed

### After:
- ✅ Correct endpoint: `/model/getStatus?serialize={serialize}`
- ✅ Correct status codes: -1,0,1,2,3,4
- ✅ Tasks appear in UI
- ✅ Proper status tracking

---

## 🧪 Testing

### To Verify:
1. Upload a video
2. Check browser console:
   ```
   ✓ Upload successful, task ID: abc123...
   ✓ Kiri Engine Status Response: { code: 0, data: { status: 3 } }
   ✓ Task abc123: In queue, waiting to process
   ```
3. Watch status updates every 5 seconds:
   ```
   Status 3 → "Waiting in queue..."
   Status -1 → "Uploading to Kiri Engine..."
   Status 0 → "Processing by Kiri Engine"
   Status 2 → "Processing complete!"
   ```

---

## 📝 Files Modified

1. ✅ `/src/services/kiriEngine.ts`
   - Fixed API endpoint
   - Updated status code mapping
   - Corrected response interface

2. ✅ `/src/pages/ProcessingProgress.tsx`
   - Updated status messages
   - Adjusted progress ranges

---

## 📚 Official Kiri Engine Documentation

**Endpoint**: `GET /api/v1/open/model/getStatus`

**Parameters**:
- `serialize` (query string) - The serial number from upload

**Response**:
- `code`: 0 = success
- `msg`: Response message
- `data.status`: Status code (-1, 0, 1, 2, 3, 4)
- `ok`: Boolean success indicator

**Status Meanings**:
- `-1`: Uploading
- `0`: Processing
- `1`: Failed
- `2`: Successful
- `3`: Queuing
- `4`: Expired

---

## 🎉 Result

**Progress page now shows**:
- ✅ All processing tasks
- ✅ Correct status for each task
- ✅ Real-time updates every 5 seconds
- ✅ Proper progress indicators
- ✅ Clear status messages

The UI is now functional and displays all processing tasks correctly! 🚀

---

*Last Updated: October 14, 2025*
*Based on Official Kiri Engine API v1 Documentation*

