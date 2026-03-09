'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function CursorSpotlight() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) return;

    const el = ref.current;
    const handleMove = (e) => {
      if (!el) return;
      const rect = el.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(0,229,255,0.06), transparent 60%)`;
    };

    const parent = el?.parentElement;
    parent?.addEventListener('mousemove', handleMove);
    return () => parent?.removeEventListener('mousemove', handleMove);
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={ref}
      className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-700"
      aria-hidden="true"
    />
  );
}
