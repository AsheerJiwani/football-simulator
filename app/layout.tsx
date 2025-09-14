import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NFL Football Simulator',
  description: 'Practice reading defenses with our realistic football simulator. Master route concepts and coverage recognition with NFL-accurate mechanics.',
  keywords: 'football, simulator, NFL, quarterback, defense, coverage, routes',
  authors: [{ name: 'Football Simulator Team' }],
  openGraph: {
    title: 'NFL Football Simulator',
    description: 'Practice reading defenses with realistic NFL mechanics',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}