# Data Flow Analysis: Upload to Processing Pipeline

## Overview
This document details the complete data flow from video capture to 3D model processing in the Eyeway Dashboard, using Supabase for data storage and Kiri Engine for 3D processing.

---

## Architecture Diagram

```
┌─────────────────┐
│   User Device   │
│  (Capture3D)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              STEP 1: LOCATION CAPTURE                │
│  - Get GPS coordinates (lat, lng, accuracy)         │
│  - Reverse geocode to get address                   │
│  - Display on Mapbox with draggable marker          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              STEP 2: VIDEO CAPTURE                   │
│  - Start camera via MediaStream API                 │
│  - Record video using MediaRecorder                 │
│  - Save as Blob in browser memory                   │
│  - OR upload existing video file                    │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         STEP 3: DATABASE RECORD CREATION             │
│                                                       │
│  Supabase: potholes table                           │
│  ┌────────────────────────────────────────────┐     │
│  │ INSERT INTO potholes:                       │     │
│  │   - road_id (generated from lat/lng)       │     │
│  │   - pothole_number (random, temp)          │     │
│  │   - latitude, longitude                     │     │
│  │   - severity: 'medium' (default)            │     │
│  │   - detection_accuracy: 0.95                │     │
│  │   - status: 'reported'                      │     │
│  │   - description (with address)              │     │
│  │   - reported_by: 'mobile_app'               │     │
│  │   - model_url: NULL (to be updated)         │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Returns: pothole record with generated UUID         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         STEP 4: KIRI ENGINE UPLOAD                   │
│                                                       │
│  API: POST /api/v1/open/3dgs/video                  │
│  ┌────────────────────────────────────────────┐     │
│  │ FormData:                                   │     │
│  │   - videoFile: Blob (capture.mp4)          │     │
│  │   - isMesh: '0' (enable 3DGS)               │     │
│  │   - fileFormat: 'ply'                       │     │
│  │   - isMask: '0' (auto masking off)          │     │
│  │                                             │     │
│  │ Headers:                                    │     │
│  │   - Authorization: Bearer {API_KEY}         │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Response:                                           │
│  ┌────────────────────────────────────────────┐     │
│  │ {                                           │     │
│  │   code: 0,                                  │     │
│  │   msg: "success",                           │     │
│  │   data: {                                   │     │
│  │     serialize: "task_abc123...",            │     │
│  │     calculateType: 3  // 3DGS               │     │
│  │   },                                        │     │
│  │   ok: true                                  │     │
│  │ }                                           │     │
│  └────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      STEP 5: LOCAL TASK TRACKING (localStorage)      │
│                                                       │
│  processingTasksManager.addTask()                   │
│  ┌────────────────────────────────────────────┐     │
│  │ {                                           │     │
│  │   id: "task_timestamp_random",              │     │
│  │   taskId: "serialize_from_kiri",            │     │
│  │   potholeId: "uuid_from_step3",             │     │
│  │   videoUrl: "blob:http://...",              │     │
│  │   createdAt: "2025-10-14T...",              │     │
│  │   status: 'pending',                        │     │
│  │   progress: 0,                              │     │
│  │   statusMessage: 'Initializing...'          │     │
│  │ }                                           │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Stored in: localStorage['eyeway_processing_tasks'] │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         STEP 6: REDIRECT TO PROCESSING PAGE          │
│                                                       │
│  navigate(`/processing/${task.id}`)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         STEP 7: STATUS POLLING (Every 5s)            │
│                                                       │
│  API: GET /api/v1/open/task/status/{serialize}      │
│  ┌────────────────────────────────────────────┐     │
│  │ Response:                                   │     │
│  │ {                                           │     │
│  │   data: {                                   │     │
│  │     status: 'pending' | 'processing' |      │     │
│  │             'completed' | 'failed',         │     │
│  │     progress: 0-100,                        │     │
│  │     calculateType: 3,                       │     │
│  │     result: {                               │     │
│  │       modelUrl: "https://...",              │     │
│  │       thumbnailUrl: "https://..."           │     │
│  │     }                                       │     │
│  │   }                                         │     │
│  │ }                                           │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Update localStorage task with new status/progress   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      STEP 8: ON COMPLETION - DOWNLOAD MODEL          │
│                                                       │
│  When status === 'completed':                        │
│  ┌────────────────────────────────────────────┐     │
│  │ 1. Download model from Kiri Engine:         │     │
│  │    fetch(result.modelUrl)                   │     │
│  │                                             │     │
│  │ 2. Get model as Blob                        │     │
│  └────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      STEP 9: UPLOAD TO SUPABASE STORAGE              │
│                                                       │
│  Storage Bucket: 'models' (public)                   │
│  ┌────────────────────────────────────────────┐     │
│  │ supabase.storage                            │     │
│  │   .from('models')                           │     │
│  │   .upload(                                  │     │
│  │     '3d-models/pothole_{id}_{timestamp}.ply',│     │
│  │     modelBlob,                              │     │
│  │     { contentType: 'application/octet-stream' }│  │
│  │   )                                         │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Returns: { path: "3d-models/pothole_..." }         │
│                                                       │
│  Get public URL:                                     │
│  ┌────────────────────────────────────────────┐     │
│  │ supabase.storage                            │     │
│  │   .from('models')                           │     │
│  │   .getPublicUrl(path)                       │     │
│  │                                             │     │
│  │ Returns: {                                  │     │
│  │   publicUrl: "https://...supabase.co/..."   │     │
│  │ }                                           │     │
│  └────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      STEP 10: UPDATE POTHOLE WITH MODEL URL          │
│                                                       │
│  Supabase: potholes table                           │
│  ┌────────────────────────────────────────────┐     │
│  │ UPDATE potholes                             │     │
│  │ SET model_url = 'https://...supabase.co/...' │    │
│  │ WHERE id = potholeId                        │     │
│  └────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      STEP 11: UPDATE LOCAL TASK STATUS               │
│                                                       │
│  updateTask(taskId, {                               │
│    status: 'completed',                             │
│    progress: 100,                                   │
│    statusMessage: 'Model uploaded successfully!',   │
│    modelUrl: publicUrl                              │
│  })                                                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              STEP 12: DISPLAY RESULT                 │
│                                                       │
│  - Show completion status to user                   │
│  - Provide link to view in dashboard                │
│  - Option to capture another pothole                │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Potholes Table (`public.potholes`)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NO | Primary key (auto-generated) |
| `road_id` | text | NO | Identifier for the road |
| `pothole_number` | integer | NO | Sequential number for pothole |
| `latitude` | numeric | NO | GPS latitude |
| `longitude` | numeric | NO | GPS longitude |
| `severity` | text | NO | 'low', 'medium', 'high', 'critical' |
| `detection_accuracy` | numeric | NO | Confidence score (0-1) |
| `status` | text | NO | 'reported', 'inspected', 'scheduled', 'in-progress', 'completed' |
| `report_date` | timestamptz | NO | When reported (default: now()) |
| `scheduled_repair_date` | timestamptz | YES | When repair is scheduled |
| `completion_date` | timestamptz | YES | When repair was completed |
| `description` | text | YES | Additional details |
| `reported_by` | text | YES | Who reported it |
| `image_url` | text | YES | URL to image |
| `created_at` | timestamptz | NO | Record creation time (default: now()) |
| `lidar_data` | jsonb | YES | LiDAR scan data |
| `model_url` | text | YES | **URL to 3D model in Supabase Storage** |

**RLS Status**: Enabled ✅

---

### Pothole Documents Table (`public.pothole_documents`)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `title` | text | Document title |
| `type` | text | Document type |
| `status` | text | Document status |
| `priority` | text | Priority level |
| `due_date` | timestamptz | Due date |
| `assigned_to` | text | Assigned person |
| `pothole_id` | uuid | Foreign key to potholes.id |
| `created_at` | timestamptz | Creation time |

**RLS Status**: Enabled ✅  
**⚠️ Security Issue**: No RLS policies exist!

---

## Storage Buckets

### Models Bucket (`storage.models`)
- **Name**: `models`
- **Public**: ✅ Yes
- **Purpose**: Store 3D model files (.ply, .glb, etc.)
- **Path Structure**: `3d-models/pothole_{potholeId}_{timestamp}.ply`

---

## Key Code Locations

### 1. Video Upload Flow
**File**: `/src/pages/Capture3D.tsx`
- **Lines 270-333**: `processGaussianSplatting()` function
  - Creates pothole record in database
  - Uploads video to Kiri Engine
  - Creates local task tracking
  - Navigates to processing page

### 2. Kiri Engine Service
**File**: `/src/services/kiriEngine.ts`
- **Lines 87-129**: `uploadVideoToKiriEngine()` - Upload video
- **Lines 136-166**: `checkTaskStatus()` - Poll for status
- **Lines 212-255**: `downloadAndUpload3DModel()` - Download and upload to Supabase

### 3. Task Management
**File**: `/src/services/processingTasksManager.ts`
- **Lines 53-69**: `addTask()` - Create new task in localStorage
- **Lines 74-83**: `updateTask()` - Update task status
- **Storage Key**: `eyeway_processing_tasks`

### 4. Processing Progress Page
**File**: `/src/pages/ProcessingProgress.tsx`
- **Lines 43-100**: `refreshActiveTasks()` - Poll and update task status
- **Lines 52-85**: Auto-download and upload logic when task completes
- **Lines 22-27**: Auto-refresh every 5 seconds

---

## Data Flow Summary

### Phase 1: Capture (Client-side)
1. ✅ Get GPS location
2. ✅ Record video (MediaRecorder → Blob)
3. ✅ Store video in browser memory

### Phase 2: Database Creation (Supabase)
4. ✅ Create pothole record with location data
5. ✅ Get pothole UUID for tracking

### Phase 3: External Processing (Kiri Engine)
6. ✅ Upload video to Kiri Engine API
7. ✅ Receive task serialize ID
8. ✅ Store task in localStorage for tracking

### Phase 4: Status Monitoring (Polling)
9. ✅ Poll Kiri Engine every 5 seconds
10. ✅ Update localStorage with progress
11. ✅ Display progress to user (0-100%)

### Phase 5: Completion & Storage (Hybrid)
12. ✅ Download completed model from Kiri Engine
13. ✅ Upload model to Supabase Storage (`models` bucket)
14. ✅ Update pothole record with `model_url`
15. ✅ Update localStorage task to 'completed'
16. ✅ Display success to user

---

## Issues & Recommendations

### 🔴 Critical Issues

#### 1. Missing TypeScript Type for `model_url`
**Problem**: The `model_url` column exists in database but is missing from TypeScript types.

**Current Type** (`/src/integrations/supabase/types.ts`):
```typescript
potholes: {
  Row: {
    // ... other fields
    image_url: string | null
    lidar_data: Json | null
    // model_url is MISSING!
  }
}
```

**Impact**: TypeScript won't catch errors when accessing `model_url` field.

**Fix Required**: Regenerate TypeScript types or manually add:
```typescript
model_url: string | null
```

#### 2. Missing RLS Policies on `pothole_documents`
**Problem**: RLS is enabled but no policies exist.

**Security Advisory**:
```
Table `public.pothole_documents` has RLS enabled, but no policies exist
```

**Impact**: No one can access the table (not even authenticated users).

**Fix Required**: Create appropriate RLS policies based on access requirements.

#### 3. Outdated Postgres Version
**Problem**: Current version `15.8.1.111` has security patches available.

**Recommendation**: Upgrade database to latest version via Supabase dashboard.

---

### 🟡 Potential Improvements

#### 1. Video Storage
**Current**: Videos are NOT stored permanently (only Blob URLs in browser)
- After page refresh, video preview is lost
- No backup of original video

**Recommendation**: Consider uploading videos to Supabase Storage:
```typescript
// Upload video to storage
const { data } = await supabase.storage
  .from('videos')
  .upload(`pothole-videos/${potholeId}.webm`, videoBlob);

