# @basictodo/utils

Shared utilities package for BasicTodo application. Contains server-safe helpers for Supabase client management, data validation, AI integration, task operations, and email handling.

## Features

- **Supabase Client Management**: Browser-safe and server-only clients with JWT token support
- **Zod Schema Validation**: Type-safe validation for all data structures
- **Task Operations**: Complete CRUD operations for task management
- **AI Integration**: OpenRouter/Gemini integration with function calling
- **Email Services**: Resend integration for task reminders and notifications

## Installation

This package is part of the BasicTodo monorepo and is installed automatically via workspace dependencies.

## Usage

### Supabase Client

```typescript
import { supabase, supabaseAdmin, createSupabaseClient } from '@basictodo/utils';

// Browser-safe client (uses anon key)
const { data: tasks } = await supabase.from('tasks').select('*');

// Server-only client (uses service role key)
const { data: allTasks } = await supabaseAdmin?.from('tasks').select('*');

// Client with specific JWT token
const userClient = createSupabaseClient(userJWT);
```

### Schema Validation

```typescript
import { validateCreateTask, validateUpdateTask, TaskSchema } from '@basictodo/utils';

// Validate input data
const taskInput = validateCreateTask({
  title: 'New task',
  due_at: '2024-01-01T12:00:00Z'
});

// Validate database response
const task = TaskSchema.parse(dbResponse);
```

### Task Operations

```typescript
import { 
  listTasks, 
  createTask, 
  updateTask, 
  deleteTask,
  getTodayTasks,
  getOverdueTasks 
} from '@basictodo/utils';

// List all tasks
const tasks = await listTasks(supabase, {
  status: 'pending',
  orderBy: 'due_at',
  limit: 10
});

// Create a new task
const newTask = await createTask(supabase, {
  title: 'Complete project',
  due_at: '2024-01-01T12:00:00Z'
});

// Get today's tasks
const todayTasks = await getTodayTasks(supabase);
```

### AI Integration

```typescript
import { processAIChat, generateTaskSummary } from '@basictodo/utils';

// Process user chat message
const response = await processAIChat({
  message: 'Create a task to buy groceries tomorrow',
  context: { tasks: userTasks }
});

// Generate task summary
const summary = generateTaskSummary(tasks);
```

### Email Services

```typescript
import { sendTaskReminder, sendWelcomeEmail } from '@basictodo/utils';

// Send task reminder
const result = await sendTaskReminder(
  'user@example.com',
  dueTasks,
  userPreferences
);

// Send welcome email
const welcomeResult = await sendWelcomeEmail('user@example.com', 'John');
```

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_key

# Resend Email
RESEND_API_KEY=your_resend_key
```

## API Reference

### Supabase Utilities

- `supabase` - Browser-safe Supabase client
- `supabaseAdmin` - Server-only Supabase client with elevated permissions
- `createSupabaseClient(token)` - Create client with specific JWT token
- `getCurrentUser(client)` - Get current authenticated user
- `isAuthenticated(client)` - Check if user is authenticated

### Schema Validation

- `TaskSchema` - Task data validation schema
- `CreateTaskSchema` - Task creation input validation
- `UpdateTaskSchema` - Task update input validation
- `UserPreferencesSchema` - User preferences validation
- `ChatRequestSchema` - AI chat request validation
- Various validation helper functions

### Task Operations

- `listTasks(client, options)` - List tasks with filtering and pagination
- `getTask(client, id)` - Get specific task by ID
- `createTask(client, input)` - Create new task
- `updateTask(client, id, input)` - Update existing task
- `deleteTask(client, id)` - Delete task
- `markTaskDone(client, id)` - Mark task as completed
- `markTaskPending(client, id)` - Mark task as pending
- `getTasksDueWithin(client, minutes)` - Get tasks due within timeframe
- `getOverdueTasks(client)` - Get overdue tasks
- `getTodayTasks(client)` - Get today's tasks
- `searchTasks(client, term)` - Search tasks by title
- `getTaskStats(client)` - Get task statistics

### AI Integration

- `processAIChat(input, tasks)` - Process AI chat with function calling
- `generateTaskSummary(tasks)` - Generate natural language task summary
- `parseNaturalDateTime(input)` - Parse natural language dates
- `retryAICall(fn, retries)` - Retry AI calls with backoff

### Email Services

- `sendTaskReminder(to, tasks, preferences)` - Send task reminder email
- `sendWelcomeEmail(to, name)` - Send welcome email to new users
- `isValidEmail(email)` - Validate email format
- `getEmailStatus(messageId)` - Get email delivery status
- `retryEmailSend(fn, retries)` - Retry email sending
- `batchSendEmails(emails, batchSize)` - Send multiple emails in batches

## Types

All TypeScript types are exported from the main package:

```typescript
import type { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput,
  UserPreferences,
  ChatMessage,
  ChatRequestInput,
  ApiResponse,
  Database 
} from '@basictodo/utils';
```

## Error Handling

All utilities include proper error handling and throw descriptive errors. Use try-catch blocks when calling these functions:

```typescript
try {
  const task = await createTask(supabase, taskInput);
} catch (error) {
  console.error('Failed to create task:', error.message);
}
```

## Development

To build the package:

```bash
pnpm build
```

To run in development mode:

```bash
pnpm dev
```

To run type checking:

```bash
pnpm type-check