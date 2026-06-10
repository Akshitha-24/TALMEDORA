import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TALMedora',
  description: 'A modern post creation and sharing platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}