// Save URL in pothole record
await supabase
  .from('potholes')
  .update({ video_url: data.path })
  .eq('id', potholeId);
```

#### 2. Error Recovery
**Current**: If processing fails, task is marked as failed with no retry.

**Recommendation**: Add retry mechanism:
- Auto-retry up to 3 times
- Exponential backoff between retries
- Manual retry button for failed tasks

#### 3. Task Persistence
**Current**: Tasks stored in localStorage only
- Lost if user clears browser data
- Not synced across devices

**Recommendation**: Store tasks in Supabase:
```sql
CREATE TABLE processing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pothole_id uuid REFERENCES potholes(id),
  kiri_task_id text NOT NULL,
  status text NOT NULL,
  progress integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 4. Progress Accuracy
**Current**: Progress is based on Kiri Engine's reported progress (may not be linear)

**Recommendation**: Add client-side progress estimation:
- Upload complete: 25%
- Processing started: 50%
- Model generated: 75%
- Upload to Supabase: 90%
- Complete: 100%

#### 5. Model Format Options
**Current**: Hardcoded to PLY format

**Recommendation**: Let users choose format:
- PLY (point cloud)
- GLB/GLTF (web-optimized)
- USDZ (AR on iOS)
- OBJ/FBX (traditional 3D apps)

