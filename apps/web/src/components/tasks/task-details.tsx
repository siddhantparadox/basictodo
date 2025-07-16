"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, Timer, Tag, FileText, Folder, Flag, User, Edit2, Trash2 } from "lucide-react"
import { Task, TaskPriority, TaskCategory } from "@basictodo/utils"

interface TaskDetailsProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string; icon: string }> = {
  low: { label: 'Low Priority', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: '🔵' },
  medium: { label: 'Medium Priority', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🟡' },
  high: { label: 'High Priority', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '🟠' },
  urgent: { label: 'Urgent Priority', color: 'text-red-700', bgColor: 'bg-red-100', icon: '🔴' }
}

const categoryConfig: Record<TaskCategory, { label: string; icon: string; description: string }> = {
  personal: { label: 'Personal', icon: '👤', description: 'Personal tasks and activities' },
  work: { label: 'Work', icon: '💼', description: 'Work-related tasks and projects' },
  health: { label: 'Health', icon: '🏥', description: 'Health and wellness activities' },
  finance: { label: 'Finance', icon: '💰', description: 'Financial tasks and planning' },
  education: { label: 'Education', icon: '📚', description: 'Learning and educational activities' },
  shopping: { label: 'Shopping', icon: '🛒', description: 'Shopping and purchasing tasks' },
  other: { label: 'Other', icon: '📝', description: 'Miscellaneous tasks' }
}

export function TaskDetails({ task, open, onOpenChange, onEdit, onDelete }: TaskDetailsProps) {
  if (!task) return null

  const priority = task.priority || 'medium'
  const category = task.category || 'personal'
  const isCompleted = task.status === 'done'

  const formatDueDate = (dueAt: string | null) => {
    if (!dueAt) return null
    
    const due = new Date(dueAt)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    const formattedDate = due.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const formattedTime = due.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    let status = ''
    let statusColor = ''
    
    if (diffMs < 0) {
      status = 'Overdue'
      statusColor = 'text-red-600'
    } else if (diffHours < 24) {
      status = `Due in ${diffHours} hours`
      statusColor = 'text-orange-600'
    } else if (diffDays < 7) {
      status = `Due in ${diffDays} days`
      statusColor = 'text-blue-600'
    } else {
      status = 'Upcoming'
      statusColor = 'text-gray-600'
    }

    return {
      formatted: `${formattedDate} at ${formattedTime}`,
      status,
      statusColor
    }
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    
    if (minutes < 60) {
      return `${minutes} minutes`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      if (remainingMinutes > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`
      } else {
        return `${hours} hour${hours > 1 ? 's' : ''}`
      }
    }
  }

  const formatCreatedDate = (createdAt: string) => {
    const created = new Date(createdAt)
    return created.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const dueInfo = formatDueDate(task.due_at)
  const duration = formatDuration(task.estimated_duration_minutes)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className={`text-xl leading-tight ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                  {isCompleted ? "✅ Completed" : "⏳ Pending"}
                </Badge>
                <span className="text-xs text-gray-500">
                  Created {formatCreatedDate(task.created_at)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1 flex-shrink-0">
              {!isCompleted && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Flag className="h-4 w-4" />
                Priority
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{priorityConfig[priority].icon}</span>
                <Badge 
                  variant="outline" 
                  className={`${priorityConfig[priority].color} ${priorityConfig[priority].bgColor} border-0`}
                >
                  {priorityConfig[priority].label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Folder className="h-4 w-4" />
                Category
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{categoryConfig[category].icon}</span>
                <div>
                  <div className="font-medium">{categoryConfig[category].label}</div>
                  <div className="text-xs text-gray-500">{categoryConfig[category].description}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Due Date */}
          {dueInfo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Due Date
              </div>
              <div className="space-y-1">
                <div className="font-medium">{dueInfo.formatted}</div>
                <div className={`text-sm font-medium ${dueInfo.statusColor}`}>
                  {dueInfo.status}
                </div>
              </div>
            </div>
          )}

          {/* Estimated Duration */}
          {duration && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Timer className="h-4 w-4" />
                Estimated Duration
              </div>
              <div className="font-medium">{duration}</div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Tag className="h-4 w-4" />
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                Description
              </div>
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                {task.description}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                Additional Notes
              </div>
              <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                {task.notes}
              </div>
            </div>
          )}

          {/* Task Metadata */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              Task Information
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Created: {formatCreatedDate(task.created_at)}</div>
              {task.updated_at !== task.created_at && (
                <div>Last updated: {formatCreatedDate(task.updated_at)}</div>
              )}
              {task.last_reminder_sent && (
                <div>Last reminder: {formatCreatedDate(task.last_reminder_sent)}</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}