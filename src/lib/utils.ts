import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, format: 'full' | 'short' | 'month' = 'full'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    case 'month':
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    case 'full':
    default:
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
  }
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function getMonthRange(months: number = 6): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - months)
  return {
    start: getDateString(start),
    end: getDateString(end)
  }
}

export function getWeekRange(): string[] {
  const weeks: string[] = []
  const today = new Date()
  
  for (let i = 7; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    weeks.push(getDateString(date))
  }
  
  return weeks
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const date = item.date.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  
  const sortedDates = [...new Set(dates)].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )
  
  let streak = 1
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i])
    const next = new Date(sortedDates[i + 1])
    current.setHours(0, 0, 0, 0)
    next.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
    } else if (diffDays > 1) {
      break
    }
  }
  
  return streak
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function countWords(text: string): number {
  return text.replace(/\s/g, '').length
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
