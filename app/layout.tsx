Horizon type { Metadata } from 'next';
import {
  Outfit,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Noto_Sans_Myanmar,
} from 'next/font/google';
import './globals.css';
import { FirebaseBootstrap } from '@/components/FirebaseBootstrap';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-myanmar',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mergui Horizon Boat Trips',
  description:
    'Mobile-friendly recreational boat trip booking website with automatic travel date assignment, PNG booking receipts, lookup, and admin capacity management.',
  openGraph: {
    title: 'Mergui Horizon Boat Trips',
    description:
      'Mobile-friendly recreational boat trip booking website with automatic travel date assignment, PNG booking receipts, lookup, and admin capacity management.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mergui Horizon Boat Trips',
    description:
      'Mobile-friendly recreational boat trip booking website with automatic travel date assignment, PNG booking receipts, lookup, and admin capacity management.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${notoMyanmar.variable}`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900">
        <FirebaseBootstrap>{children}</FirebaseBootstrap>
      </body>
    </html>
  );
}
