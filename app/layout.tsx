import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Anton, Bangers, Bebas_Neue, Fredoka, Montserrat, Oswald, Sedgwick_Ave_Display } from 'next/font/google'
import './globals.css'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
// Tipografías de las propuestas de tarjeta (Tarjetas NFC · Black Beer.pdf)
const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const oswald = Oswald({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-oswald' })
const fredoka = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-fredoka' })
const sedgwick = Sedgwick_Ave_Display({ weight: '400', subsets: ['latin'], variable: '--font-sedgwick' })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700', '800', '900'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Blackbeer · Sistema de Puntos',
  description: 'Sistema de puntos, tarjetas NFC y recompensas para Blackbeer, bar de amigos.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F6D525',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="light">
      <body className={`${anton.variable} ${montserrat.variable} ${bangers.variable} ${bebas.variable} ${oswald.variable} ${fredoka.variable} ${sedgwick.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
