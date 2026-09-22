import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TheoryDB — Chess Opening Theory Database',
  description: '141 opening families, 3,520 lines, 7,244 positions in a move-tree explorer. SQLite + Prisma + Next.js.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  )
}
