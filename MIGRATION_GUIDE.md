# Migration Guide: localStorage → Supabase

## 🎯 Goal
Migrate processing task tracking from localStorage to Supabase for better persistence and cross-device sync.

---

## 📋 Prerequisites

✅ Database structure updated (see `DATABASE_UPDATES_SUMMARY.md`)  
✅ TypeScript types generated  
✅ RLS policies in place  
✅ Indexes created  

---

## 🔄 Step-by-Step Migration

### Step 1: Create Supabase Helper Service

Create: `/src/services/supabaseTasksManager.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type ProcessingTask = Tables<'processing_tasks'>;
export type ProcessingTaskInsert = TablesInsert<'processing_tasks'>;
export type ProcessingTaskUpdate = TablesUpdate<'processing_tasks'>;

/**
 * Create a new processing task in Supabase
 */
export async function createTask(
  kiriTaskId: string,
  potholeId: string,
  videoUrl?: string
): Promise<ProcessingTask> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .insert({
      pothole_id: potholeId,
      kiri_task_id: kiriTaskId,
      status: 'pending',
      progress: 0,
      status_message: 'Initializing...',
      video_url: videoUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all processing tasks
 */
export async function getAllTasks(): Promise<ProcessingTask[]> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific task by ID
 */
export async function getTaskById(id: string): Promise<ProcessingTask | null> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get task by Kiri Engine task ID
 */
export async function getTaskByKiriId(kiriTaskId: string): Promise<ProcessingTask | null> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .select('*')
    .eq('kiri_task_id', kiriTaskId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  updates: ProcessingTaskUpdate
): Promise<ProcessingTask | null> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('processing_tasks')
    .delete()
    .eq('id', id);

  return !error;
}

/**
 * Clear completed and failed tasks
 */
export async function clearCompletedTasks(): Promise<void> {
  await supabase
    .from('processing_tasks')
    .delete()
    .in('status', ['completed', 'failed']);
}

/**
 * Get active tasks (pending or processing)
 */
export async function getActiveTasks(): Promise<ProcessingTask[]> {
  const { data, error } = await supabase
    .from('processing_tasks')
    .select('*')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Subscribe to task updates (real-time)
 */
export function subscribeToTasks(
  callback: (task: ProcessingTask) => void
) {
  return supabase
    .channel('processing_tasks_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'processing_tasks',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as ProcessingTask);
        }
      }
    )
    .subscribe();
}
```

---

### Step 2: Update Capture3D.tsx

Replace localStorage usage with Supabase:

```typescript
// OLD CODE (lines 270-333)
import { addTask } from '@/services/processingTasksManager';

// Inside processGaussianSplatting():
const task = addTask(uploadResult.data.serialize, capturedVideo, potholeData.id);
navigate(`/processing/${task.id}`);

// NEW CODE
import { createTask } from '@/services/supabaseTasksManager';

// Inside processGaussianSplatting():
try {
  const task = await createTask(
    uploadResult.data.serialize,
    potholeData.id,
    capturedVideo // You may want to upload this to storage first
  );
  
  toast({
    title: 'Upload successful',
    description: 'Your video is now being processed by Kiri Engine',
  });

  navigate(`/processing/${task.id}`);
} catch (error) {
  console.error('Error creating task:', error);
  toast({
    variant: 'destructive',
    title: 'Failed to create task',
    description: 'Could not track processing status',
  });
}
```

---

### Step 3: Update ProcessingProgress.tsx

Replace localStorage with Supabase queries:

