"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, ChevronDown, Calendar as CalendarIcon } from "lucide-react"
import { supabase, createTask } from "@basictodo/utils"
import { CreateTaskSchema, CreateTaskInput } from "@basictodo/utils"

interface TaskFormProps {
  onTaskCreated?: () => void
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dateOpen, setDateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      title: "",
      due_at: undefined
    }
  })

  const handleSubmit = async (data: CreateTaskInput) => {
    setLoading(true)
    setError("")

    try {
      // Combine date and time if both are provided
      let dueDateTime: string | null = null
      if (selectedDate && selectedTime) {
        const [hours, minutes] = selectedTime.split(':')
        const combinedDateTime = new Date(selectedDate)
        combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        dueDateTime = combinedDateTime.toISOString()
      } else if (selectedDate) {
        // If only date is selected, set time to 9:00 AM
        const dateWithTime = new Date(selectedDate)
        dateWithTime.setHours(9, 0, 0, 0)
        dueDateTime = dateWithTime.toISOString()
      }

      const taskData: CreateTaskInput = {
        title: data.title,
        due_at: dueDateTime
      }

      await createTask(supabase, taskData)
      
      // Reset form and state
      form.reset()
      setSelectedDate(undefined)
      setSelectedTime("")
      setOpen(false)
      
      // Notify parent component
      onTaskCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your todo list. You can set a due date to get reminders.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 space-y-6 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                {...form.register("title")}
                disabled={loading}
                className="w-full"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Label>Due Date & Time (optional)</Label>
              <div className="flex gap-4">
                {/* Date Picker */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date-picker" className="text-sm text-muted-foreground">
                    Date
                  </Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date-picker"
                        className="w-40 justify-between font-normal"
                        disabled={loading}
                      >
                        {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setSelectedDate(date)
                          setDateOpen(false)
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Picker */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="time-picker" className="text-sm text-muted-foreground">
                    Time
                  </Label>
                  <Input
                    type="time"
                    id="time-picker"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    disabled={loading}
                    className="w-32 bg-background"
                  />
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Sticky footer with buttons */}
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}