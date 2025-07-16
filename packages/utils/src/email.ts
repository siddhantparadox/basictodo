import { Resend } from 'resend';
import type { Task, UserPreferences, EmailReminderInput } from './schema';

// Initialize Resend client
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

const resend = new Resend(RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = 'BasicTodo <noreply@basictodo.app>';
const REPLY_TO = 'support@basictodo.app';

/**
 * Default email template for task reminders
 */
const DEFAULT_REMINDER_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder - BasicTodo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563EB;
      margin-bottom: 8px;
    }
    .task-card {
      background: #f8f9fa;
      border-left: 4px solid #2563EB;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .task-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .task-due {
      color: #6b7280;
      font-size: 14px;
    }
    .overdue {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .overdue .task-due {
      color: #dc2626;
      font-weight: 600;
    }
    .cta {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background: #2563EB;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">BasicTodo</div>
      <p>Task Reminder</p>
    </div>
    
    <p>Hi there!</p>
    <p>You have {{TASK_COUNT}} task{{TASK_COUNT_PLURAL}} that need{{TASK_COUNT_SINGULAR}} your attention:</p>
    
    {{TASK_LIST}}
    
    <div class="cta">
      <a href="https://basictodo.app" class="button">View Your Tasks</a>
    </div>
    
    <p>Stay productive!</p>
    
    <div class="footer">
      <p>You're receiving this because you have email reminders enabled in BasicTodo.</p>
      <p><a href="https://basictodo.app/settings">Manage your notification preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Format a task for email display
 */
function formatTaskForEmail(task: Task, isOverdue: boolean = false): string {
  const dueText = task.due_at 
    ? `Due: ${new Date(task.due_at).toLocaleString()}`
    : 'No due date';
    
  const cardClass = isOverdue ? 'task-card overdue' : 'task-card';
  
  return `
    <div class="${cardClass}">
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-due">${dueText}</div>
    </div>
  `;
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = { innerHTML: '' } as any;
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate email HTML from template and tasks
 */
function generateEmailHtml(tasks: Task[], template: string = DEFAULT_REMINDER_TEMPLATE): string {
  const now = new Date();
  const overdueTasks = tasks.filter(task => {
    if (!task.due_at) return false;
    return new Date(task.due_at) < now;
  });

  const taskListHtml = tasks
    .map(task => {
      const isOverdue = task.due_at ? new Date(task.due_at) < now : false;
      return formatTaskForEmail(task, isOverdue);
    })
    .join('');

  const taskCount = tasks.length;
  const isPlural = taskCount !== 1;

  return template
    .replace(/{{TASK_COUNT}}/g, taskCount.toString())
    .replace(/{{TASK_COUNT_PLURAL}}/g, isPlural ? 's' : '')
    .replace(/{{TASK_COUNT_SINGULAR}}/g, isPlural ? '' : 's')
    .replace(/{{TASK_LIST}}/g, taskListHtml);
}

/**
 * Send a task reminder email
 */
export async function sendTaskReminder(
  to: string,
  tasks: Task[],
  preferences?: UserPreferences
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (tasks.length === 0) {
      return { success: false, error: 'No tasks to remind about' };
    }

    const template = preferences?.email_template || DEFAULT_REMINDER_TEMPLATE;
    const html = generateEmailHtml(tasks, template);
    
    const taskCount = tasks.length;
    const subject = taskCount === 1 
      ? 'Task Reminder: 1 task needs your attention'
      : `Task Reminder: ${taskCount} tasks need your attention`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: REPLY_TO,
      tags: [
        { name: 'type', value: 'task-reminder' },
        { name: 'task-count', value: taskCount.toString() },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(
  to: string,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to BasicTodo</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2563EB;
            margin-bottom: 16px;
          }
          .cta {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            display: inline-block;
            background: #2563EB;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          }
          .features {
            margin: 24px 0;
          }
          .feature {
            margin: 16px 0;
            padding-left: 24px;
            position: relative;
          }
          .feature::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">BasicTodo</div>
            <h1>Welcome${userName ? `, ${userName}` : ''}!</h1>
          </div>
          
          <p>Thanks for joining BasicTodo! We're excited to help you stay organized and productive.</p>
          
          <div class="features">
            <div class="feature">Create and manage tasks with natural language</div>
            <div class="feature">Get AI-powered assistance with your todo list</div>
            <div class="feature">Receive email reminders for upcoming tasks</div>
            <div class="feature">Access your tasks from anywhere</div>
          </div>
          
          <div class="cta">
            <a href="https://basictodo.app" class="button">Get Started</a>
          </div>
          
          <p>If you have any questions, just reply to this email. We're here to help!</p>
          
          <p>Happy organizing!<br>The BasicTodo Team</p>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to BasicTodo!',
      html,
      replyTo: REPLY_TO,
      tags: [
        { name: 'type', value: 'welcome' },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email delivery status (if supported by Resend)
 */
export async function getEmailStatus(messageId: string): Promise<{
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'unknown';
  error?: string;
}> {
  try {
    // Note: This would require Resend webhook setup for real-time status
    // For now, we'll return a basic response
    return { status: 'sent' };
  } catch (error) {
    return { 
      status: 'unknown', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Retry email sending with exponential backoff
 */
export async function retryEmailSend<T>(
  emailFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await emailFn();
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

/**
 * Batch send emails (useful for multiple reminders)
 */
export async function batchSendEmails(
  emails: Array<{
    to: string;
    tasks: Task[];
    preferences?: UserPreferences;
  }>,
  batchSize: number = 10
): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
  const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (email) => {
      const result = await sendTaskReminder(email.to, email.tasks, email.preferences);
      return { to: email.to, ...result };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          to: batch[index].to,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}