import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Upload, ChevronLeft, CheckCircle, XCircle, AlertCircle, Package, Zap } from 'lucide-react';

const SOURCES = [
  { id: 'amazon',    label: 'Amazon',    color: '#ff9900', steps: ['Go to amazon.com/gp/b2b/reports', 'Select date range → Report type: "Items"', 'Download CSV'] },
  { id: 'digikey',   label: 'DigiKey',   color: '#cc0000', steps: ['Account → Order History', 'Click "Export" on any order or date range', 'Download CSV'] },
  { id: 'mouser',    label: 'Mouser',    color: '#0073b7', steps: ['Account → Order History', 'Select orders → Export to CSV'] },
  { id: 'lcsc',      label: 'LCSC',      color: '#0079c1', steps: ['Account → Orders', 'Open each order → Export CSV button'] },
  { id: 'aliexpress',label: 'AliExpress',color: '#ff4747', steps: ['Use "AliExpress Order History Export" Chrome extension', 'Or: Account → Orders → Export (if available)'] },
];

const CATEGORY_COLORS = {
  electronics: '#00d4ff', tools: '#fbbf24', filament: '#a78bfa',
  hardware: '#6b7280', power: '#34d399', audio_video: '#f472b6', maker_misc: '#fb923c', other: '#4b5563'
};
const CATEGORY_LABELS = {
  electronics: 'Electronics', tools: 'Tools', filament: '3D Printing',
  hardware: 'Hardware', power: 'Power', audio_video: 'Audio/Video', maker_misc: 'Maker Misc', other: 'Other'
};

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' },
  h1: { fontSize: '1.75rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 4 },
  sub: { color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem' },
  card: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' },
  label: { fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 1 },
  btn: (color='#00d4ff') => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', background: color, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }),
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' },
  tag: (color) => ({ display: 'inline-block', padding: '1px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: color + '22', color, border: `1px solid ${color}44` }),
  badge: (verdict) => {
    const map = { keep: '#34d399', review: '#fbbf24', skip: '#4b5563' };
    return { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: (map[verdict]||'#4b5563') + '22', color: map[verdict]||'#4b5563', border: `1px solid ${(map[verdict]||'#4b5563')}44` };
  },
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, marginBottom: 4, background: 'rgba(255,255,255,0.03)' },
  select: { padding: '0.3rem 0.5rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', colorScheme: 'dark' }
};

export default function ImportInventory() {
  const nav = useNavigate();
  const fileRef = useRef();
  const [step, setStep] = useState(1); // 1=select source, 2=upload+preview, 3=review, 4=done
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { items, stats }
  const [items, setItems] = useState([]); // local editable copy
  const [savedCount, setSavedCount] = useState(0);

  const srcInfo = SOURCES.find(s => s.id === source);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('source', source);
    try {
      // Explicitly set multipart — axios interceptor handles auth header
      const res = await api.post('/inventory/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setPreview(data);
      // Start with keep+review items in editable list; skip = hidden
      setItems(data.items.map(i => ({ ...i, _userVerdict: i.verdict })));
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally { setLoading(false); }
  }

  function setVerdict(tmpId, verdict) {
    setItems(prev => prev.map(i => i._tmpId === tmpId ? { ...i, _userVerdict: verdict } : i));
  }
  function setCategory(tmpId, cat) {
    setItems(prev => prev.map(i => i._tmpId === tmpId ? { ...i, category: cat } : i));
  }

  async function handleConfirm() {
    setLoading(true); setError('');
    // Send items with user's verdict applied
    const toSend = items.map(i => ({ ...i, verdict: i._userVerdict }));
    try {
      const res = await api.post('/inventory/import/confirm', { items: toSend });
      setSavedCount(res.data.saved);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setLoading(false); }
  }

  const keepItems = items.filter(i => i._userVerdict === 'keep');
  const reviewItems = items.filter(i => i._userVerdict === 'review');
  const skipItems = items.filter(i => i._userVerdict === 'skip');

  return (
    <div style={s.page}>
      {/* Header */}
      <button onClick={() => nav('/inventory')} style={{ ...s.btnGhost, marginBottom: '1.5rem' }}>
        <ChevronLeft size={16} /> Back to Inventory
      </button>
      <h1 style={s.h1}>📦 Import Purchase History</h1>
      <p style={s.sub}>Upload a CSV from Amazon, DigiKey, Mouser, LCSC or AliExpress. We'll auto-filter maker-relevant items and let you review before saving.</p>

      {/* Step 1 — Choose source */}
      {step === 1 && (
        <div style={s.card}>
          <span style={s.label}>Step 1 — Select your platform</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {SOURCES.map(src => (
              <button key={src.id} onClick={() => setSource(src.id)}
                style={{ padding: '1rem', borderRadius: 10, border: `2px solid ${source===src.id ? src.color : 'rgba(255,255,255,0.08)'}`,
                  background: source===src.id ? src.color+'22' : '#0a0e1a', color: source===src.id ? src.color : '#9ca3af',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.15s' }}>
                {src.label}
              </button>
            ))}
          </div>

          {srcInfo && (
            <div style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, color: '#00d4ff', marginBottom: 8, fontSize: '0.875rem' }}>📋 How to export from {srcInfo.label}</div>
              <ol style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.8 }}>
                {srcInfo.steps.map((s,i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}

          <button onClick={() => source && setStep(2)} disabled={!source}
            style={{ ...s.btn('#00d4ff'), opacity: source ? 1 : 0.4 }}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 2 — Upload */}
      {step === 2 && (
        <div style={s.card}>
          <span style={s.label}>Step 2 — Upload your CSV</span>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed rgba(0,212,255,0.3)', borderRadius: 12, padding: '3rem', textAlign: 'center', cursor: 'pointer',
              background: 'rgba(0,212,255,0.04)', transition: 'all 0.15s' }}
            onMouseOver={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.7)'}
            onMouseOut={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.3)'}>
            <Upload size={36} color="#00d4ff" style={{ marginBottom: 12 }} />
            <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>Drop CSV here or click to browse</div>
            <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Max 5MB · {srcInfo?.label} format</div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
          {loading && <div style={{ textAlign: 'center', color: '#00d4ff', marginTop: 16 }}>Analyzing your orders…</div>}
          {error && <div style={{ color: '#ff2d78', marginTop: 12, fontSize: '0.875rem' }}>{error}</div>}
          <button onClick={() => setStep(1)} style={{ ...s.btnGhost, marginTop: 16 }}><ChevronLeft size={14}/> Back</button>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && preview && (
        <>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total items', val: preview.stats.total, color: '#9ca3af' },
              { label: '✅ Auto-kept', val: keepItems.length, color: '#34d399' },
              { label: '⚠️ Needs review', val: reviewItems.length, color: '#fbbf24' },
              { label: '🚫 Skipped', val: skipItems.length, color: '#4b5563' }
            ].map(stat => (
              <div key={stat.label} style={{ background: '#0d1224', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.val}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {error && <div style={{ color: '#ff2d78', marginBottom: 12, fontSize: '0.875rem' }}>{error}</div>}

          {/* Review items — show keep, then review, then toggle for skip */}
          {[
            { list: keepItems,   title: '✅ Will be imported', color: '#34d399', defaultOpen: true },
            { list: reviewItems, title: '⚠️ Flagged for review — decide below', color: '#fbbf24', defaultOpen: true },
            { list: skipItems,   title: '🚫 Will be skipped', color: '#4b5563', defaultOpen: false },
          ].map(({ list, title, color, defaultOpen }) => list.length > 0 && (
            <details key={title} open={defaultOpen} style={s.card}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color, fontSize: '0.9rem', marginBottom: 12, userSelect: 'none' }}>
                {title} ({list.length})
              </summary>
              <div style={{ marginTop: 12 }}>
                {list.map(item => (
                  <div key={item._tmpId} style={s.row}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 2 }}>
                        {item.order_date && <span>{item.order_date} · </span>}
                        {item.price_paid > 0 && <span>${item.price_paid} · </span>}
                        {item.matched_keyword && <span>matched: "{item.matched_keyword}"</span>}
                      </div>
                    </div>
                    {/* Category selector */}
                    <select value={item.category} onChange={e => setCategory(item._tmpId, e.target.value)} style={s.select}>
                      {Object.entries(CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {/* Verdict buttons */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button title="Import this item" onClick={() => setVerdict(item._tmpId, 'keep')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: item._userVerdict==='keep' ? '#34d399' : '#374151' }}>
                        <CheckCircle size={18} />
                      </button>
                      <button title="Skip this item" onClick={() => setVerdict(item._tmpId, 'skip')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: item._userVerdict==='skip' ? '#ff2d78' : '#374151' }}>
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={() => setStep(2)} style={s.btnGhost}><ChevronLeft size={14}/> Re-upload</button>
            <button onClick={handleConfirm} disabled={loading || keepItems.length === 0}
              style={{ ...s.btn('linear-gradient(135deg,#ff2d78,#00d4ff)'), opacity: loading || keepItems.length===0 ? 0.5 : 1 }}>
              {loading ? 'Saving…' : `Import ${keepItems.length} items →`}
            </button>
          </div>
        </>
      )}

      {/* Step 4 — Done */}
      {step === 4 && (
        <div style={{ ...s.card, textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={48} color="#34d399" style={{ marginBottom: 16 }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>
            {savedCount} items imported!
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 24 }}>
            They're now in your inventory and can be added to any project BOM.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => nav('/inventory')} style={s.btn('#00d4ff')}>
              <Package size={16}/> View Inventory
            </button>
            <button onClick={() => { setStep(1); setSource(null); setPreview(null); setItems([]); }} style={s.btnGhost}>
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
