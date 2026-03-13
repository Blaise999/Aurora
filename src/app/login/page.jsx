'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, profile, refreshSession } = useSession();
  const [step, setStep] = useState('email'); // email | otp | success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (!profile?.wallet_address) {
        router.replace('/connect-wallet');
      } else {
        router.replace('/profile');
      }
    }
  }, [isLoggedIn, profile, router]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = otp.join('');
      if (code.length === 6) handleVerifyOtp(code);
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const newOtp = paste.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(paste), 100);
    }
  };

  const handleVerifyOtp = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      setStep('success');
      await refreshSession();
      // Route based on wallet status
      setTimeout(() => {
        if (data.profile?.walletAddress) {
          router.push('/profile');
        } else {
          router.push('/connect-wallet');
        }
      }, 1500);
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-accent-violet/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative w-28 h-28 mx-auto mb-4">
            <Image src="/pictures/logo.png" alt="AuroraNft" fill className="object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.3)]" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-text">
            {step === 'email' ? 'Welcome' : step === 'otp' ? 'Check Your Email' : 'Welcome In!'}
          </h1>
          <p className="text-muted text-sm mt-2">
            {step === 'email'
              ? 'Sign in or create your account with email'
              : step === 'otp'
                ? `We sent a 6-digit code to ${email}`
                : 'Redirecting you...'}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 space-y-6">
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-dim font-medium uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dim" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface2 border border-border-light text-text placeholder:text-muted-dim/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>
              {error && <p className="text-danger text-xs font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent-violet text-bg font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? 'Sending Code...' : 'Continue with Email'}
              </button>
              <div className="flex items-center gap-2 text-[11px] text-muted-dim justify-center">
                <ShieldCheck size={12} />
                <span>Secure login via one-time code. No password needed.</span>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl bg-surface2 border border-border-light text-accent focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                ))}
              </div>
              {error && <p className="text-danger text-xs font-medium text-center">{error}</p>}
              {loading && (
                <div className="flex items-center justify-center gap-2 text-accent text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying...</span>
                </div>
              )}
              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="text-xs text-muted hover:text-accent transition-colors mx-auto block"
              >
                ← Use a different email
              </button>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="text-xs text-muted hover:text-accent transition-colors mx-auto block disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
                <Sparkles size={28} className="text-success" />
              </div>
              <p className="font-display font-bold text-lg text-text">You're in!</p>
              <Loader2 size={20} className="animate-spin text-accent mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
