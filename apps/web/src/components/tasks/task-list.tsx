"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { TaskDetails } from "@/components/tasks/task-details"
import { Trash2, Calendar, Clock, Edit2, Check, X, Tag, FileText, Timer, Folder, Eye } from "lucide-react"
import { supabase, listTasks, updateTask, deleteTask } from "@basictodo/utils"
import { Task, TaskStatus, TaskPriority, TaskCategory, UpdateTaskSchema, UpdateTaskInput } from "@basictodo/utils"

interface TaskListProps {
  refreshTrigger?: number
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-700', bgColor: 'bg-red-100' }
}

const categoryConfig: Record<TaskCategory, { label: string; icon: string }> = {
  personal: { label: 'Personal', icon: '👤' },
  work: { label: 'Work', icon: '💼' },
  health: { label: 'Health', icon: '🏥' },
  finance: { label: 'Finance', icon: '💰' },
  education: { label: 'Education', icon: '📚' },
  shopping: { label: 'Shopping', icon: '🛒' },
  other: { label: 'Other', icon: '📝' }
}

export function TaskList({ refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError("")
      const taskList = await listTasks(supabase, {
        orderBy: 'created_at',
        orderDirection: 'desc'
      })
      setTasks(taskList)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [refreshTrigger])

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setDetailsOpen(true)
  }

  const handleEditFromDetails = (task: Task) => {
    setDetailsOpen(false)
    setEditingTaskId(task.id)
  }

  const handleDeleteFromDetails = (taskId: string) => {
    setDetailsOpen(false)
    handleDeleteTask(taskId)
  }

  const handleToggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    try {
      const newStatus: TaskStatus = currentStatus === 'pending' ? 'done' : 'pending'
      await updateTask(supabase, taskId, { status: newStatus })
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
          : task
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    try {
      await deleteTask(supabase, taskId)
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task")
    }
  }

  const handleEditTask = async (taskId: string, data: UpdateTaskInput) => {
    try {
      setEditLoading(true)
      setError("")
      
      const updatedTask = await updateTask(supabase, taskId, data)
      
      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? updatedTask : task
      ))
      
      setEditingTaskId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setEditLoading(false)
    }
  }

  const formatDueDate = (dueAt: string | null) => {
    if (!dueAt) return null
    
    const due = new Date(dueAt)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) {
      return { text: "Overdue", variant: "destructive" as const }
    } else if (diffHours < 24) {
      return { text: `Due in ${diffHours}h`, variant: "secondary" as const }
    } else if (diffDays < 7) {
      return { text: `Due in ${diffDays}d`, variant: "outline" as const }
    } else {
      return { text: due.toLocaleDateString(), variant: "outline" as const }
    }
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null
    
    if (minutes < 60) {
      return `${minutes}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No tasks yet. Start by adding your first task!</p>
      </div>
    )
  }

  const pendingTasks = tasks.filter(task => task.status === 'pending')
  const completedTasks = tasks.filter(task => task.status === 'done')

  const TaskEditForm = ({ task, onSave, onCancel }: {
    task: Task,
    onSave: (data: UpdateTaskInput) => void,
    onCancel: () => void
  }) => {
    const form = useForm<UpdateTaskInput>({
      resolver: zodResolver(UpdateTaskSchema),
      defaultValues: {
        title: task.title,
        description: task.description || "",
        priority: task.priority || "medium",
        category: task.category || "personal",
        estimated_duration_minutes: task.estimated_duration_minutes || undefined,
        notes: task.notes || ""
      }
    })

    const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>(
      task.due_at ? new Date(task.due_at) : undefined
    )

    const [tags, setTags] = useState<string[]>(task.tags || [])
    const [tagInput, setTagInput] = useState("")

    const addTag = () => {
      const trimmedTag = tagInput.trim()
      if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag])
        setTagInput("")
      }
    }

    const removeTag = (tagToRemove: string) => {
      setTags(tags.filter(tag => tag !== tagToRemove))
    }

    const handleSubmit = (data: UpdateTaskInput) => {
      onSave({
        title: data.title,
        description: data.description || undefined,
        due_at: selectedDateTime?.toISOString() || undefined,
        priority: data.priority,
        category: data.category,
        tags: tags.length > 0 ? tags : undefined,
        estimated_duration_minutes: data.estimated_duration_minutes || undefined,
        notes: data.notes || undefined
      })
    }

    return (
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Input
          {...form.register("title")}
          placeholder="Task title"
          disabled={editLoading}
          className="font-medium"
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
        
        <Textarea
          {...form.register("description")}
          placeholder="Description (optional)"
          disabled={editLoading}
          className="min-h-[60px]"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            value={form.watch("priority") || "medium"}
            onValueChange={(value) => form.setValue("priority", value as TaskPriority)}
            disabled={editLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={form.watch("category") || "personal"}
            onValueChange={(value) => form.setValue("category", value as TaskCategory)}
            disabled={editLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  <span className="mr-2">{config.icon}</span>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DateTimePicker
          value={selectedDateTime}
          onChange={setSelectedDateTime}
          hourCycle={12}
          placeholder="Select due date and time (optional)"
          disabled={editLoading}
        />

        <Input
          {...form.register("estimated_duration_minutes", { valueAsNumber: true })}
          type="number"
          min="1"
          max="1440"
          placeholder="Estimated duration (minutes)"
          disabled={editLoading}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  disabled={editLoading}
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              disabled={editLoading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              disabled={editLoading || !tagInput.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        <Textarea
          {...form.register("notes")}
          placeholder="Additional notes (optional)"
          disabled={editLoading}
          className="min-h-[50px]"
        />
        
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={editLoading}>
            <Check className="h-3 w-3 mr-1" />
            {editLoading ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={editLoading}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  const renderTask = (task: Task) => {
    const dueInfo = formatDueDate(task.due_at)
    const duration = formatDuration(task.estimated_duration_minutes)
    const isCompleted = task.status === 'done'
    const isEditing = editingTaskId === task.id
    const isExpanded = expandedTasks.has(task.id)
    const priority = task.priority || 'medium'
    const category = task.category || 'personal'
    
    return (
      <Card key={task.id} className={`transition-all ${isCompleted ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          {isEditing ? (
            <TaskEditForm
              task={task}
              onSave={(data) => handleEditTask(task.id, data)}
              onCancel={() => setEditingTaskId(null)}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium cursor-pointer hover:text-blue-600 ${isCompleted ? 'line-through text-gray-500' : ''}`}
                        onClick={() => openTaskDetails(task)}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className={`text-sm mt-1 line-clamp-2 cursor-pointer hover:text-blue-600 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}
                           onClick={() => openTaskDetails(task)}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      {!isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTaskId(task.id)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Always visible metadata */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${priorityConfig[priority].color} ${priorityConfig[priority].bgColor} border-0`}
                    >
                      {priorityConfig[priority].label}
                    </Badge>
                    
                    <Badge variant="outline" className="text-xs">
                      <Folder className="h-3 w-3 mr-1" />
                      {categoryConfig[category].icon} {categoryConfig[category].label}
                    </Badge>
                    
                    {dueInfo && !isCompleted && (
                      <Badge variant={dueInfo.variant} className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {dueInfo.text}
                      </Badge>
                    )}
                    
                    {duration && (
                      <Badge variant="outline" className="text-xs">
                        <Timer className="h-3 w-3 mr-1" />
                        {duration}
                      </Badge>
                    )}
                    
                    <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                      {isCompleted ? "Done" : "Pending"}
                    </Badge>
                  </div>

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Expandable content */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-sm text-gray-600 border-t pt-3">
                      {task.description && (
                        <div>
                          <div className="flex items-center gap-1 font-medium text-gray-700 mb-1">
                            <FileText className="h-3 w-3" />
                            Description
                          </div>
                          <p className="whitespace-pre-wrap">{task.description}</p>
                        </div>
                      )}
                      
                      {task.notes && (
                        <div>
                          <div className="flex items-center gap-1 font-medium text-gray-700 mb-1">
                            <FileText className="h-3 w-3" />
                            Notes
                          </div>
                          <p className="whitespace-pre-wrap">{task.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="todos" className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="todos" className="flex items-center gap-2">
          Todos
          <Badge variant="secondary" className="text-xs">
            {pendingTasks.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          Completed
          <Badge variant="default" className="text-xs">
            {completedTasks.length}
          </Badge>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="todos" className="flex-1 mt-0 overflow-y-auto">
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending tasks. Great job!</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {pendingTasks.map(renderTask)}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="completed" className="flex-1 mt-0 overflow-y-auto">
        {completedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No completed tasks yet.</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {completedTasks.map(renderTask)}
          </div>
        )}
      </TabsContent>
      
      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onEdit={handleEditFromDetails}
          onDelete={handleDeleteFromDetails}
        />
      )}
    </Tabs>
  )
}