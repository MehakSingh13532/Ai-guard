import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: 'Ai-guard v2.0 | AI Agent Security Benchmark',
  description: 'Academic AI Agent Security Evaluation Platform based on DeepMind Traps Taxonomy',
  icons: {
    icon: '/shield.svg',
    shortcut: '/shield.svg',
    apple: '/shield.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/shield.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
