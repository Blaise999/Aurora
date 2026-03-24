'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Zap, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

export default function FakeActivityRunner() {
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [minDelay, setMinDelay] = useState(30);  // seconds
  const [maxDelay, setMaxDelay] = useState(180);  // seconds
  const timerRef = useRef(null);

  const sendOne = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fake-activity', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSent(p => p + 1);
        setLastResult(data.sent?.[0] || null);
      }
    } catch {}
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000;
    timerRef.current = setTimeout(async () => {
      await sendOne();
      if (running) scheduleNext();
    }, delay);
  }, [running, minDelay, maxDelay, sendOne]);

  useEffect(() => {
    if (running) {
      // Send one immediately, then schedule random intervals
      sendOne();
      scheduleNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (running) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setRunning(false);
    } else {
      setRunning(true);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-violet/10 flex items-center justify-center">
          <Zap size={16} className="text-accent-violet" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-text">Telegram Activity Simulator</h3>
          <p className="text-[11px] text-muted">Sends random mint/buy notifications to your Telegram at random intervals</p>
        </div>
        {running && (
          <Badge color="success" dot>Running</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">Min delay (sec)</label>
          <input
            type="number"
            value={minDelay}
            onChange={e => setMinDelay(Math.max(5, parseInt(e.target.value) || 30))}
            className="w-full rounded-lg border border-border-light bg-surface2/60 px-3 py-2 text-sm font-mono text-text"
            disabled={running}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider">Max delay (sec)</label>
          <input
            type="number"
            value={maxDelay}
            onChange={e => setMaxDelay(Math.max(minDelay + 5, parseInt(e.target.value) || 180))}
            className="w-full rounded-lg border border-border-light bg-surface2/60 px-3 py-2 text-sm font-mono text-text"
            disabled={running}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant={running ? "ghost" : "primary"} size="md" onClick={toggle}>
          {running ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
        </Button>

        <Button variant="secondary" size="md" onClick={sendOne} disabled={running}>
          <Zap size={14} /> Send One Now
        </Button>

        {sent > 0 && (
          <span className="text-xs text-muted font-mono">{sent} sent</span>
        )}
      </div>

      {lastResult && (
        <div className="rounded-lg bg-surface2/40 p-3 text-xs font-mono text-muted">
          Last: {lastResult.type === 'mint' ? '🎨' : '🛒'} {lastResult.nftName} — {lastResult.wallet}
        </div>
      )}
    </Card>
  );
}
