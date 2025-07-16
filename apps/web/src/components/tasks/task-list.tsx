"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Calendar, Clock } from "lucide-react"
import { supabase, listTasks, updateTask, deleteTask } from "@basictodo/utils"
import { Task, TaskStatus } from "@basictodo/utils"

interface TaskListProps {
  refreshTrigger?: number
}

export function TaskList({ refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const dueInfo = formatDueDate(task.due_at)
        const isCompleted = task.status === 'done'
        
        return (
          <Card key={task.id} className={`transition-all ${isCompleted ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {dueInfo && (
                      <Badge variant={dueInfo.variant} className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {dueInfo.text}
                      </Badge>
                    )}
                    
                    <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                      {isCompleted ? "Done" : "Pending"}
                    </Badge>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}