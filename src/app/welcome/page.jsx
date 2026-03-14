"use client";

import { useState } from "react";
import WalletWelcomeModal from "@/components/modals/WalletWelcomeModal";

export default function WelcomePage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <WalletWelcomeModal
        isOpen={isOpen}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      />
    </main>
  );
}