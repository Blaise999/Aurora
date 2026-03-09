"use client";
import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#0E1730",
          color: "#EAF0FF",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
        },
        success: {
          iconTheme: { primary: "#10B981", secondary: "#0E1730" },
        },
        error: {
          iconTheme: { primary: "#EF4444", secondary: "#0E1730" },
        },
      }}
    />
  );
}
