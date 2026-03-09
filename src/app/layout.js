import './globals.css';
import Web3Provider from '@/providers/Web3Provider';
import { WalletProvider } from '@/context/WalletContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ToastProvider from '@/components/ToastProvider';
import VisitorTrackerProvider from '@/components/support/VisitorTrackerProvider';
import SupportChatWidget from '@/components/support/SupportChatWidget';

export const metadata = {
  title: 'AuroraNft - Premium NFT Platform',
  description: 'A curated NFT experience on Base. Browse, mint, and collect digital artifacts with verifiable provenance.',
  icons: { icon: '/pictures/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain bg-bg text-text font-body antialiased min-h-screen flex flex-col">
        <Web3Provider>
          <WalletProvider>
            <VisitorTrackerProvider />
            <Navbar />
            <main className="flex-1 pt-16 sm:pt-20">{children}</main>
            <Footer />
            <ToastProvider />
            <SupportChatWidget />
          </WalletProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
