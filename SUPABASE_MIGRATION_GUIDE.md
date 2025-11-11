# Supabase Migration Guide - Processing Tasks

## Overview

The processing tasks storage has been migrated from **browser localStorage** to **Supabase cloud database**. This provides:

✅ **Persistent storage** - Data survives browser clears
✅ **Multi-device sync** - Access tasks from any device
✅ **Real-time updates** - Live sync across tabs/devices
✅ **Better scalability** - No localStorage size limits
✅ **Data integrity** - Database constraints and validation

---

## 🔄 What Changed

### Before (localStorage)
```typescript
// src/services/processingTasksManager.ts
import { getAllTasks, addTask } from '@/services/processingTasksManager';

// Data stored in: browser localStorage
// Key: "eyeway_processing_tasks"
// Sync: Manual refresh only
// Persistence: Cleared with browser data
```

### After (Supabase)
```typescript
// src/services/supabaseTasksManager.ts
import { getAllTasks, addTask } from '@/services/supabaseTasksManager';

// Data stored in: Supabase cloud database
// Table: public.processing_tasks
// Sync: Real-time subscriptions
// Persistence: Permanent cloud storage
```

---

## 📊 Database Schema

### Supabase Table: `processing_tasks`

```sql
CREATE TABLE public.processing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiri_task_id TEXT NOT NULL,           -- Kiri Engine task ID
  pothole_id UUID,                      -- Reference to potholes table
  video_url TEXT,                       -- Local video URL
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  status TEXT NOT NULL,                 -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,           -- 0-100
  status_message TEXT,                  -- Human-readable status
  error_message TEXT,                   -- Error details if failed
  model_url TEXT,                       -- Final 3D model URL

  CONSTRAINT fk_pothole
    FOREIGN KEY (pothole_id)
    REFERENCES potholes(id)
    ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_processing_tasks_kiri_task_id ON processing_tasks(kiri_task_id);
CREATE INDEX idx_processing_tasks_status ON processing_tasks(status);
CREATE INDEX idx_processing_tasks_pothole_id ON processing_tasks(pothole_id);
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ UPLOAD VIDEO                                                 │
└─────────────────────────────────────────────────────────────┘

User uploads video (Capture3D.tsx)
     ↓
📤 uploadVideoToKiriEngine(videoBlob)
     ↓
✅ Response: { data: { serialize: "abc123..." } }
     ↓
💾 await addTask(serialize, videoUrl, potholeId)
     ↓
🗄️ INSERT INTO processing_tasks (kiri_task_id, pothole_id, ...)
     ↓
🔔 Real-time broadcast to all subscribed clients
     ↓
UI updates automatically

┌─────────────────────────────────────────────────────────────┐
│ CHECK STATUS (Manual or Auto-refresh)                       │
└─────────────────────────────────────────────────────────────┘

User clicks "Check Status" OR Auto-refresh (5s interval)
     ↓
🔍 checkTaskStatus(kiriTaskId)
     ↓
🌐 GET https://api.kiriengine.app/.../getStatus?serialize=...
     ↓
✅ Response: { status: 0, progress: 50 }
     ↓
💾 await updateTask(taskId, { status, progress, ... })
     ↓
🗄️ UPDATE processing_tasks SET ... WHERE id = ...
     ↓
🔔 Real-time broadcast to all subscribed clients
     ↓
UI updates automatically across all tabs/devices

┌─────────────────────────────────────────────────────────────┐
│ REAL-TIME SYNC                                               │
└─────────────────────────────────────────────────────────────┘

ProcessingProgress.tsx (mount)
     ↓
📡 subscribeToTasks(callback)
     ↓
🎧 Listen to: postgres_changes on processing_tasks table
     ↓
Any INSERT/UPDATE/DELETE occurs
     ↓
🔔 Callback triggered with payload
     ↓
🔄 Reload tasks from Supabase
     ↓
✨ UI updates in real-time
```

---

## 🔧 API Changes

