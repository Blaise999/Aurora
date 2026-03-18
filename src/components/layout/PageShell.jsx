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
      {/* pt matches navbar: 48px mobile, 56px sm, 68px lg */}
      <main className="flex-1 pt-[48px] sm:pt-[56px] lg:pt-[68px]">{children}</main>
      <Footer />
      <ToastProvider />
      <SupportChatWidget />
      <VisitorTrackerProvider />
    </ClientProviders>
  );
}
