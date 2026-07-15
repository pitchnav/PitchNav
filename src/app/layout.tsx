import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://pitchnav.com'),
  title: {
    default: 'Pitch Nav | Baseball Pitching Mechanics Analysis',
    template: '%s | Pitch Nav',
  },
  description:
    'Upload your pitching videos and receive a comprehensive breakdown of your mechanics, velocity-development opportunities, personalized drills, and training priorities from expert reviewers.',
  keywords: [
    'pitching analysis',
    'pitching mechanics',
    'velocity development',
    'remote pitching instruction',
    'baseball training',
    'pitching coach',
    'pitching video analysis',
    'baseball pitcher development',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Pitch Nav',
    title: 'Pitch Nav | Baseball Pitching Mechanics Analysis',
    description:
      'Upload your pitching videos and receive an easy-to-understand breakdown of your mechanics, velocity-development opportunities, personalized drills, and training priorities.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pitch Nav — Baseball Pitching Mechanics Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pitch Nav | Baseball Pitching Mechanics Analysis',
    description:
      'Upload your pitching videos and receive a comprehensive mechanics analysis from expert reviewers.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-navy-950 text-white antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