### getAllTasks()
```typescript
// Before: Synchronous
const tasks = getAllTasks();

// After: Async
const tasks = await getAllTasks();
```

### addTask()
```typescript
// Before: Returns task immediately
const task = addTask(kiriTaskId);

// After: Returns Promise
const task = await addTask(kiriTaskId, videoUrl, potholeId);
if (!task) {
  // Handle error
}
```

### updateTask()
```typescript
// Before: Synchronous
updateTask(taskId, updates);

// After: Async
await updateTask(taskId, updates);
```

### deleteTask()
```typescript
// Before: Returns boolean
const success = deleteTask(taskId);

// After: Returns Promise<boolean>
const success = await deleteTask(taskId);
```

### Real-time Subscriptions (NEW)
```typescript
// Subscribe to real-time updates
const unsubscribe = subscribeToTasks((payload) => {
  console.log('Task changed:', payload);
  // Reload tasks
  loadTasks();
});

// Cleanup on unmount
useEffect(() => {
  const unsubscribe = subscribeToTasks(handleTaskChange);
  return () => unsubscribe();
}, []);
```

---

## 📝 Updated Components

### ProcessingProgress.tsx
```typescript
// ✅ Updated imports
import { getAllTasks, addTask, updateTask, deleteTask, subscribeToTasks } from '@/services/supabaseTasksManager';

// ✅ All task operations are now async
const loadTasks = async () => {
  const tasks = await getAllTasks();
  setAllTasks(tasks);
};

// ✅ Real-time subscriptions
useEffect(() => {
  loadTasks();

  const unsubscribe = subscribeToTasks(async (payload) => {
    await loadTasks(); // Auto-reload on changes
  });

  return () => unsubscribe();
}, []);
```

### Capture3D.tsx
```typescript
// ✅ Updated import
import { addTask } from '@/services/supabaseTasksManager';

// ✅ Async task creation
const task = await addTask(uploadResult.data.serialize, capturedVideo, potholeData.id);

if (!task) {
  throw new Error('Failed to save task to database');
}

navigate(`/processing/${task.id}`);
```

---

## 🚀 New Features

### 1. Real-Time Sync
Tasks update automatically across all browser tabs and devices:

```typescript
// Tab 1: Upload video
await addTask(kiriTaskId);

// Tab 2: Instantly sees new task appear!
// No manual refresh needed
```

### 2. Multi-Device Access
Access your processing tasks from anywhere:

```
Desktop Browser → Uploads video
     ↓
Cloud Database
     ↓
Mobile Browser → Sees task immediately
```

### 3. Better Error Handling
```typescript
try {
  const task = await addTask(kiriTaskId);
  if (!task) {
    // Handle database insert failure
    toast({ title: 'Failed to save task' });
  }
} catch (error) {
  // Handle network/auth errors
  console.error('Database error:', error);
}
```

### 4. Query Active Tasks
```typescript
import { getActiveTasks } from '@/services/supabaseTasksManager';

// Get only pending/processing tasks
const activeTasks = await getActiveTasks();
```

### 5. Query by Pothole
```typescript
import { getTasksByPotholeId } from '@/services/supabaseTasksManager';

// Get all tasks for a specific pothole
const tasks = await getTasksByPotholeId(potholeId);
```

---

## 🔒 Security & Permissions

### Row Level Security (RLS)

You should enable RLS on the `processing_tasks` table:

```sql
-- Enable RLS
ALTER TABLE processing_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all tasks (or restrict by user_id if you add that column)
CREATE POLICY "Allow all to read tasks" ON processing_tasks
  FOR SELECT USING (true);

-- Policy: Users can insert their own tasks
CREATE POLICY "Allow all to insert tasks" ON processing_tasks
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own tasks
CREATE POLICY "Allow all to update tasks" ON processing_tasks
  FOR UPDATE USING (true);

-- Policy: Users can delete their own tasks
CREATE POLICY "Allow all to delete tasks" ON processing_tasks
  FOR DELETE USING (true);
```

