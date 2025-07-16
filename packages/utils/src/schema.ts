import { z } from 'zod';

// Task enums matching database
export const TaskStatus = z.enum(['pending', 'done']);
export const TaskPriority = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskCategory = z.enum(['personal', 'work', 'health', 'finance', 'education', 'shopping', 'other']);

export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskPriority = z.infer<typeof TaskPriority>;
export type TaskCategory = z.infer<typeof TaskCategory>;

// Base task schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
  description: z.string().nullable(),
  due_at: z.string().datetime().nullable(),
  status: TaskStatus,
  priority: TaskPriority.nullable(),
  category: TaskCategory.nullable(),
  tags: z.array(z.string()).nullable(),
  estimated_duration_minutes: z.number().int().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_reminder_sent: z.string().datetime().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

// Task creation schema (for API inputs)
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
  description: z.string().optional(),
  due_at: z.union([
    z.string().datetime(), // ISO datetime string
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid datetime format'), // datetime-local format
    z.null()
  ]).optional(),
  priority: TaskPriority.optional(),
  category: TaskCategory.optional(),
  tags: z.array(z.string()).optional(),
  estimated_duration_minutes: z.number().int().min(1).max(1440).optional().or(z.nan().transform(() => undefined)), // 1 minute to 24 hours
  notes: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// Task update schema (for API inputs)
export const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Task title too long').optional(),
  description: z.string().optional(),
  due_at: z.union([
    z.string().datetime(), // ISO datetime string
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Invalid datetime format'), // datetime-local format
    z.null()
  ]).optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  category: TaskCategory.optional(),
  tags: z.array(z.string()).optional(),
  estimated_duration_minutes: z.number().int().min(1).max(1440).optional().or(z.nan().transform(() => undefined)),
  notes: z.string().optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// User preferences schema
export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  lead_time_minutes: z.number().int().min(5).max(1440), // 5 minutes to 24 hours
  reminder_enabled: z.boolean(),
  email_template: z.string().min(1).max(1000),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// User preferences update schema
export const UpdateUserPreferencesSchema = z.object({
  lead_time_minutes: z.number().int().min(5).max(1440).optional(),
  reminder_enabled: z.boolean().optional(),
  email_template: z.string().min(1).max(1000).optional(),
});

export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesSchema>;

// Auth schemas
export const SignInWithOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: "Either email or phone is required",
    path: ["email"],
  }
);

export type SignInWithOtpInput = z.infer<typeof SignInWithOtpSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  token: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['signup', 'magiclink', 'recovery', 'invite', 'email_change', 'phone_change']),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

// AI Chat schemas
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message content is required'),
  timestamp: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  context: z.object({
    tasks: z.array(TaskSchema).optional(),
    preferences: UserPreferencesSchema.optional(),
  }).optional(),
});

export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  message: z.string(),
  actions: z.array(z.object({
    type: z.enum(['create_task', 'update_task', 'delete_task', 'list_tasks']),
    data: z.any(),
  })).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// API Response schemas
export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
});

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema]);

export type ApiResponse<T = any> = {
  success: true;
  data: T;
  message?: string;
} | {
  success: false;
  error: string;
  code?: string;
};

// Email reminder schema
export const EmailReminderSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  task: TaskSchema,
});

export type EmailReminderInput = z.infer<typeof EmailReminderSchema>;

// Validation helpers
export function validateTask(data: unknown): Task {
  return TaskSchema.parse(data);
}

export function validateCreateTask(data: unknown): CreateTaskInput {
  return CreateTaskSchema.parse(data);
}

export function validateUpdateTask(data: unknown): UpdateTaskInput {
  return UpdateTaskSchema.parse(data);
}

export function validateUserPreferences(data: unknown): UserPreferences {
  return UserPreferencesSchema.parse(data);
}

export function validateUpdateUserPreferences(data: unknown): UpdateUserPreferencesInput {
  return UpdateUserPreferencesSchema.parse(data);
}

export function validateChatRequest(data: unknown): ChatRequestInput {
  return ChatRequestSchema.parse(data);
}

export function validateEmailReminder(data: unknown): EmailReminderInput {
  return EmailReminderSchema.parse(data);
}

export function validateSignInWithOtp(data: unknown): SignInWithOtpInput {
  return SignInWithOtpSchema.parse(data);
}

export function validateVerifyOtp(data: unknown): VerifyOtpInput {
  return VerifyOtpSchema.parse(data);
}