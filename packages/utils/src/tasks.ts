import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@basictodo/db';
import { 
  CreateTaskInput, 
  UpdateTaskInput, 
  Task, 
  TaskStatus,
  validateCreateTask,
  validateUpdateTask 
} from './schema';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * List all tasks for the authenticated user
 */
export async function listTasks(
  supabase: SupabaseClientType,
  options?: {
    status?: TaskStatus;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'updated_at' | 'due_at';
    orderDirection?: 'asc' | 'desc';
  }
): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*');

  // Apply filters
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  // Apply ordering
  const orderBy = options?.orderBy || 'created_at';
  const orderDirection = options?.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific task by ID
 */
export async function getTask(
  supabase: SupabaseClientType,
  taskId: string
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Task not found
    }
    throw new Error(`Failed to get task: ${error.message}`);
  }

  return data;
}

/**
 * Create a new task
 */
export async function createTask(
  supabase: SupabaseClientType,
  input: CreateTaskInput
): Promise<Task> {
  const validatedInput = validateCreateTask(input);

  // Get current user to set user_id
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User must be authenticated to create tasks');
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: validatedInput.title,
      due_at: validatedInput.due_at || null,
      status: 'pending' as const,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing task
 */
export async function updateTask(
  supabase: SupabaseClientType,
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const validatedInput = validateUpdateTask(input);

  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...validatedInput,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Task not found');
    }
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data;
}

/**
 * Delete a task
 */
export async function deleteTask(
  supabase: SupabaseClientType,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

/**
 * Mark a task as done
 */
export async function markTaskDone(
  supabase: SupabaseClientType,
  taskId: string
): Promise<Task> {
  return updateTask(supabase, taskId, { status: 'done' });
}

/**
 * Mark a task as pending
 */
export async function markTaskPending(
  supabase: SupabaseClientType,
  taskId: string
): Promise<Task> {
  return updateTask(supabase, taskId, { status: 'pending' });
}

/**
 * Get tasks due within a specific time window (for reminders)
 */
export async function getTasksDueWithin(
  supabase: SupabaseClientType,
  minutes: number,
  status: TaskStatus = 'pending'
): Promise<Task[]> {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', status)
    .not('due_at', 'is', null)
    .gte('due_at', now.toISOString())
    .lte('due_at', futureTime.toISOString())
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get tasks due within ${minutes} minutes: ${error.message}`);
  }

  return data || [];
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(
  supabase: SupabaseClientType,
  status: TaskStatus = 'pending'
): Promise<Task[]> {
  const now = new Date();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', status)
    .not('due_at', 'is', null)
    .lt('due_at', now.toISOString())
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get overdue tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get tasks for today
 */
export async function getTodayTasks(
  supabase: SupabaseClientType,
  status?: TaskStatus
): Promise<Task[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  let query = supabase
    .from('tasks')
    .select('*')
    .not('due_at', 'is', null)
    .gte('due_at', startOfDay.toISOString())
    .lt('due_at', endOfDay.toISOString());

  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('due_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get today's tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Search tasks by title
 */
export async function searchTasks(
  supabase: SupabaseClientType,
  searchTerm: string,
  options?: {
    status?: TaskStatus;
    limit?: number;
  }
): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .ilike('title', `%${searchTerm}%`);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to search tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Get task statistics for the user
 */
export async function getTaskStats(
  supabase: SupabaseClientType
): Promise<{
  total: number;
  pending: number;
  done: number;
  overdue: number;
  dueToday: number;
}> {
  const [allTasks, overdueTasks, todayTasks] = await Promise.all([
    listTasks(supabase),
    getOverdueTasks(supabase),
    getTodayTasks(supabase, 'pending'),
  ]);

  const pending = allTasks.filter(task => task.status === 'pending').length;
  const done = allTasks.filter(task => task.status === 'done').length;

  return {
    total: allTasks.length,
    pending,
    done,
    overdue: overdueTasks.length,
    dueToday: todayTasks.length,
  };
}