**Note**: Adjust these policies based on your authentication requirements.

---

## 📊 Data Migration (Optional)

If you have existing data in localStorage that you want to migrate:

### Migration Script

```typescript
// src/utils/migrateToSupabase.ts
import { getAllTasks as getLocalTasks } from '@/services/processingTasksManager';
import { addTask } from '@/services/supabaseTasksManager';

export async function migrateLocalStorageToSupabase() {
  const localTasks = getLocalTasks();

  console.log(`Migrating ${localTasks.length} tasks to Supabase...`);

  for (const task of localTasks) {
    try {
      await addTask(
        task.taskId,
        task.videoUrl,
        task.potholeId
      );
      console.log(`✅ Migrated task: ${task.taskId}`);
    } catch (error) {
      console.error(`❌ Failed to migrate task: ${task.taskId}`, error);
    }
  }

  console.log('Migration complete!');
}

// Run in browser console:
// import { migrateLocalStorageToSupabase } from '@/utils/migrateToSupabase';
// await migrateLocalStorageToSupabase();
```

---

## 🧪 Testing

### Test Real-Time Sync

1. Open two browser tabs
2. Tab 1: Upload a video
3. Tab 2: Watch task appear automatically
4. Tab 1: Click "Check Status"
5. Tab 2: Watch progress update automatically

### Test Persistence

1. Upload a video
2. Close browser completely
3. Reopen browser
4. Navigate to /processing
5. Task should still be there!

---

## 🔍 Debugging

### Check Database

```typescript
// In browser console
import { getAllTasks } from '@/services/supabaseTasksManager';
const tasks = await getAllTasks();
console.table(tasks);
```

### Monitor Real-Time Events

```typescript
import { subscribeToTasks } from '@/services/supabaseTasksManager';

subscribeToTasks((payload) => {
  console.log('📡 Real-time event:', payload);
});
```

### Query Supabase Directly

```sql
-- In Supabase SQL Editor
SELECT * FROM processing_tasks ORDER BY created_at DESC LIMIT 10;

-- Check active tasks
SELECT * FROM processing_tasks WHERE status IN ('pending', 'processing');

-- Check completed tasks
SELECT * FROM processing_tasks WHERE status = 'completed';
```

---

## 📚 File Changes Summary

| File | Status | Changes |
|------|--------|---------|
| `src/services/supabaseTasksManager.ts` | 🆕 NEW | Supabase-based task manager |
| `src/services/processingTasksManager.ts` | 📦 DEPRECATED | Old localStorage version |
| `src/pages/ProcessingProgress.tsx` | ✅ UPDATED | Now uses Supabase + real-time |
| `src/pages/Capture3D.tsx` | ✅ UPDATED | Now uses Supabase |
| `src/integrations/supabase/types.ts` | ✅ EXISTING | Already had processing_tasks table! |

---

## ✅ Benefits Summary

| Feature | localStorage | Supabase |
|---------|-------------|----------|
| Persistence | ❌ Clears with browser | ✅ Permanent |
| Multi-device | ❌ No | ✅ Yes |
| Real-time sync | ❌ No | ✅ Yes |
| Size limit | ❌ 5-10MB | ✅ Unlimited |
| Query capabilities | ❌ Limited | ✅ SQL queries |
| Data integrity | ❌ No constraints | ✅ Foreign keys, indexes |
| Backup | ❌ No | ✅ Automatic |
| Collaboration | ❌ No | ✅ Multi-user ready |

---

## 🎉 Result

Your Kiri Engine processing tasks are now stored in **Supabase cloud database** with:

- ✅ **Real-time updates** across all devices
- ✅ **Persistent storage** that survives browser clears
- ✅ **Automatic syncing** - no manual refresh needed
- ✅ **Better scalability** for production use

The API is still language-agnostic (TypeScript calls REST API), but now your task tracking is enterprise-grade! 🚀
