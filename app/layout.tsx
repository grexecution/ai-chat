import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProvider from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gibby Chat',
  description: 'Private AI chat application with local LLMs',
  icons: {
    icon: '/icon.svg',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#18181b' },
    { media: '(prefers-color-scheme: dark)', color: '#18181b' }
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gibby Chat',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  
  try {
    session = await getServerSession(authOptions)
  } catch (_error) {
    // If there's a JWT error, just treat as no session
    // Silent fail - no console warnings
  }

  return (
    <html lang="en" className="dark h-full">
      <head>
        <meta name="theme-color" content="#18181b" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} h-full overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950`} suppressHydrationWarning>
        <SessionProvider session={session}>
          <div className="flex flex-col h-screen overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}