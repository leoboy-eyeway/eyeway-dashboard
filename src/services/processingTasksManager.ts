/**
 * Local storage manager for tracking processing tasks
 */

export interface ProcessingTask {
  id: string;
  taskId: string; // Kiri Engine task ID
  potholeId?: string; // Associated pothole ID
  videoUrl?: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  statusMessage?: string;
  error?: string;
  modelUrl?: string; // URL of uploaded 3D model
}

const STORAGE_KEY = 'eyeway_processing_tasks';

/**
 * Get all processing tasks from local storage
 */
export function getAllTasks(): ProcessingTask[] {
  try {
    const tasksJson = localStorage.getItem(STORAGE_KEY);
    if (!tasksJson) return [];
    return JSON.parse(tasksJson);
  } catch (error) {
    console.error('Error reading tasks from storage:', error);
    return [];
  }
}

/**
 * Get a specific task by ID
 */
export function getTaskById(id: string): ProcessingTask | null {
  const tasks = getAllTasks();
  return tasks.find(task => task.id === id) || null;
}

/**
 * Get a task by Kiri Engine task ID
 */
export function getTaskByKiriId(taskId: string): ProcessingTask | null {
  const tasks = getAllTasks();
  return tasks.find(task => task.taskId === taskId) || null;
}

/**
 * Add a new processing task
 */
export function addTask(taskId: string, videoUrl?: string, potholeId?: string): ProcessingTask {
  const tasks = getAllTasks();
  const newTask: ProcessingTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    potholeId,
    videoUrl,
    createdAt: new Date().toISOString(),
    status: 'pending',
    progress: 0,
    statusMessage: 'Initializing...'
  };

  tasks.unshift(newTask); // Add to beginning of array
  saveTasks(tasks);
  return newTask;
}

/**
 * Update an existing task
 */
export function updateTask(id: string, updates: Partial<ProcessingTask>): ProcessingTask | null {
  const tasks = getAllTasks();
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) return null;

  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  saveTasks(tasks);
  return tasks[taskIndex];
}

/**
 * Delete a task
 */
export function deleteTask(id: string): boolean {
  const tasks = getAllTasks();
  const filteredTasks = tasks.filter(task => task.id !== id);

  if (filteredTasks.length === tasks.length) return false;

  saveTasks(filteredTasks);
  return true;
}

/**
 * Clear all completed or failed tasks
 */
export function clearCompletedTasks(): void {
  const tasks = getAllTasks();
  const activeTasks = tasks.filter(task =>
    task.status === 'pending' || task.status === 'processing'
  );
  saveTasks(activeTasks);
}

/**
 * Save tasks to local storage
 */
function saveTasks(tasks: ProcessingTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to storage:', error);
  }
}
