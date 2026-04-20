'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  PenSquare,
  BookOpen,
  BarChart3,
  User,
  Tags,
  Settings,
  Moon,
  Sun,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/', icon: PenSquare, label: '写日记' },
  { href: '/diary', icon: BookOpen, label: '日记库' },
  { href: '/stats', icon: BarChart3, label: '统计分析' },
  { href: '/profile', icon: User, label: '个性画像' },
  { href: '/tags', icon: Tags, label: '标签管理' },
  { href: '/settings', icon: Settings, label: '设置' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.add('dark')
    setIsDark(true)
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-mantle border-r border-surface0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-surface0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue to-purple flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <span className="font-semibold text-lg text-text">DiarAI</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-subtext1 hover:bg-surface0 hover:text-text'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="absolute bottom-6 left-0 right-0 px-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-subtext1 hover:bg-surface0 hover:text-text transition-all duration-200"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="font-medium">{isDark ? '浅色模式' : '深色模式'}</span>
        </button>
      </div>
    </aside>
  )
}
