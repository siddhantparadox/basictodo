import type { Task, ChatRequestInput, ChatResponse } from './schema';

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'google/gemini-2.5-flash';

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

// Function schemas for Gemini function calling
const FUNCTION_SCHEMAS = [
  {
    name: 'create_task',
    description: 'Create a new task for the user',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title/description of the task',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of the task',
        },
        due_at: {
          type: 'string',
          format: 'date-time',
          description: 'Optional due date and time in ISO format',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority level',
        },
        category: {
          type: 'string',
          enum: ['personal', 'work', 'health', 'finance', 'education', 'shopping', 'other'],
          description: 'Task category',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for the task',
        },
        estimated_duration_minutes: {
          type: 'number',
          description: 'Estimated duration in minutes',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the task',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to update',
        },
        title: {
          type: 'string',
          description: 'New title for the task',
        },
        description: {
          type: 'string',
          description: 'New detailed description of the task',
        },
        status: {
          type: 'string',
          enum: ['pending', 'done'],
          description: 'New status for the task',
        },
        due_at: {
          type: 'string',
          format: 'date-time',
          description: 'New due date and time in ISO format',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'New task priority level',
        },
        category: {
          type: 'string',
          enum: ['personal', 'work', 'health', 'finance', 'education', 'shopping', 'other'],
          description: 'New task category',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags for the task',
        },
        estimated_duration_minutes: {
          type: 'number',
          description: 'New estimated duration in minutes',
        },
        notes: {
          type: 'string',
          description: 'New additional notes about the task',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    parameters: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to delete',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks with optional filters',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'done'],
          description: 'Filter tasks by status',
        },
        search: {
          type: 'string',
          description: 'Search tasks by title',
        },
        due_filter: {
          type: 'string',
          enum: ['today', 'overdue', 'upcoming'],
          description: 'Filter tasks by due date',
        },
      },
    },
  },
];

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
}

/**
 * Generate system prompt with current task context
 */
function generateSystemPrompt(tasks: Task[]): string {
  const now = new Date();
  const todayTasks = tasks.filter(task => {
    if (!task.due_at) return false;
    const dueDate = new Date(task.due_at);
    return dueDate.toDateString() === now.toDateString();
  });

  const overdueTasks = tasks.filter(task => {
    if (!task.due_at) return false;
    const dueDate = new Date(task.due_at);
    return dueDate < now && task.status === 'pending';
  });

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const doneTasks = tasks.filter(task => task.status === 'done');

  return `You are an AI assistant for BasicTodo, a task management application. You help users manage their tasks through natural conversation.

Current Context:
- Total tasks: ${tasks.length}
- Pending tasks: ${pendingTasks.length}
- Completed tasks: ${doneTasks.length}
- Due today: ${todayTasks.length}
- Overdue: ${overdueTasks.length}

Current time: ${now.toISOString()}

Available Functions:
- create_task: Create new tasks
- update_task: Modify existing tasks (title, status, due date)
- delete_task: Remove tasks
- list_tasks: Query tasks with filters

Guidelines:
1. Be conversational and helpful
2. When users mention dates/times, convert them to ISO format for due_at
3. Use relative time understanding (e.g., "tomorrow at 2pm", "next Monday")
4. Suggest task organization and productivity tips when appropriate
5. Always confirm actions before executing them
6. If a task ID is needed but not provided, ask the user to specify which task
7. Provide summaries of task lists in a readable format

Task Status:
- "pending": Task is not yet completed
- "done": Task is completed

Remember: You can only see and modify tasks for the current authenticated user.`;
}

/**
 * Call OpenRouter API with Gemini model
 */
async function callOpenRouter(
  messages: OpenRouterMessage[],
  functions?: typeof FUNCTION_SCHEMAS
): Promise<OpenRouterResponse> {
  const requestBody: any = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  };

  if (functions && functions.length > 0) {
    requestBody.tools = functions.map(func => ({
      type: 'function',
      function: func,
    }));
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://basictodo.app',
      'X-Title': 'BasicTodo AI Assistant',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Process AI chat request and return response with potential function calls
 */
export async function processAIChat(
  input: ChatRequestInput,
  tasks: Task[] = []
): Promise<{
  message: string;
  toolCalls?: Array<{
    id: string;
    function: string;
    arguments: any;
  }>;
}> {
  const systemPrompt = generateSystemPrompt(tasks);
  
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: input.message },
  ];

  try {
    const response = await callOpenRouter(messages, FUNCTION_SCHEMAS);
    const choice = response.choices[0];
    
    if (!choice) {
      throw new Error('No response from AI model');
    }

    const result: any = {
      message: choice.message.content || 'I apologize, but I couldn\'t process your request.',
    };

    // Process function calls if present
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map(call => ({
        id: call.id,
        function: call.function.name,
        arguments: JSON.parse(call.function.arguments),
      }));
    }

    return result;
  } catch (error) {
    console.error('AI processing error:', error);
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
    };
  }
}

/**
 * Generate a natural language summary of tasks
 */
export function generateTaskSummary(tasks: Task[]): string {
  if (tasks.length === 0) {
    return "You don't have any tasks yet. Would you like me to help you create some?";
  }

  const now = new Date();
  const pending = tasks.filter(t => t.status === 'pending');
  const done = tasks.filter(t => t.status === 'done');
  const overdue = tasks.filter(t => {
    if (!t.due_at || t.status === 'done') return false;
    return new Date(t.due_at) < now;
  });
  const dueToday = tasks.filter(t => {
    if (!t.due_at || t.status === 'done') return false;
    const dueDate = new Date(t.due_at);
    return dueDate.toDateString() === now.toDateString();
  });

  let summary = `You have ${tasks.length} total task${tasks.length === 1 ? '' : 's'}`;
  
  if (pending.length > 0) {
    summary += `, ${pending.length} pending`;
  }
  
  if (done.length > 0) {
    summary += `, ${done.length} completed`;
  }

  if (overdue.length > 0) {
    summary += `. ⚠️ ${overdue.length} task${overdue.length === 1 ? ' is' : 's are'} overdue`;
  }

  if (dueToday.length > 0) {
    summary += `. 📅 ${dueToday.length} task${dueToday.length === 1 ? ' is' : 's are'} due today`;
  }

  return summary + '.';
}

/**
 * Parse natural language date/time into ISO string
 */
export function parseNaturalDateTime(input: string): string | null {
  const now = new Date();
  const lowerInput = input.toLowerCase().trim();

  // Handle "today" with optional time
  if (lowerInput.includes('today')) {
    const timeMatch = lowerInput.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const isPM = timeMatch[3]?.toLowerCase() === 'pm';
      
      const date = new Date(now);
      date.setHours(isPM && hour !== 12 ? hour + 12 : hour === 12 && !isPM ? 0 : hour);
      date.setMinutes(minute);
      date.setSeconds(0);
      date.setMilliseconds(0);
      
      return date.toISOString();
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).toISOString();
  }

  // Handle "tomorrow"
  if (lowerInput.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return tomorrow.toISOString();
  }

  // Handle "next week"
  if (lowerInput.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 0, 0);
    return nextWeek.toISOString();
  }

  // Try to parse as a regular date
  try {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Retry wrapper for AI calls with exponential backoff
 */
export async function retryAICall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}