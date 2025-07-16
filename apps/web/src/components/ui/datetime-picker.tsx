"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  hourCycle?: 12 | 24
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  hourCycle = 12,
  placeholder = "Pick a date and time",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // If we have an existing value, preserve the time
      if (value) {
        selectedDate.setHours(value.getHours(), value.getMinutes(), 0, 0)
      } else {
        // Default to 12:00 PM
        selectedDate.setHours(12, 0, 0, 0)
      }
      onChange?.(selectedDate)
    } else {
      onChange?.(undefined)
    }
  }

  const handleTimeChange = (type: 'hour' | 'minute' | 'period', newValue: string) => {
    if (!value) return

    const newDate = new Date(value)
    
    if (type === 'hour') {
      let hour = parseInt(newValue)
      if (hourCycle === 12) {
        const currentHour = newDate.getHours()
        const isPM = currentHour >= 12
        if (isPM && hour !== 12) hour += 12
        if (!isPM && hour === 12) hour = 0
      }
      newDate.setHours(hour)
    } else if (type === 'minute') {
      newDate.setMinutes(parseInt(newValue))
    } else if (type === 'period') {
      const currentHour = newDate.getHours()
      if (newValue === 'AM' && currentHour >= 12) {
        newDate.setHours(currentHour - 12)
      } else if (newValue === 'PM' && currentHour < 12) {
        newDate.setHours(currentHour + 12)
      }
    }
    
    onChange?.(newDate)
  }

  const formatDisplayValue = () => {
    if (!value) return placeholder
    
    const dateStr = format(value, "PPP")
    const timeStr = format(value, hourCycle === 12 ? "h:mm a" : "HH:mm")
    return `${dateStr} at ${timeStr}`
  }

  const getHourOptions = () => {
    if (hourCycle === 12) {
      return Array.from({ length: 12 }, (_, i) => {
        const hour = i + 1
        return { value: hour.toString(), label: hour.toString().padStart(2, '0') }
      })
    } else {
      return Array.from({ length: 24 }, (_, i) => ({
        value: i.toString(),
        label: i.toString().padStart(2, '0')
      }))
    }
  }

  const getMinuteOptions = () => {
    return Array.from({ length: 60 }, (_, i) => ({
      value: i.toString(),
      label: i.toString().padStart(2, '0')
    }))
  }

  const getCurrentHour = () => {
    if (!value) return '12'
    const hour = value.getHours()
    if (hourCycle === 12) {
      return hour === 0 ? '12' : hour > 12 ? (hour - 12).toString() : hour.toString()
    }
    return hour.toString()
  }

  const getCurrentMinute = () => {
    if (!value) return '0'
    return value.getMinutes().toString()
  }

  const getCurrentPeriod = () => {
    if (!value) return 'AM'
    return value.getHours() >= 12 ? 'PM' : 'AM'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
          />
          <div className="border-t p-3">
            <div className="flex items-center justify-center gap-2">
              <Select
                value={getCurrentHour()}
                onValueChange={(val: string) => handleTimeChange('hour', val)}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getHourOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-xl font-bold">:</span>
              
              <Select
                value={getCurrentMinute()}
                onValueChange={(val: string) => handleTimeChange('minute', val)}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMinuteOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hourCycle === 12 && (
                <>
                  <span className="text-xl font-bold mx-1"></span>
                  <Select
                    value={getCurrentPeriod()}
                    onValueChange={(val: string) => handleTimeChange('period', val)}
                  >
                    <SelectTrigger className="w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}