import { useState, useEffect } from 'react';
import api from '../api';
import { Timer, Flame, Clock, Calendar, Trash2, Plus, TrendingUp } from 'lucide-react';

const s = {
  card: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' },
  statCard: { background: '#060d2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '1rem', textAlign: 'center' },
  statVal: { fontSize: '1.5rem', fontWeight: 800 },
  statLabel: { fontSize: '0.7rem', color: '#6b7280', marginTop: 2 },
  h3: { fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' },
  input: { width: '100%', padding: '0.55rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
  label: { display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem', fontWeight: 500 },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg,#00d4ff,#ff2d78)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' },
  btnGhost: { background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: 4 },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  duration: { fontWeight: 700, color: '#00d4ff', fontSize: '0.95rem', minWidth: 60 },
  notes: { color: '#e2e8f0', fontSize: '0.875rem', flex: 1 },
  meta: { fontSize: '0.7rem', color: '#4b5563', marginTop: 2 },
  barWrap: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 48, marginTop: 8 },
  quickBtns: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' },
  quickBtn: (active) => ({ padding: '0.3rem 0.75rem', borderRadius: 99, border: `1px solid ${active ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(0,212,255,0.15)' : 'transparent', color: active ? '#00d4ff' : '#9ca3af', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }),
};

function fmtMins(m) {
  if (!m) return '0m';
  const h = Math.floor(m / 60), mins = m % 60;
  return h > 0 ? `${h}h ${mins > 0 ? mins + 'm' : ''}`.trim() : `${mins}m`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

// Read-only summary for visitors (uses the public, no-auth endpoint).
function PublicTimeSummary({ data, error }) {
  if (error || !data) {
    return (
      <div style={{ ...s.card, color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
        Time stats are not available for this project.
      </div>
    );
  }
  const { logs = [], totalMinutes = 0, sessionCount = 0, activeDays = 0 } = data;
  return (
    <div>
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#00d4ff' }}>{fmtMins(totalMinutes)}</div>
          <div style={s.statLabel}>Total Time</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#ff2d78' }}>{sessionCount}</div>
          <div style={s.statLabel}>Sessions</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#a78bfa' }}>{activeDays}</div>
          <div style={s.statLabel}>Active Days</div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.h3}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Recent Sessions</div>
        {logs.length === 0 && (
          <div style={{ color: '#4b5563', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No work sessions logged yet.</div>
        )}
        {logs.slice(0, 10).map((log, i) => (
          <div key={`${log.logged_at}-${i}`} style={{ ...s.logRow, alignItems: 'center' }}>
            <div style={s.duration}>{fmtMins(log.duration_minutes)}</div>
            <div style={{ ...s.meta, marginTop: 0, fontSize: '0.8rem', color: '#6b7280' }}>{fmtDate(log.logged_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimeLogTab({ projectId, isOwner }) {
  // Owners get their full log + streaks; visitors get the public read-only summary.
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${projectId}|${isOwner ? 'owner' : 'public'}|${reloadKey}`;
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ duration_minutes: '', notes: '', logged_at: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quickMin, setQuickMin] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const url = isOwner ? `/timelogs/${projectId}` : `/timelogs/${projectId}/public`;
    api.get(url)
      .then(r => { if (!cancelled) setResult({ key: requestKey, data: r.data, error: '' }); })
      .catch(err => {
        if (!cancelled) setResult({ key: requestKey, data: null, error: err.response?.data?.error || 'Could not load time logs' });
      });
    return () => { cancelled = true; };
  }, [projectId, isOwner, requestKey]);

  const load = () => setReloadKey(k => k + 1);
  const loading = result.key !== requestKey;
  const data = result.data;

  function pickQuick(mins) {
    setQuickMin(mins);
    setForm(f => ({ ...f, duration_minutes: mins }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.duration_minutes) return;
    setSubmitting(true); setError('');
    try {
      await api.post(`/timelogs/${projectId}`, {
        duration_minutes: parseInt(form.duration_minutes),
        notes: form.notes,
        logged_at: form.logged_at ? new Date(form.logged_at).toISOString() : new Date().toISOString()
      });
      setForm({ duration_minutes: '', notes: '', logged_at: '' });
      setQuickMin(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSubmitting(false); }
  }

  async function deleteLog(id) {
    if (!confirm('Delete this session?')) return;
    await api.delete(`/timelogs/${projectId}/${id}`);
    load();
  }

  if (loading) return <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>Loading…</div>;

  if (!isOwner) return <PublicTimeSummary data={data} error={result.error} />;

  const { logs = [], totalMinutes = 0, weeklyMinutes = 0, streak = 0, bestStreak = 0, chartData = [], achievements = [] } = data || {};

  const MILESTONE_META = {
    3:   { emoji: '🔥',  title: 'On a Roll',    color: '#fb923c' },
    7:   { emoji: '🔥',  title: 'One Week',     color: '#f97316' },
    14:  { emoji: '⚡',  title: 'Two Weeks',    color: '#00d4ff' },
    30:  { emoji: '🏆',  title: 'One Month',    color: '#fbbf24' },
    60:  { emoji: '💀',  title: 'Unstoppable',  color: '#ff2d78' },
    100: { emoji: '👑',  title: 'Legend',       color: '#a78bfa' },
  };
  const ALL_MILESTONES = [3, 7, 14, 30, 60, 100];
  const unlockedMilestones = achievements.map(a => a.milestone);

  // Chart: max bar height proportional to max day
  const maxMins = Math.max(...chartData.map(d => d.minutes), 1);
  // Show only last 14 days in chart to keep it compact
  const chartSlice = chartData.slice(-14);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#00d4ff' }}>{fmtMins(totalMinutes)}</div>
          <div style={s.statLabel}>Total Time</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: streak > 0 ? '#fb923c' : '#4b5563' }}>
            {streak > 0 ? `🔥 ${streak}` : '—'}
          </div>
          <div style={s.statLabel}>Current Streak</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#fbbf24' }}>{bestStreak || '—'}</div>
          <div style={s.statLabel}>Best Streak</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statVal, color: '#a78bfa' }}>{fmtMins(weeklyMinutes)}</div>
          <div style={s.statLabel}>This Week</div>
        </div>
      </div>

      {/* Milestone badges */}
      <div style={{ ...s.card, marginBottom: '1rem' }}>
        <div style={s.h3}>Milestones</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ALL_MILESTONES.map(m => {
            const meta = MILESTONE_META[m];
            const unlocked = unlockedMilestones.includes(m);
            return (
              <div key={m} title={`${m}-day streak: ${meta.title}`} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '0.75rem 1rem', borderRadius: 10,
                border: `1px solid ${unlocked ? meta.color : 'rgba(255,255,255,0.07)'}`,
                background: unlocked ? meta.color + '15' : 'rgba(255,255,255,0.02)',
                opacity: unlocked ? 1 : 0.4, minWidth: 70,
              }}>
                <div style={{ fontSize: '1.5rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>{meta.emoji}</div>
                <div style={{ fontSize: '0.65rem', color: unlocked ? meta.color : '#4b5563', fontWeight: 700 }}>{m} days</div>
                <div style={{ fontSize: '0.6rem', color: '#6b7280', textAlign: 'center' }}>{meta.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity chart — last 14 days */}
      {chartSlice.some(d => d.minutes > 0) && (
        <div style={{ ...s.card, paddingBottom: '0.75rem' }}>
          <div style={s.h3}><TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />Last 14 Days</div>
          <div style={s.barWrap}>
            {chartSlice.map(d => {
              const pct = d.minutes / maxMins;
              const active = d.minutes > 0;
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${d.date}: ${fmtMins(d.minutes)}`}>
                  <div style={{
                    width: '100%', borderRadius: 3,
                    height: active ? Math.max(pct * 44, 4) : 2,
                    background: active ? `rgba(0,212,255,${0.3 + pct * 0.7})` : 'rgba(255,255,255,0.05)',
                    transition: 'height 0.3s'
                  }} />
                  <div style={{ fontSize: '0.55rem', color: '#4b5563', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {new Date(d.date + 'T12:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log session button */}
      {isOwner && (
        <div style={{ marginBottom: '1rem' }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={s.btn}>
              <Plus size={15} /> Log Session
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={s.card}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem', fontSize: '0.95rem' }}>Log a work session</div>

              {/* Quick duration buttons */}
              <label style={s.label}>Duration</label>
              <div style={s.quickBtns}>
                {QUICK_DURATIONS.map(m => (
                  <button key={m} type="button" onClick={() => pickQuick(m)} style={s.quickBtn(quickMin === m)}>
                    {fmtMins(m)}
                  </button>
                ))}
              </div>
              <input
                type="number" min="1" max="1440" placeholder="Or type custom minutes…"
                value={form.duration_minutes}
                onChange={e => { setForm(f => ({ ...f, duration_minutes: e.target.value })); setQuickMin(null); }}
                style={{ ...s.input, marginBottom: '0.75rem' }}
              />

              <label style={s.label}>Notes (optional)</label>
              <input
                type="text" placeholder="What did you work on?"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ ...s.input, marginBottom: '0.75rem' }}
              />

              <label style={s.label}>Date (leave blank for today)</label>
              <input
                type="date"
                value={form.logged_at}
                onChange={e => setForm(f => ({ ...f, logged_at: e.target.value }))}
                style={{ ...s.input, marginBottom: '1rem' }}
              />

              {error && <div style={{ color: '#ff2d78', fontSize: '0.8rem', marginBottom: 8 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submitting || !form.duration_minutes} style={{ ...s.btn, opacity: submitting || !form.duration_minutes ? 0.5 : 1 }}>
                  {submitting ? 'Saving…' : '✓ Save Session'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(''); }} style={{ ...s.btnGhost, color: '#9ca3af', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Log list */}
      <div style={s.card}>
        <div style={s.h3}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Session History ({logs.length})</div>
        {logs.length === 0 && (
          <div style={{ color: '#4b5563', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
            No sessions logged yet.{isOwner ? ' Hit "Log Session" to start your streak.' : ''}
          </div>
        )}
        {logs.map(log => (
          <div key={log.id} style={s.logRow}>
            <div>
              <div style={s.duration}>{fmtMins(log.duration_minutes)}</div>
              <div style={s.meta}>{fmtDate(log.logged_at)}</div>
            </div>
            <div style={{ flex: 1 }}>
              {log.notes ? <div style={s.notes}>{log.notes}</div> : <div style={{ color: '#4b5563', fontSize: '0.8rem', fontStyle: 'italic' }}>No notes</div>}
            </div>
            {isOwner && (
              <button onClick={() => deleteLog(log.id)} style={s.btnGhost} title="Delete">
                <Trash2 size={14} color="#4b5563" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
