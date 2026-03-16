"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// ── wallet/provider stuff only on client ──
const ClientProviders = dynamic(
  () => import("@/components/ClientProviders"),
  { ssr: false }
);

const ToastProvider = dynamic(() => import("@/components/ToastProvider"), {
  ssr: false,
});

const SupportChatWidget = dynamic(
  () => import("@/components/support/SupportChatWidget"),
  { ssr: false }
);

const VisitorTrackerProvider = dynamic(
  () => import("@/components/support/VisitorTrackerProvider"),
  { ssr: false }
);

export default function AppShell({ children }) {
  return (
    <ClientProviders>
      <Navbar />
      <main className="flex-1 pt-16 sm:pt-20">{children}</main>
      <Footer />
      <ToastProvider />
      <SupportChatWidget />
      <VisitorTrackerProvider />
    </ClientProviders>
  );
}