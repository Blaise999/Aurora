'use client';
import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, LogOut, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function AdminLoginGate({ children }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth');
        if (res.ok) { const d = await res.json(); if (!c && d.ok) { setAuthed(true); setAdminUser(d.username || 'admin'); } }
      } catch {}
      if (!c) setChecking(false);
    })();
    return () => { c = true; };
  }, []);

  const handleLogin = useCallback(async (e) => {
    e?.preventDefault();
    if (!password.trim()) { setError('Password is required'); return; }
    setLogging(true); setError('');
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() || 'admin', password }) });
      const d = await res.json();
      if (res.ok && d.ok) { setAuthed(true); setAdminUser(d.username || 'admin'); setPassword(''); }
      else setError(d.error || 'Invalid credentials');
    } catch { setError('Connection failed'); } finally { setLogging(false); }
  }, [username, password]);

  const handleLogout = useCallback(async () => {
    try { await fetch('/api/admin/auth', { method: 'DELETE' }); } catch {}
    setAuthed(false); setAdminUser(''); setPassword(''); setError('');
  }, []);

  if (checking) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  if (authed) return (
    <div className="relative">
      <div className="fixed top-0 right-0 z-[60] m-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md border border-border-light shadow-card">
          <Shield size={12} className="text-success" />
          <span className="text-[11px] text-muted font-mono">{adminUser}</span>
          <button onClick={handleLogout} className="ml-1 p-1 text-muted hover:text-danger transition-colors" title="Logout"><LogOut size={13} /></button>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-violet/4 rounded-full blur-[160px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl bg-surface/60 backdrop-blur-xl border border-white/[0.06] p-8 sm:p-10 shadow-card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-violet/20 border border-accent/20 flex items-center justify-center mx-auto mb-5"><Shield size={28} className="text-accent" /></div>
            <h1 className="font-display font-bold text-2xl text-text mb-2">Admin Panel</h1>
            <p className="text-sm text-muted">Sign in to access the AuroraNft dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted uppercase tracking-wider">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text text-sm placeholder:text-muted-dim outline-none focus:border-accent/40 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter admin password" autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-text text-sm placeholder:text-muted-dim outline-none focus:border-accent/40 transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e); }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-text">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (<div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20"><AlertTriangle size={15} className="text-danger shrink-0" /><p className="text-sm text-danger">{error}</p></div>)}
            <button type="submit" disabled={logging}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00E5FF, #8B5CF6)', color: '#0B0F1A' }}>
              {logging ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <><Lock size={16} /> Sign In</>}
            </button>
          </form>
          <p className="text-center text-[11px] text-muted-dim mt-6">
            Set credentials in <code className="text-accent/60">admin_users</code> table or <code className="text-accent/60">ADMIN_PASSWORD</code> env var
          </p>
        </div>
      </div>
    </div>
  );
}