```typescript
// OLD CODE (lines 30-41)
const loadTasks = () => {
  const allTasks = getAllTasks(); // from processingTasksManager
  setTasks(allTasks);
  // ...
};

// NEW CODE
import { 
  getAllTasks, 
  getTaskById, 
  updateTask,
  deleteTask,
  clearCompletedTasks 
} from '@/services/supabaseTasksManager';

const loadTasks = async () => {
  try {
    const allTasks = await getAllTasks();
    setTasks(allTasks);

    // If there's a taskId in URL, select that task
    if (taskId) {
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    toast({
      variant: 'destructive',
      title: 'Failed to load tasks',
      description: 'Could not fetch processing tasks',
    });
  }
};

// Update refreshActiveTasks to use Supabase
const refreshActiveTasks = async () => {
  try {
    const allTasks = await getAllTasks();
    const activeTasks = allTasks.filter(
      task => task.status === 'pending' || task.status === 'processing'
    );

    if (activeTasks.length === 0) return;

    for (const task of activeTasks) {
      try {
        const status = await checkTaskStatus(task.kiri_task_id);

        if (status.status === 'completed' && task.status !== 'completed' && task.pothole_id) {
          try {
            const { downloadAndUpload3DModel } = await import('@/services/kiriEngine');
            const modelUrl = await downloadAndUpload3DModel(status.result!.modelUrl, task.pothole_id);

            // Update pothole record
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase
              .from('potholes')
              .update({ model_url: modelUrl })
              .eq('id', task.pothole_id);

            // Update task in Supabase
            await updateTask(task.id, {
              status: 'completed',
              progress: 100,
              status_message: 'Model uploaded successfully!',
              model_url: modelUrl,
            });
          } catch (uploadError) {
            console.error(`Error uploading model:`, uploadError);
            await updateTask(task.id, {
              status: 'failed',
              progress: 100,
              status_message: 'Model processing completed but upload failed',
              error_message: uploadError instanceof Error ? uploadError.message : 'Upload failed'
            });
          }
        } else {
          await updateTask(task.id, {
            status: status.status,
            progress: status.progress,
            status_message: `${status.status.charAt(0).toUpperCase() + status.status.slice(1)}...`,
            error_message: status.error
          });
        }
      } catch (error) {
        console.error(`Error checking status for task ${task.id}:`, error);
      }
    }

    await loadTasks();
  } catch (error) {
    console.error('Error refreshing tasks:', error);
  }
};

// Update handleDeleteTask
const handleDeleteTask = async (taskId: string) => {
  const success = await deleteTask(taskId);
  if (success) {
    await loadTasks();
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    toast({
      title: 'Task deleted',
      description: 'Processing task removed',
    });
  }
};

// Update handleClearCompleted
const handleClearCompleted = async () => {
  await clearCompletedTasks();
  await loadTasks();
  setSelectedTask(null);
  toast({
    title: 'Cleared',
    description: 'Completed tasks removed',
  });
};
```

---

### Step 4: Add Real-time Updates (Optional)

Enable real-time task updates:

```typescript
// In ProcessingProgress.tsx

import { subscribeToTasks } from '@/services/supabaseTasksManager';

useEffect(() => {
  // Load initial tasks
  loadTasks();

  // Subscribe to real-time updates
  const subscription = subscribeToTasks((updatedTask) => {
    setTasks(prevTasks => {
      const index = prevTasks.findIndex(t => t.id === updatedTask.id);
      if (index >= 0) {
        // Update existing task
        const newTasks = [...prevTasks];
        newTasks[index] = updatedTask;
        return newTasks;
      } else {
        // Add new task
        return [updatedTask, ...prevTasks];
      }
    });
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

### Step 5: Migrate Existing localStorage Data (One-time)

Create a migration utility:

```typescript
// /src/utils/migrateLocalStorageTasks.ts

import { supabase } from '@/integrations/supabase/client';
import { getAllTasks as getLocalTasks } from '@/services/processingTasksManager';

