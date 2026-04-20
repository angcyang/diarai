'use client'

import { usePathname } from 'next/navigation'
import { formatDate } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/': '写日记',
  '/diary': '日记库',
  '/stats': '统计分析',
  '/profile': '个性画像',
  '/tags': '标签管理',
  '/settings': '设置',
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'DiarAI'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-8 bg-base/80 backdrop-blur-md border-b border-surface0">
      <div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="text-sm text-subtext0">{formatDate(new Date(), 'full')}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
            <span className="text-subtext0">本地存储</span>
          </div>
        </div>
      </div>
    </header>
  )
}
