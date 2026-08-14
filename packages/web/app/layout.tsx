import type { Metadata } from 'next';
import { Hanken_Grotesk, Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { WalletProvider } from '@/providers/wallet-provider';
import './globals.css';

// Body/UI face — open-source substitute for the licensed Basier Circle (docs/DESIGN.md).
const inter = Inter({ subsets: ['latin'], weight: '400', variable: '--font-body' });
// Display face — open-source substitute for the licensed Degular (docs/DESIGN.md). Page titles only.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'StashCo',
  description: 'A Stellar / Soroban dApp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${hankenGrotesk.variable} font-sans`}>
        <QueryProvider>
          <WalletProvider>{children}</WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
