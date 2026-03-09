import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastProvider from "@/components/ToastProvider";
import AppProviders from "@/components/AppProviders";

export const metadata = {
  title: "Aurora NFT — Discover & Mint Digital Art",
  description:
    "Explore thousands of unique NFTs from creators worldwide. Mint, collect, and trade on Base L2.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="grain bg-bg text-text antialiased font-body min-h-screen flex flex-col">
        <AppProviders>
          <Navbar />
          <main className="flex-1 pt-16 sm:pt-20">{children}</main>
          <Footer />
          <ToastProvider />
        </AppProviders>
      </body>
    </html>
  );
}