export async function migrateLocalStorageToSupabase() {
  try {
    // Get tasks from localStorage
    const localTasks = getLocalTasks();
    
    if (localTasks.length === 0) {
      console.log('No tasks to migrate');
      return;
    }

    console.log(`Migrating ${localTasks.length} tasks to Supabase...`);

    for (const task of localTasks) {
      // Check if task already exists
      const { data: existing } = await supabase
        .from('processing_tasks')
        .select('id')
        .eq('kiri_task_id', task.taskId)
        .single();

      if (!existing) {
        // Insert into Supabase
        await supabase
          .from('processing_tasks')
          .insert({
            pothole_id: task.potholeId || null,
            kiri_task_id: task.taskId,
            status: task.status,
            progress: task.progress,
            status_message: task.statusMessage,
            error_message: task.error,
            video_url: task.videoUrl,
            model_url: task.modelUrl,
            created_at: task.createdAt,
          });
        
        console.log(`✓ Migrated task ${task.id}`);
      }
    }

    console.log('✅ Migration complete!');
    
    // Optional: Clear localStorage after successful migration
    // localStorage.removeItem('eyeway_processing_tasks');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
```

Run migration once:

```typescript
// In App.tsx or main entry point

import { migrateLocalStorageToSupabase } from '@/utils/migrateLocalStorageTasks';

useEffect(() => {
  // Run migration on first load
  const hasRunMigration = localStorage.getItem('tasks_migrated');
  if (!hasRunMigration) {
    migrateLocalStorageToSupabase()
      .then(() => {
        localStorage.setItem('tasks_migrated', 'true');
      })
      .catch(console.error);
  }
}, []);
```

---

### Step 6: Optional Video Storage

Upload videos to Supabase Storage instead of using blob URLs:

```typescript
// In Capture3D.tsx

async function uploadVideoToStorage(videoBlob: Blob, potholeId: string): Promise<string> {
  const fileName = `pothole_${potholeId}_${Date.now()}.webm`;
  const filePath = `pothole-videos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('videos') // Create this bucket first
    .upload(filePath, videoBlob, {
      contentType: 'video/webm',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Usage in processGaussianSplatting:
const videoStorageUrl = await uploadVideoToStorage(videoBlob, potholeData.id);

// Update pothole record
await supabase
  .from('potholes')
  .update({ video_url: videoStorageUrl })
  .eq('id', potholeData.id);

// Create task with storage URL
const task = await createTask(
  uploadResult.data.serialize,
  potholeData.id,
  videoStorageUrl // Use storage URL instead of blob URL
);
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] New tasks are created in Supabase
- [ ] Task list loads from Supabase
- [ ] Status updates persist across page refresh
- [ ] Multiple devices see same tasks (if logged in)
- [ ] Real-time updates work (if implemented)
- [ ] Old localStorage tasks migrated successfully
- [ ] Videos upload to storage (if implemented)
- [ ] Error handling works properly
- [ ] Toast notifications show correctly
- [ ] Navigation to processing page works

---

## 🐛 Troubleshooting

### Issue: Tasks not appearing
**Solution**: Check RLS policies, ensure anon key has read access

### Issue: Cannot create tasks
**Solution**: Check RLS policies, ensure anon/auth can insert

### Issue: Real-time not working
**Solution**: Enable Realtime in Supabase dashboard for `processing_tasks` table

### Issue: Migration fails
**Solution**: Check console logs, ensure Supabase connection is working

---

## 🔄 Rollback Plan

If issues occur, you can temporarily revert:

```typescript
// Keep both systems running in parallel
import { getAllTasks as getLocalTasks } from '@/services/processingTasksManager';
import { getAllTasks as getSupabaseTasks } from '@/services/supabaseTasksManager';

// Use Supabase, fallback to localStorage
const tasks = await getSupabaseTasks().catch(() => getLocalTasks());
```

---

## 📊 Expected Benefits

✅ **Persistence**: Tasks survive browser refresh and data clearing  
✅ **Sync**: Same tasks across all devices  
✅ **History**: Track all processing attempts  
✅ **Performance**: Indexed queries, faster than localStorage  
✅ **Security**: Proper access control with RLS  
✅ **Real-time**: Optional live updates  

---

## 🎯 Timeline

**Phase 1** (Immediate):
- Create Supabase helper service
- Update Capture3D to use Supabase
- Update ProcessingProgress to use Supabase

**Phase 2** (Next):
- Migrate existing localStorage data
- Add real-time subscriptions
- Implement video storage

**Phase 3** (Future):
- Remove localStorage fallback
- Add analytics on task success rates
- Implement retry mechanisms

---

*Ready to migrate? Follow the steps above in order!* 🚀

