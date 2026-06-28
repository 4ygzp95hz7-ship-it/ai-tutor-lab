'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { PwaRegister } from './PwaRegister'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaRegister />
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </SessionProvider>
  )
}
