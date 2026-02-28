import type { Metadata } from 'next';

import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'NFAClaw | PoW Mining Protocol',
  description:
    'The first hybrid-species PFP collection on Flap Network. Browser-based PoW mining on BSC.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-white selection:bg-flap selection:text-white">
        <Providers>
          <div className="min-h-screen flex flex-col relative">
            {/* Grid Background */}
            <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
              {children}
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
