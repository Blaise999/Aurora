'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

export default function SignupPage() {
  const router = useRouter();
  const { isLoggedIn } = useSession();

  const [step, setStep] = useState('info'); // info | otp | success
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);

  if (isLoggedIn) {
    router.replace('/profile');
    return null;
  }

  const handleSignupStart = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || !firstName.trim()) {
      setError('Email and first name are required');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // handleOtpChange, handleOtpKeyDown, handleOtpPaste – copy from login page

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

      // refreshSession() if you have it
      setStep('success');
      setTimeout(() => {
        router.push('/connect-wallet'); // new users → connect wallet
      }, 1500);
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // UI – very similar structure to login, but with extra fields in 'info' step
  // ────────────────────────────────────────────────

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      {/* background effects same as login */}

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="relative w-28 h-28 mx-auto mb-4">
            <Image src="/pictures/logo.png" alt="AuroraNft" fill className="object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.3)]" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-text">
            {step === 'info' ? 'Create Account' : step === 'otp' ? 'Verify Email' : 'Welcome!'}
          </h1>
          <p className="text-muted text-sm mt-2">
            {step === 'info' ? 'Join AuroraNft – it only takes a moment'
             : step === 'otp' ? `Code sent to ${email}`
             : 'Setting up your profile...'}
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-8 space-y-6">
          {step === 'info' && (
            <form onSubmit={handleSignupStart} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs text-muted-dim font-medium uppercase tracking-wider">First Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dim" />
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface2 border border-border-light text-text placeholder:text-muted-dim/50 focus:outline-none focus:border-accent/40 ..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-dim font-medium uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dim" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 ..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-dim font-medium uppercase tracking-wider">Username (optional)</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@yourhandle"
                  className="w-full px-4 py-3.5 rounded-xl bg-surface2 border ..."
                />
              </div>

              {error && <p className="text-danger text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email || !firstName.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent-violet ..."
              >
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* OTP step – almost identical to login's OTP UI */}
          {/* success step – same as login */}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account? <a href="/login" className="text-accent hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
}