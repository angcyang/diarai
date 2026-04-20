import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DiarAI - AI 日记分析工具',
  description: 'AI 引导写作、情感趋势分析、双向标签体系与个性画像生成',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-base">
        {children}
      </body>
    </html>
  )
}