---

## API Rate Limits & Costs

### Kiri Engine
- **Cost**: 1 credit per API call = $1 USD
- **Initial Credits**: 20 free credits
- **Minimum Recharge**: 500 credits ($500)
- **Video Limits**: Max 1920x1080, max 3 minutes

### Supabase Storage
- **Free Tier**: 1GB storage
- **Bandwidth**: 2GB/month free
- **File Size**: No hard limit (but consider bandwidth)

---

## Testing Checklist

- [x] Location capture with GPS
- [x] Video recording via camera
- [x] Video upload from file
- [x] Pothole record creation
- [x] Kiri Engine upload
- [x] Task creation in localStorage
- [x] Status polling
- [x] Progress updates
- [x] Model download from Kiri
- [x] Model upload to Supabase
- [x] Database update with model_url
- [x] Task completion status
- [ ] Error handling for upload failures
- [ ] Error handling for processing failures
- [ ] Network error recovery
- [ ] TypeScript type safety for model_url
- [ ] RLS policies on pothole_documents

---

## Environment Variables Required

```bash
# .env file
VITE_KIRI_ENGINE_API_KEY=kiri_your_api_key_here

# Supabase (usually auto-configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Next Steps

1. **Fix TypeScript Types** - Add `model_url` field
2. **Add RLS Policies** - Secure `pothole_documents` table
3. **Upgrade Postgres** - Apply security patches
4. **Consider Video Storage** - Backup original videos
5. **Add Task Persistence** - Move from localStorage to Supabase
6. **Improve Error Handling** - Add retry logic

---

*Last Updated: October 14, 2025*

