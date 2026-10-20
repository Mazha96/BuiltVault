import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProjectCoverCard from '../components/ProjectCoverCard';
import TagInput from '../components/TagInput';
import api from '../api';
import { Plus, FolderOpen, DollarSign, Trash2, Globe, Lock, X } from 'lucide-react';

const CATEGORIES = ['general','electronics','3d-printing','woodworking','metalwork','software','art','other'];

const s = {
  page: { maxWidth: 1152, margin: '0 auto', padding: '2rem 1rem' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  h1: { fontSize: '1.875rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' },
  sub: { color: '#9ca3af', fontSize: '0.875rem' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg,#00d4ff,#ff2d78)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem' },
  empty: { textAlign: 'center', padding: '5rem 1rem', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' },
  card: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s', cursor: 'pointer' },
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' },
  cardTitle: { fontWeight: 600, fontSize: '1.05rem', color: '#e2e8f0', flex: 1 },
  cardDesc: { color: '#9ca3af', fontSize: '0.82rem', marginBottom: '0.75rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  progressBar: { height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, marginBottom: '0.5rem' },
  progressFill: (pct) => ({ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#00d4ff,#ff2d78)', width: `${pct}%` }),
  cardMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' },
  statusTag: (s) => ({ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 9999, fontWeight: 600, background: s==='complete'?'rgba(255,45,120,0.15)':s==='in-progress'?'rgba(0,212,255,0.15)':'rgba(255,255,255,0.07)', color: s==='complete'?'#ff2d78':s==='in-progress'?'#00d4ff':'#9ca3af' }),
  cost: { fontSize: '0.875rem', fontWeight: 600, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 3 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4, display: 'flex' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 },
  modal: { background: '#0d1224', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 16, padding: '1.75rem', width: '100%', maxWidth: 440 },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: '#e2e8f0' },
  formGroup: { marginBottom: '0.875rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.3rem', fontWeight: 500 },
  input: { width: '100%', padding: '0.55rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: '#9ca3af' },
  btnRow: { display: 'flex', gap: '0.75rem', marginTop: '1.25rem' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'general', status: 'draft', is_public: false, tags: [] });

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const createProject = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const r = await api.post('/projects', form);
      nav(`/projects/${r.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation(); e.preventDefault();
    if (!confirm('Delete this project?')) return;
    await api.delete(`/projects/${id}`);
    setProjects(p => p.filter(x => x.id !== id));
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>My <span style={{ color: '#00d4ff' }}>Projects</span></h1>
          <p style={s.sub}>Welcome back, <span style={{ color: '#ff2d78' }}>{user?.username || user?.email}</span></p>
        </div>
        <button onClick={() => setShowNew(true)} style={s.btnPrimary}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : projects.length === 0 ? (
        <div style={s.empty}>
          <FolderOpen size={48} style={{ color: '#374151', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No projects yet. Start your first build!</p>
          <button onClick={() => setShowNew(true)} style={s.btnPrimary}>Create Project</button>
        </div>
      ) : (
        <div style={s.grid}>
          {projects.map(p => (
            <div key={p.id} style={{ position: 'relative' }}>
              <ProjectCoverCard project={p} to={`/projects/${p.id}`} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px 0' }}>
                <span style={s.statusTag(p.status)}>{p.status}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {p.is_public ? <Globe size={12} style={{ color: '#00d4ff' }} /> : <Lock size={12} style={{ color: '#4b5563' }} />}
                  <button onClick={(e) => deleteProject(p.id, e)} style={{ ...s.iconBtn, fontSize: 12 }}
                    onMouseOver={e => e.currentTarget.style.color='#ff2d78'}
                    onMouseOut={e => e.currentTarget.style.color='#4b5563'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div style={s.overlay} onClick={e => e.target===e.currentTarget && setShowNew(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={s.modalTitle}>New Project</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {error && <div style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', borderRadius: 8, padding: '0.6rem 0.75rem', color: '#ff2d78', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={createProject}>
              <div style={s.formGroup}>
                <label style={s.label}>Title *</label>
                <input style={s.input} required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="My awesome project" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Description</label>
                <textarea style={{...s.input, resize: 'none', height: 80}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What are you building?" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div>
                  <label style={s.label}>Category</label>
                  <select style={s.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="in-progress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>
              </div>
              <label style={s.checkRow}>
<div style={{ marginBottom: '0.875rem' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: 4 }}>Tags</label>
                  <TagInput tags={form.tags} onChange={tags => setForm({...form, tags})} />
                  <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: '4px 0 0' }}>Press Enter to add · max 8 tags</p>
                </div>
                <input type="checkbox" checked={form.is_public} onChange={e => setForm({...form, is_public: e.target.checked})} style={{ accentColor: '#00d4ff' }} />
                Make this project public
              </label>
              <div style={s.btnRow}>
                <button type="submit" disabled={submitting} style={{...s.btnPrimary, flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1}}>
                  {submitting ? 'Creating…' : 'Create Project'}
                </button>
                <button type="button" onClick={() => setShowNew(false)} style={{...s.btnSecondary, flex: 1}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
