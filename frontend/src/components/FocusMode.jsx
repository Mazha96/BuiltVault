import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

const MILESTONE_DATA = {
  3:   { emoji: '🔥',  title: 'On a Roll',    color: '#fb923c' },
  7:   { emoji: '🔥',  title: 'One Week',     color: '#f97316' },
  14:  { emoji: '⚡',  title: 'Two Weeks',    color: '#00d4ff' },
  30:  { emoji: '🏆',  title: 'One Month',    color: '#fbbf24' },
  60:  { emoji: '💀',  title: 'Unstoppable',  color: '#ff2d78' },
  100: { emoji: '👑',  title: 'Legend',       color: '#a78bfa' },
};

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

// Simple confetti burst
function makeConfettiPieces() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#00d4ff','#ff2d78','#fbbf24','#a78bfa','#34d399'][i % 5],
    delay: Math.random() * 0.5,
    size: 6 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 200,
  }));
}

function Confetti({ active }) {
  // Random layout is computed once per mount (lazy initializer), keeping render pure.
  const [pieces] = useState(makeConfettiPieces);

  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10001, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -20,
          width: p.size, height: p.size, borderRadius: p.id % 3 === 0 ? '50%' : 2,
          background: p.color,
          animation: `confettiFall 1.8s ${p.delay}s ease-in forwards`,
          '--drift': `${p.drift}px`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift)) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function FocusMode({ project, onClose, onLogged }) {
  const DURATIONS = [
    { label: '25 min', seconds: 25 * 60 },
    { label: '30 min', seconds: 30 * 60 },
    { label: '1 hour', seconds: 60 * 60 },
  ];

  const [phase, setPhase] = useState('pick'); // pick | running | paused | done | logging | reward
  const [totalSeconds, setTotalSeconds] = useState(30 * 60);
  const [remaining, setRemaining] = useState(30 * 60);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reward, setReward] = useState(null); // { milestone, emoji, title, desc, color }
  const [confetti, setConfetti] = useState(false);
  const [streak, setStreak] = useState(null);
  const intervalRef = useRef(null);

  const pct = ((totalSeconds - remaining) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 110;
  const strokeDash = circumference - (pct / 100) * circumference;

  function playDone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch (err) {
      // Web Audio unavailable or blocked; the chime is optional.
      console.debug('Focus chime unavailable', err);
    }
  }

  const tick = useCallback(() => {
    setRemaining(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        setPhase('done');
        playDone();
        // Browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification('Focus session complete! 🎉', {
            body: `Great work on "${project.title}". Time to log your progress.`,
            icon: '/favicon.ico'
          });
        }
        return 0;
      }
      return prev - 1;
    });
  }, [project.title]);

  function start(seconds) {
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setPhase('running');
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [phase, tick]);

  function togglePause() {
    setPhase(p => p === 'running' ? 'paused' : 'running');
  }

  async function handleLog() {
    setSubmitting(true);
    try {
      const res = await api.post(`/timelogs/${project.id}`, {
        duration_minutes: Math.round((totalSeconds - remaining) / 60) || Math.round(totalSeconds / 60),
        notes,
        focus_session: true,
      });
      setStreak(res.data.streak);
      if (res.data.newAchievement) {
        setReward(res.data.newAchievement);
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2500);
        setPhase('reward');
      } else {
        setPhase('streakshow');
      }
      onLogged?.();
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally { setSubmitting(false); }
  }

  // Color shifts as time runs out
  const urgentColor = remaining < 60 ? '#ff2d78' : remaining < 300 ? '#fbbf24' : '#00d4ff';

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(4,8,28,0.97)',
    backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
  };

  return (
    <>
      <Confetti active={confetti} />
      <div style={overlay}>

        {/* ── PICK DURATION ── */}
        {phase === 'pick' && (
          <div style={{ textAlign: 'center', maxWidth: 400, padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎯</div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>Focus Mode</h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Lock in on <strong style={{ color: '#00d4ff' }}>{project.title}</strong>.<br />
              Pick your session length and get to work.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: '2rem' }}>
              {DURATIONS.map(d => (
                <button key={d.label} onClick={() => start(d.seconds)} style={{
                  padding: '1rem 1.5rem', borderRadius: 12, border: '2px solid rgba(0,212,255,0.3)',
                  background: 'rgba(0,212,255,0.08)', color: '#00d4ff', fontWeight: 800,
                  fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s'
                }}
                  onMouseOver={e => { e.currentTarget.style.background='rgba(0,212,255,0.2)'; e.currentTarget.style.borderColor='#00d4ff'; }}
                  onMouseOut={e => { e.currentTarget.style.background='rgba(0,212,255,0.08)'; e.currentTarget.style.borderColor='rgba(0,212,255,0.3)'; }}>
                  {d.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
          </div>
        )}

        {/* ── RUNNING / PAUSED ── */}
        {(phase === 'running' || phase === 'paused') && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>
              {phase === 'paused' ? '⏸ Paused' : '⚡ Focusing on'}
            </div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem', marginBottom: '2rem' }}>
              {project.title}
            </div>

            {/* Circular timer */}
            <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto 2rem' }}>
              <svg width="260" height="260" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="130" cy="130" r="110" fill="none"
                  stroke={urgentColor} strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, color: urgentColor, fontFamily: 'monospace', letterSpacing: -2, transition: 'color 0.5s' }}>
                  {formatTime(remaining)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: 4 }}>
                  {phase === 'paused' ? 'PAUSED' : 'REMAINING'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button onClick={togglePause} style={{
                padding: '0.75rem 2rem', borderRadius: 10, border: 'none',
                background: phase === 'paused' ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                color: phase === 'paused' ? '#0a0e1a' : '#e2e8f0',
                fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
              }}>
                {phase === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button onClick={() => { setPhase('done'); clearInterval(intervalRef.current); }} style={{
                padding: '0.75rem 1.5rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'none', color: '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
              }}>
                End Early
              </button>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: '0.8rem' }}>
              Abandon session
            </button>
          </div>
        )}

        {/* ── DONE — LOG PROMPT ── */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center', maxWidth: 440, padding: '2rem', width: '100%' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🎉</div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.5rem', marginBottom: 4 }}>Session complete!</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {Math.round(totalSeconds / 60)} minutes on <strong style={{ color: '#00d4ff' }}>{project.title}</strong>.<br />
              What did you get done?
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe what you worked on… (optional)"
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '0.75rem', background: '#0d1224',
                border: '1px solid rgba(0,212,255,0.25)', borderRadius: 10,
                color: '#e2e8f0', fontSize: '0.9rem', outline: 'none',
                resize: 'vertical', marginBottom: '1rem', boxSizing: 'border-box',
                colorScheme: 'dark'
              }}
            />
            <button onClick={handleLog} disabled={submitting} style={{
              width: '100%', padding: '0.875rem', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#00d4ff,#ff2d78)',
              color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
              opacity: submitting ? 0.6 : 1, marginBottom: 8
            }}>
              {submitting ? 'Saving…' : '✓ Log Progress'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '0.8rem' }}>
              Skip logging
            </button>
          </div>
        )}

        {/* ── STREAK SHOW (no new milestone) ── */}
        {phase === 'streakshow' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: 8 }}>
              {streak > 0 ? '🔥' : '✅'}
            </div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '1.5rem', marginBottom: 8 }}>Logged!</h2>
            {streak > 0 && (
              <div style={{ fontSize: '1.1rem', color: '#fb923c', fontWeight: 700, marginBottom: 8 }}>
                {streak} day streak 🔥
              </div>
            )}
            <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
              Keep showing up every day to build your streak.
              {streak > 0 && (() => {
                const next = [3,7,14,30,60,100].find(m => m > streak);
                return next ? ` Next milestone: ${MILESTONE_DATA[next]?.emoji} ${MILESTONE_DATA[next]?.title} at ${next} days.` : ' You\'re a legend!';
              })()}
            </p>
            <button onClick={onClose} style={{
              padding: '0.75rem 2.5rem', borderRadius: 10, border: 'none',
              background: '#00d4ff', color: '#0a0e1a', fontWeight: 800, cursor: 'pointer', fontSize: '1rem'
            }}>
              Back to project
            </button>
          </div>
        )}

        {/* ── REWARD / MILESTONE UNLOCKED ── */}
        {phase === 'reward' && reward && (
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
            <div style={{ fontSize: '6rem', marginBottom: 12, animation: 'rewardPop 0.5s ease-out' }}>
              {reward.emoji}
            </div>
            <div style={{
              display: 'inline-block', padding: '0.25rem 1rem', borderRadius: 99,
              background: (reward.color || '#fbbf24') + '22',
              border: `1px solid ${reward.color || '#fbbf24'}`,
              color: reward.color || '#fbbf24', fontWeight: 800, fontSize: '0.8rem',
              marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase'
            }}>
              Achievement Unlocked
            </div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '2rem', marginBottom: 8 }}>
              {reward.title}
            </h2>
            <div style={{ color: '#9ca3af', marginBottom: 8 }}>
              <strong style={{ color: reward.color || '#fbbf24' }}>{reward.milestone} day streak</strong> on {project.title}
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '2rem' }}>{reward.desc}</p>
            <button onClick={onClose} style={{
              padding: '0.875rem 3rem', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${reward.color || '#fbbf24'}, #ff2d78)`,
              color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
            }}>
              Let's go! 🚀
            </button>
            <style>{`
              @keyframes rewardPop {
                0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
                70%  { transform: scale(1.2) rotate(5deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
            `}</style>
          </div>
        )}

      </div>
    </>
  );
}
