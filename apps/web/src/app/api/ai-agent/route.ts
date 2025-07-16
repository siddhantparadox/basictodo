import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@basictodo/db';
import { processAIChat } from '@basictodo/utils/ai';
import { listTasks, createTask, updateTask, deleteTask } from '@basictodo/utils/tasks';
import { validateChatRequest, type Task } from '@basictodo/utils/schema';

/**
 * AI Agent API Route Handler
 * 
 * This Edge Function handles AI-powered task management:
 * 1. Receives user query + Supabase JWT
 * 2. Pulls user's relevant tasks from Supabase
 * 3. Calls OpenRouter Google Gemini with function schemas
 * 4. Executes returned function calls against Supabase REST
 * 5. Returns plain-text response
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { message } = validateChatRequest(body);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Initialize Supabase client with user's JWT
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch user's current tasks for context
    const tasks = await listTasks(supabase);

    // Process the AI chat request
    const aiResponse = await processAIChat({ message }, tasks);

    // Execute any tool calls returned by the AI
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const toolResults = [];

      for (const toolCall of aiResponse.toolCalls) {
        try {
          let result;

          switch (toolCall.function) {
            case 'create_task':
              result = await createTask(supabase, toolCall.arguments);
              toolResults.push({
                tool: 'create_task',
                success: true,
                data: result,
              });
              break;

            case 'update_task':
              const { task_id, ...updateData } = toolCall.arguments;
              result = await updateTask(supabase, task_id, updateData);
              toolResults.push({
                tool: 'update_task',
                success: true,
                data: result,
              });
              break;

            case 'delete_task':
              await deleteTask(supabase, toolCall.arguments.task_id);
              toolResults.push({
                tool: 'delete_task',
                success: true,
                data: { deleted: true },
              });
              break;

            case 'list_tasks':
              const { status, search, due_filter } = toolCall.arguments;
              const listOptions: { status?: 'pending' | 'done' } = {};
              
              if (status && (status === 'pending' || status === 'done')) {
                listOptions.status = status;
              }
              
              // Handle due_filter
              if (due_filter === 'today') {
                // This would need a custom implementation or filter in listTasks
                result = await listTasks(supabase, listOptions);
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                
                result = result.filter((task: Task) => {
                  if (!task.due_at) return false;
                  const dueDate = new Date(task.due_at);
                  return dueDate >= startOfDay && dueDate < endOfDay;
                });
              } else if (due_filter === 'overdue') {
                result = await listTasks(supabase, listOptions);
                const now = new Date();
                result = result.filter((task: Task) => {
                  if (!task.due_at || task.status === 'done') return false;
                  return new Date(task.due_at) < now;
                });
              } else if (due_filter === 'upcoming') {
                result = await listTasks(supabase, listOptions);
                const now = new Date();
                result = result.filter((task: Task) => {
                  if (!task.due_at || task.status === 'done') return false;
                  return new Date(task.due_at) > now;
                });
              } else {
                result = await listTasks(supabase, listOptions);
              }

              // Apply search filter if provided
              if (search) {
                result = result.filter((task: Task) => 
                  task.title.toLowerCase().includes(search.toLowerCase()) ||
                  (task.description && task.description.toLowerCase().includes(search.toLowerCase()))
                );
              }

              toolResults.push({
                tool: 'list_tasks',
                success: true,
                data: result,
              });
              break;

            default:
              toolResults.push({
                tool: toolCall.function,
                success: false,
                error: `Unknown function: ${toolCall.function}`,
              });
          }
        } catch (error) {
          console.error(`Error executing tool ${toolCall.function}:`, error);
          toolResults.push({
            tool: toolCall.function,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Return response with tool execution results
      return NextResponse.json({
        response: aiResponse.message,
        toolResults,
        executedTools: aiResponse.toolCalls.length,
      });
    }

    // Return simple AI response if no tools were called
    return NextResponse.json({
      response: aiResponse.message,
      toolResults: [],
      executedTools: 0,
    });

  } catch (error) {
    console.error('AI Agent Error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';