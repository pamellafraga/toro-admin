import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Xpress Solutions - Dashboard',
  description: 'Painel administrativo Xpress Solutions - Gestao de produtos SaaS',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  icons: { icon: '/icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#050a18',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0a1128',
              border: '1px solid #1e3a5f',
              color: '#e2e8f0',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
