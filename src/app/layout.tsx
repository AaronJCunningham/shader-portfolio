import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Home - Aaron J. Cunningham',
  description: "Aaron J. Cunningham is a frontend developer specializing in metaverse & web3 using Three.js, R3F, Next.js & React.",
  openGraph: {
    images: 'https://ik.imagekit.io/fx30u3wgcqib/Screenshot%202024-01-18%20124209_v5n4oEu5V.png?updatedAt=1705578827046',
  },
  
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
