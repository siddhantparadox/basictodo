"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthForm } from "@/components/auth/auth-form"
import { TaskForm } from "@/components/tasks/task-form"
import { TaskList } from "@/components/tasks/task-list"
import { AiChat } from "@/components/ai/ai-chat"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const { user, loading, signOut } = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <AuthForm />
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">BasicTodo</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Task List */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Your Tasks</CardTitle>
                    <CardDescription>
                      Manage your tasks with AI assistance
                    </CardDescription>
                  </div>
                  <TaskForm onTaskCreated={handleTaskCreated} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-2">
                  <TaskList refreshTrigger={refreshTrigger} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Chat Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>
                  Chat with AI to manage your tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0">
                <AiChat onTasksChanged={handleTaskCreated} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
