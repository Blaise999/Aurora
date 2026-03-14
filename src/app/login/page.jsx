'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, ArrowRight, Loader2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, profile, refreshSession } = useSession();

  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'success'
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
  }, [isLoggedIn, profile?.wallet_address, router]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newOtp.every((d) => d)) {
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
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);

      const nextFocus = Math.min(pasted.length, 5);
      otpRefs.current[nextFocus]?.focus();

      if (pasted.length === 6) {
        setTimeout(() => handleVerifyOtp(pasted), 80);
      }
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

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired code');
      }

      // Success
      setStep('success');
      await refreshSession?.();

      setTimeout(() => {
        if (data.profile?.walletAddress) {
          router.push('/profile');
        } else {
          router.push('/connect-wallet');
        }
      }, 1400);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-black to-zinc-950">
      {/* Subtle background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Image
              src="/pictures/logo.png"
              alt="AuroraNft"
              fill
              className="object-contain drop-shadow-2xl drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]"
              priority
            />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight">
            {step === 'email' ? 'Welcome Back' : step === 'otp' ? 'Verify Email' : 'Success!'}
          </h1>

          <p className="mt-3 text-zinc-400 text-base">
            {step === 'email'
              ? 'Sign in to your account'
              : step === 'otp'
              ? `We sent a 6-digit code to ${email}`
              : 'You’re being redirected...'}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-strong rounded-3xl p-8 md:p-10 border border-zinc-800/50 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/60 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    autoFocus
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-lg p-3">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="text-center text-sm text-zinc-500 flex items-center justify-center gap-2 mt-4">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Secure one-time code login • No password needed</span>
              </div>

              <p className="text-center text-sm text-zinc-500 mt-6">
                Don't have an account?{' '}
                <a href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign up
                </a>
              </p>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-8">
              <div className="flex justify-center gap-3 sm:gap-4" onPaste={handleOtpPaste}>
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
                    className="w-14 h-14 text-center text-2xl font-bold bg-zinc-900/70 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                    disabled={loading}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-lg p-3">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-3 text-blue-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Verifying code...</span>
                </div>
              )}

              <div className="flex flex-col items-center gap-4 text-sm text-zinc-400">
                <button
                  onClick={() => {
                    setStep('email');
                    setOtp(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="hover:text-white transition-colors"
                >
                  ← Use a different email
                </button>

                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="hover:text-white transition-colors disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">You're in!</h2>
              <p className="text-zinc-400">Redirecting you...</p>
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}