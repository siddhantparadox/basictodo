-- Add enhanced task fields migration
-- This adds priority, category, tags, estimated_duration_minutes, and notes to the tasks table

-- Create custom types for priority and category
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_category AS ENUM ('personal', 'work', 'health', 'finance', 'education', 'shopping', 'other');

-- Add new columns to tasks table
ALTER TABLE tasks 
ADD COLUMN priority task_priority DEFAULT 'medium',
ADD COLUMN category task_category DEFAULT 'personal',
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN estimated_duration_minutes INTEGER,
ADD COLUMN notes TEXT;

-- Create indexes for the new columns for better query performance
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);