# Data Flow Summary - Quick Reference

## 🎯 Overview
Video upload → Kiri Engine processing → Supabase storage → Database update

---

## 📊 Complete Flow (12 Steps)

### 🎬 Phase 1: Capture
1. **Get Location** → GPS coordinates + reverse geocode
2. **Record Video** → MediaRecorder API → Blob in memory

### 💾 Phase 2: Database
3. **Create Pothole Record** → Supabase `potholes` table → Get UUID

### ☁️ Phase 3: Upload to Kiri Engine
4. **Upload Video** → POST to Kiri Engine API → Get task serialize ID
5. **Create Local Task** → localStorage tracking → Task ID + Pothole ID

### ⏳ Phase 4: Processing & Polling
6. **Redirect** → `/processing/{taskId}` page
7. **Poll Status** → GET Kiri API every 5s → Update progress (0-100%)

### ✅ Phase 5: Completion
8. **Download Model** → From Kiri Engine result URL
9. **Upload to Storage** → Supabase `models` bucket → Get public URL
10. **Update Database** → Set `model_url` in potholes table
11. **Update Task** → localStorage status = 'completed'
12. **Show Result** → User sees completion screen

---

## 🗃️ Data Storage

### Supabase Tables

#### `potholes` (Main table)
```sql
- id (uuid, PK)
- road_id, pothole_number
- latitude, longitude
- severity, status
- model_url ← UPDATED WHEN COMPLETE
- created_at, report_date
```

#### `pothole_documents` (Related docs)
```sql
- id (uuid, PK)
- pothole_id (FK → potholes.id)
- title, type, status, priority
```

### Supabase Storage

#### `models` bucket (public)
```
Path: 3d-models/pothole_{id}_{timestamp}.ply
URL: https://{project}.supabase.co/storage/v1/object/public/models/...
```

### localStorage

#### `eyeway_processing_tasks`
```json
{
  "id": "task_...",
  "taskId": "kiri_serialize_id",
  "potholeId": "uuid",
  "status": "pending|processing|completed|failed",
  "progress": 0-100,
  "modelUrl": "supabase_url"
}
```

---

## 🔧 Key Services

### `kiriEngine.ts`
- `uploadVideoToKiriEngine()` - Upload video, get task ID
- `checkTaskStatus()` - Poll for progress
- `downloadAndUpload3DModel()` - Download from Kiri → Upload to Supabase

### `processingTasksManager.ts`
- `addTask()` - Create task in localStorage
- `updateTask()` - Update status/progress
- `getAllTasks()` - Retrieve all tasks

---

## 🔌 API Endpoints

### Kiri Engine
```
Base: https://api.kiriengine.app/api/v1/open
Auth: Bearer {VITE_KIRI_ENGINE_API_KEY}

POST /3dgs/video
  → FormData: videoFile, isMesh=0, fileFormat=ply
  ← { data: { serialize: "task_id", calculateType: 3 } }

GET /task/status/{serialize}
  → Query: serialize ID
  ← { data: { status, progress, result: { modelUrl } } }
```

### Supabase
```
Base: https://mzgmgasacltuphvqfwzf.supabase.co

INSERT INTO potholes (...)
SELECT * FROM potholes WHERE id = '...'
UPDATE potholes SET model_url = '...' WHERE id = '...'

Storage: .from('models').upload(path, blob)
Storage: .from('models').getPublicUrl(path)
```

---

## ⚠️ Critical Issues Found

### 1. ✅ FIXED: Missing `model_url` in TypeScript types
- **Status**: Fixed in `/src/integrations/supabase/types.ts`
- **Change**: Added `model_url: string | null` to Row, Insert, Update

### 2. 🔴 Missing RLS policies on `pothole_documents`
- **Issue**: RLS enabled but no policies → No one can access
- **Action Required**: Create RLS policies in Supabase dashboard

### 3. 🔴 Outdated Postgres version
- **Issue**: v15.8.1.111 has security patches available
- **Action Required**: Upgrade via Supabase dashboard

---

## 💡 Recommendations

### Storage Improvements
- [ ] Store original videos in Supabase (currently only in browser memory)
- [ ] Add video_url field to potholes table
- [ ] Implement automatic cleanup of old files

### Error Handling
- [ ] Add retry logic for failed uploads (3 retries with exponential backoff)
- [ ] Manual retry button for failed tasks
- [ ] Better error messages for users

### Task Persistence
- [ ] Move tasks from localStorage to Supabase table
- [ ] Sync tasks across devices
- [ ] Persist tasks even if browser data is cleared

### Progress Accuracy
- [ ] Add client-side progress estimation
  - Upload: 0-25%
  - Processing: 25-75%
  - Download/Upload: 75-90%
  - Complete: 90-100%

---

## 📝 Environment Variables

```bash
# Required
VITE_KIRI_ENGINE_API_KEY=kiri_...

# Auto-configured (from Supabase)
VITE_SUPABASE_URL=https://mzgmgasacltuphvqfwzf.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## 💰 Costs

### Kiri Engine
- 1 credit = $1 USD per API call
- 20 free credits on signup
- Min recharge: 500 credits ($500)

### Supabase
- Storage: 1GB free
- Bandwidth: 2GB/month free
- Database: Unlimited rows (fair use)

---

## 🧪 Testing Status

✅ Location capture  
✅ Video recording  
✅ Video upload  
✅ Pothole creation  
✅ Kiri upload  
✅ Task tracking  
✅ Status polling  
✅ Model download  
✅ Storage upload  
✅ Database update  
✅ TypeScript types fixed  

❌ RLS policies  
❌ Error recovery  
❌ Video persistence  

---

## 📚 Documentation

- Full Analysis: `DATA_FLOW_ANALYSIS.md`
- Kiri Integration: `KIRI_ENGINE_INTEGRATION.md`
- Supabase Dashboard: https://supabase.com/dashboard/project/mzgmgasacltuphvqfwzf

---

*Last Updated: October 14, 2025*

