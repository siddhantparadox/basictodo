// Re-export client-safe utilities only
export * from './supabase';
export * from './schema';
export * from './tasks';

// Type-only exports
export type { Database } from '@basictodo/db';

// Note: AI and email utilities are server-only
// Import them directly: import { processAIChat } from '@basictodo/utils/ai'
// Import them directly: import { sendTaskReminder } from '@basictodo/utils/email'