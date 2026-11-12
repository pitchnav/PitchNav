import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://pitchnav.com'),
  title: {
    default: 'Pitch Nav | Pitch Tracking & Baseball Training',
    template: '%s | Pitch Nav',
  },
  description:
    'Get your delivery reviewed and plan your throwing and lifting around school, summer and fall ball. Explore Pitch Nav’s upcoming iPhone pitch tracking system.',
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
    title: 'Pitch Nav | Pitch Tracking & Baseball Training',
    description:
      'See what to work on next pen and where your lifts fit between outings. Explore Pitch Tracking, now in development.',
    images: [
      {
        url: '/icon.png',
        width: 256,
        height: 232,
        alt: 'Pitch Nav logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Pitch Nav | Pitch Tracking & Baseball Training',
    description:
      'Get feedback on your delivery and a development plan that fits your baseball season.',
    images: ['/icon.png'],
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
    <html lang="en">
      <body className="min-h-screen bg-navy-950 text-white antialiased">
        <a className="skip-content" href="#main-content">Skip to main content</a>
        <Navbar />
        <main tabIndex={-1} id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
