import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { PwaRegister } from '@/components/pwa-register'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Toro — Painel Administrativo',
  description: 'Painel administrativo Toro — Loja de moda fitness',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  applicationName: 'Toro Admin',
  appleWebApp: {
    capable: true,
    title: 'Toro',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#101010',
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
              background: '#101010',
              border: '1px solid #E3DBCC',
              color: '#FDFCF8',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
