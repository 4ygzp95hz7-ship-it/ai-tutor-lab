import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Tutor Lab — Personalized AI Learning',
  description: 'Master any topic with a complete, AI-generated learning roadmap. Doubt assistant, exercises, capstone projects, and interview prep — all powered by AI.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AI Tutor Lab',
  },
  icons: {
    apple: '/icons/icon-192.png',
    icon: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI Tutor Lab" />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
