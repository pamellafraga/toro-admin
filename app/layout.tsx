import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Xpress Solutions - Dashboard',
  description: 'Painel administrativo Xpress Solutions - Gestao de produtos SaaS',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  applicationName: 'Xpress Solutions',
  appleWebApp: {
    capable: true,
    title: 'Xpress',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#050a18',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        <PwaRegister />
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
