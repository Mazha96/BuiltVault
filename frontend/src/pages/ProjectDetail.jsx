import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { CheckSquare, Square, Plus, Trash2, DollarSign, FileText, Upload, Globe, Lock, Printer, ArrowLeft, Edit2, Check, X } from 'lucide-react';
import CoverUploader from '../components/CoverUploader';
import PostCard from '../components/PostCard';
import TimeLogTab from '../components/TimeLogTab';
import FocusMode from '../components/FocusMode';

const TASK_CATS = ['general','design','sourcing','build','testing','done'];

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' },
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem' },
  card: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  cardHighlight: { background: '#0d1224', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  h1: { fontSize: '1.875rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' },
  h2: { fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem' },
  h3: { fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  desc: { color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' },
  statCard: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' },
  statVal: { fontSize: '1.5rem', fontWeight: 800, color: '#00d4ff' },
  statLabel: { fontSize: '0.7rem', color: '#6b7280', marginTop: 2 },
  progressBar: { height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, marginBottom: '1.5rem', overflow: 'hidden' },
  progressFill: pct => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#00d4ff,#ff2d78)', borderRadius: 9999 }),
  tabs: { display: 'flex', gap: 4, background: '#060d2e', borderRadius: 12, padding: 4, marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' },
  tab: active => ({ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s', background: active ? '#00d4ff' : 'transparent', color: active ? '#0a0e1a' : '#9ca3af' }),
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  input: { width: '100%', padding: '0.55rem 0.75rem', background: '#0a0e1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
  label: { display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.3rem', fontWeight: 500 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'linear-gradient(135deg,#00d4ff,#ff2d78)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: 4 },
  divider: { borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0.5rem 0' },
  bomItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  taskItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  fileItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: '#0a0e1a', borderRadius: 8, marginBottom: '0.5rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' },
  tag: color => ({ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 9999, background: `${color}18`, color: color, fontWeight: 600, border: `1px solid ${color}40` }),
  infoRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' },
  infoLabel: { color: '#6b7280' },
  infoVal: { color: '#e2e8f0' },
  uploadZone: { border: '2px dashed rgba(0,212,255,0.2)', borderRadius: 12, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', display: 'block' },
  formSection: { background: '#060d2e', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, padding: '1.25rem', marginTop: '1rem' },
  addSectionTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#00d4ff', marginBottom: '1rem' },
  errorBox: { background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', borderRadius: 8, padding: '0.6rem 0.75rem', color: '#ff2d78', fontSize: '0.85rem', marginBottom: '1rem' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [focusMode, setFocusMode] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [uploading, setUploading] = useState(false);

  const [newTask, setNewTask] = useState({ title: '', category: 'build' });
  const [addingTask, setAddingTask] = useState(false);

  const [newBom, setNewBom] = useState({ name: '', qty: 1, unit: 'pcs', unit_cost: 0, supplier: '', supplier_url: '', is_3d_printed: false, filament_type: 'PLA', filament_grams: 0, filament_cost_per_kg: 20 });
  const [addingBom, setAddingBom] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [creatorFollowLoading, setCreatorFollowLoading] = useState(false);

  const load = () =>
    api.get(`/projects/${id}`)
      .then(r => { setProject(r.data); setTitleVal(r.data.title); })
      .catch(e => setError(e.response?.data?.error || 'Could not load project'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id, user?.id]);

  const isOwner = user && project && String(user.id) === String(project.user_id);
  const canFollowCreator = user && project && !isOwner;

  const toggleTask = async task => {
    await api.put(`/projects/${id}/tasks/${task.id}`, { is_done: !task.is_done });
    load();
  };

  const handleFollowProject = async () => {
    if (!project || !user) return;
    setFollowLoading(true);
    try {
      if (project.is_following_project) await api.delete(`/follow/projects/${project.id}`);
      else await api.post(`/follow/projects/${project.id}`);
      load();
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowCreator = async () => {
    if (!project || !user || !canFollowCreator) return;
    setCreatorFollowLoading(true);
    try {
      if (project.is_following_creator) await api.delete(`/follow/users/${project.user_id}`);
      else await api.post(`/follow/users/${project.user_id}`);
      load();
    } finally {
      setCreatorFollowLoading(false);
    }
  };

  const addTask = async e => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setAddingTask(true);
    try {
      await api.post(`/projects/${id}/tasks`, newTask);
      setNewTask({ title: '', category: 'build' });
      load();
    } finally { setAddingTask(false); }
  };

  const deleteTask = async tid => {
    await api.delete(`/projects/${id}/tasks/${tid}`);
    load();
  };

  const addBom = async e => {
    e.preventDefault();
    setAddingBom(true);
    try {
      await api.post(`/projects/${id}/bom`, newBom);
      setNewBom({ name: '', qty: 1, unit: 'pcs', unit_cost: 0, supplier: '', supplier_url: '', is_3d_printed: false, filament_type: 'PLA', filament_grams: 0, filament_cost_per_kg: 20 });
      load();
    } finally { setAddingBom(false); }
  };

  const deleteBom = async bid => {
    await api.delete(`/projects/${id}/bom/${bid}`);
    load();
  };

  const togglePublic = async () => {
    await api.put(`/projects/${id}`, { is_public: project.is_public ? 0 : 1 });
    load();
  };

  const saveTitle = async () => {
    await api.put(`/projects/${id}`, { title: titleVal });
    setEditTitle(false);
    load();
  };

  const uploadFile = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/files/${id}`, fd);
      load();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally { setUploading(false); }
  };

  const deleteFile = async fid => {
    await api.delete(`/files/${id}/${fid}`);
    load();
  };

  if (loading) return <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>;
  if (error) return <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#ff2d78' }}>{error}</div>;
  if (!project) return null;

  const tabs = ['overview', 'bom', 'tasks', 'files', 'updates', 'timelog'];

  return (
    <div style={s.page}>
      <Link to="/dashboard" style={s.back}><ArrowLeft size={14} /> Back to Dashboard</Link>

      {/* Cover Photo */}
      {(project.cover_url || isOwner) && (
        <div style={{ marginBottom: '1.5rem', borderRadius: 14, overflow: 'hidden', border: '1px solid #1e2a3a', position: 'relative' }}>
          {project.cover_url ? (
            <img src={project.cover_url} alt={project.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
          ) : (
            <div style={{ minHeight: 140, background: 'linear-gradient(135deg, #0a1628, #0d2137)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 40 }}>📷</span>
              <span style={{ color: '#8892a4', fontSize: 14 }}>No cover photo yet</span>
            </div>
          )}
          {isOwner && (
            <CoverUploader
              projectId={project.id}
              currentCover={project.cover_url}
              onUpdate={url => setProject(p => ({ ...p, cover_url: url }))}
              compact
            />
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ ...s.rowBetween, marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          {editTitle && isOwner ? (
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input style={{ ...s.input, fontSize: '1.5rem', fontWeight: 700 }} value={titleVal} onChange={e => setTitleVal(e.target.value)} autoFocus />
              <button onClick={saveTitle} style={s.btnPrimary}><Check size={16} /></button>
              <button onClick={() => setEditTitle(false)} style={s.btnSecondary}><X size={16} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={s.h1}>{project.title}</h1>
              {isOwner && <button onClick={() => setEditTitle(true)} style={{ ...s.btnIcon, color: '#6b7280' }}><Edit2 size={14} /></button>}
            </div>
          )}
          {isOwner && (
            <button onClick={togglePublic} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.875rem', borderRadius: 8, border: project.is_public ? '1px solid rgba(0,212,255,0.5)' : '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: project.is_public ? '#00d4ff' : '#6b7280', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
              {project.is_public ? <><Globe size={14} /> Public</> : <><Lock size={14} /> Private</>}
            </button>
          )}
        </div>
        <p style={s.desc}>{project.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{project.followers_count || 0} follower{(project.followers_count || 0) === 1 ? '' : 's'}</span>
          {user && !isOwner && (
            <button onClick={handleFollowProject} disabled={followLoading}
              style={{
                ...s.btnSecondary,
                background: project.is_following_project ? 'rgba(0,212,255,0.15)' : s.btnSecondary.background,
                border: project.is_following_project ? '1px solid rgba(0,212,255,0.4)' : s.btnSecondary.border,
                color: '#e2e8f0'
              }}>
              {followLoading ? 'Please wait…' : project.is_following_project ? 'Following Project' : 'Follow Project'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: '999px', background: '#111637', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontWeight: 700 }}>
            {(project.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Creator</div>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{project.username || 'Unknown'}</div>
          </div>
          {canFollowCreator && (
            <button onClick={handleFollowCreator} disabled={creatorFollowLoading}
              style={{
                ...s.btnSecondary,
                background: project.is_following_creator ? 'rgba(255,45,120,0.1)' : s.btnSecondary.background,
                border: project.is_following_creator ? '1px solid rgba(255,45,120,0.35)' : s.btnSecondary.border,
              }}>
              {creatorFollowLoading ? 'Please wait…' : project.is_following_creator ? 'Following Creator' : 'Follow Creator'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          <div style={s.statCard}><div style={s.statVal}>{project.progress}%</div><div style={s.statLabel}>Complete</div></div>
          <div style={s.statCard}><div style={{ ...s.statVal, color: '#ff2d78' }}>${project.total_cost?.toFixed(2)}</div><div style={s.statLabel}>Total Cost</div></div>
          <div style={s.statCard}><div style={s.statVal}>{project.tasks?.length || 0}</div><div style={s.statLabel}>Tasks</div></div>
        </div>
        <div style={s.progressBar}><div style={s.progressFill(project.progress || 0)} /></div>

        {/* Focus Mode button */}
        <button onClick={() => setFocusMode(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0.6rem 1.5rem', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#7c3aed,#00d4ff)',
          color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
          marginTop: 4, boxShadow: '0 0 20px rgba(124,58,237,0.4)'
        }}>
          🎯 Focus Mode
        </button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {tabs.map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}
            title={t === 'timelog' ? 'Time Log & Streak' : t}>
            {t === 'timelog' ? '⏱ Time' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {tab === 'overview' && (
        <div>
          <div style={s.card}>
            <p style={s.h3}>Project Info</p>
            <div style={s.infoRow}>
              <div><span style={s.infoLabel}>Category </span><span style={{ color: '#00d4ff' }}>{project.category}</span></div>
              <div><span style={s.infoLabel}>Status </span><span style={{ color: '#ff2d78' }}>{project.status}</span></div>
              <div><span style={s.infoLabel}>Updated </span><span style={s.infoVal}>{new Date(project.updated_at).toLocaleDateString()}</span></div>
              <div><span style={s.infoLabel}>Public </span><span style={s.infoVal}>{project.is_public ? 'Yes' : 'No'}</span></div>
            </div>
          </div>
          <div style={s.card}>
            <p style={s.h3}>Recent Tasks</p>
            {project.tasks?.slice(0, 5).map(t => (
              <div key={t.id} style={s.taskItem}>
                {t.is_done ? <CheckSquare size={16} style={{ color: '#00d4ff', flexShrink: 0 }} /> : <Square size={16} style={{ color: '#6b7280', flexShrink: 0 }} />}
                <span style={{ fontSize: '0.875rem', color: t.is_done ? '#6b7280' : '#e2e8f0', textDecoration: t.is_done ? 'line-through' : 'none', flex: 1 }}>{t.title}</span>
                <span style={s.tag('#6b7280')}>{t.category}</span>
              </div>
            ))}
            {!project.tasks?.length && <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No tasks yet — go to Tasks tab to add some.</p>}
          </div>
          {project.bom?.length > 0 && (
            <div style={s.card}>
              <p style={s.h3}>Top BOM Items</p>
              {project.bom?.slice(0, 4).map(item => (
                <div key={item.id} style={{ ...s.rowBetween, padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{item.name}</span>
                  <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: '0.875rem' }}>${item.total_cost?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── BOM ─── */}
      {tab === 'bom' && (
        <div>
          <div style={{ ...s.rowBetween, marginBottom: '1rem' }}>
            <h2 style={{ ...s.h2, marginBottom: 0 }}>Bill of Materials</h2>
            <span style={{ color: '#00d4ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarSign size={16} />{project.total_cost?.toFixed(2)} total
            </span>
          </div>

          <div style={s.card}>
            {project.bom?.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No parts yet. Add your first part below.</p>}
            {project.bom?.map((item, i) => (
              <div key={item.id} style={{ ...s.bomItem, borderBottom: i < project.bom.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {item.is_3d_printed && <Printer size={16} style={{ color: '#ff2d78', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#e2e8f0' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                    {item.is_3d_printed
                      ? `${item.filament_grams}g ${item.filament_type} @ $${item.filament_cost_per_kg}/kg`
                      : `${item.qty} ${item.unit} × $${item.unit_cost}`}
                    {item.supplier && ` • ${item.supplier}`}
                  </div>
                </div>
                <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '0.9rem' }}>${item.total_cost?.toFixed(2)}</span>
                {isOwner && (
                  <button onClick={() => deleteBom(item.id)} style={s.btnIcon}
                    onMouseOver={e => e.currentTarget.style.color='#ff2d78'}
                    onMouseOut={e => e.currentTarget.style.color='#4b5563'}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div style={s.formSection}>
              <p style={s.addSectionTitle}>+ Add Part</p>
              <form onSubmit={addBom}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={s.label}>Part Name *</label>
                  <input style={s.input} required value={newBom.name} onChange={e => setNewBom({...newBom, name: e.target.value})} placeholder="e.g. ESP32 Dev Board, M3×10mm Bolt" />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
                  <input type="checkbox" checked={newBom.is_3d_printed} onChange={e => setNewBom({...newBom, is_3d_printed: e.target.checked})} style={{ accentColor: '#ff2d78', width: 16, height: 16 }} />
                  <Printer size={14} style={{ color: '#ff2d78' }} /> 3D Printed Part
                </label>

                {newBom.is_3d_printed ? (
                  <div style={s.grid3}>
                    <div>
                      <label style={s.label}>Filament Type</label>
                      <input style={s.input} value={newBom.filament_type} onChange={e => setNewBom({...newBom, filament_type: e.target.value})} placeholder="PLA, PETG, ABS…" />
                    </div>
                    <div>
                      <label style={s.label}>Grams Used</label>
                      <input style={s.input} type="number" step="any" min="0" value={newBom.filament_grams} onChange={e => setNewBom({...newBom, filament_grams: +e.target.value})} />
                    </div>
                    <div>
                      <label style={s.label}>Cost per kg ($)</label>
                      <input style={s.input} type="number" step="any" min="0" value={newBom.filament_cost_per_kg} onChange={e => setNewBom({...newBom, filament_cost_per_kg: +e.target.value})} />
                    </div>
                  </div>
                ) : (
                  <div style={s.grid2}>
                    <div>
                      <label style={s.label}>Quantity</label>
                      <input style={s.input} type="number" step="any" min="0" value={newBom.qty} onChange={e => setNewBom({...newBom, qty: +e.target.value})} />
                    </div>
                    <div>
                      <label style={s.label}>Unit</label>
                      <input style={s.input} value={newBom.unit} onChange={e => setNewBom({...newBom, unit: e.target.value})} placeholder="pcs, m, kg…" />
                    </div>
                    <div>
                      <label style={s.label}>Unit Cost ($)</label>
                      <input style={s.input} type="number" step="any" min="0" value={newBom.unit_cost} onChange={e => setNewBom({...newBom, unit_cost: +e.target.value})} />
                    </div>
                    <div>
                      <label style={s.label}>Supplier</label>
                      <input style={s.input} value={newBom.supplier} onChange={e => setNewBom({...newBom, supplier: e.target.value})} placeholder="Amazon, Digikey…" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={addingBom} style={{ ...s.btnPrimary, marginTop: '1rem', opacity: addingBom ? 0.7 : 1 }}>
                  <Plus size={16} /> {addingBom ? 'Adding…' : 'Add to BOM'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── TASKS ─── */}
      {tab === 'tasks' && (
        <div>
          <h2 style={s.h2}>Tasks</h2>
          {TASK_CATS.map(cat => {
            const catTasks = project.tasks?.filter(t => t.category === cat) || [];
            if (!catTasks.length && !isOwner) return null;
            return (
              <div key={cat} style={s.card}>
                <p style={s.h3}>{cat}</p>
                {catTasks.length === 0 && <p style={{ color: '#4b5563', fontSize: '0.8rem' }}>No tasks</p>}
                {catTasks.map((t, i) => (
                  <div key={t.id} style={{ ...s.taskItem, borderBottom: i < catTasks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <button onClick={() => isOwner && toggleTask(t)} style={{ ...s.btnIcon, color: t.is_done ? '#00d4ff' : '#6b7280', cursor: isOwner ? 'pointer' : 'default' }}>
                      {t.is_done ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <span style={{ flex: 1, fontSize: '0.875rem', color: t.is_done ? '#6b7280' : '#e2e8f0', textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.title}</span>
                    {isOwner && (
                      <button onClick={() => deleteTask(t.id)} style={s.btnIcon}
                        onMouseOver={e => e.currentTarget.style.color='#ff2d78'}
                        onMouseOut={e => e.currentTarget.style.color='#4b5563'}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {isOwner && (
            <div style={s.formSection}>
              <p style={s.addSectionTitle}>+ Add Task</p>
              <form onSubmit={addTask} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  style={{ ...s.input, flex: 1, minWidth: 200 }}
                  placeholder="Task description…"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  required
                />
                <select
                  style={{ ...s.input, width: 140 }}
                  value={newTask.category}
                  onChange={e => setNewTask({...newTask, category: e.target.value})}
                >
                  {TASK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="submit" disabled={addingTask} style={{ ...s.btnPrimary, opacity: addingTask ? 0.7 : 1 }}>
                  <Plus size={16} /> Add
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── FILES ─── */}
      {tab === 'files' && (
        <div>
          <h2 style={s.h2}>Files & Blueprints</h2>

          {project.files?.length === 0 && !isOwner && (
            <p style={{ color: '#6b7280' }}>No files uploaded yet.</p>
          )}

          {project.files?.map(f => (
            <div key={f.id} style={s.fileItem}>
              <FileText size={28} style={{ color: f.file_type === '3d' ? '#ff2d78' : '#00d4ff', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 500, fontSize: '0.9rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{f.original_name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2, margin: 0 }}>{f.file_type} · {(f.file_size / 1024).toFixed(1)} KB</p>
              </div>
              <a href={`${window.location.protocol}//${window.location.hostname}:3001${f.url}`} target="_blank" rel="noreferrer"
                style={{ color: '#00d4ff', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>Download</a>
              {isOwner && (
                <button onClick={() => deleteFile(f.id)} style={s.btnIcon}
                  onMouseOver={e => e.currentTarget.style.color='#ff2d78'}
                  onMouseOut={e => e.currentTarget.style.color='#4b5563'}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {isOwner && (
            <label style={s.uploadZone}
              onMouseOver={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.5)'}
              onMouseOut={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.2)'}>
              <Upload size={32} style={{ color: '#6b7280', margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: 4 }}>
                {uploading ? 'Uploading…' : 'Click to upload file'}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>STL, PDF, images, any file · Max 50MB</p>
              <input type="file" style={{ display: 'none' }} onChange={uploadFile} disabled={uploading} />
            </label>
          )}
        </div>
      )}

      {tab === 'updates' && (
        <div>
          <h2 style={s.h2}>Progress Updates</h2>
          {!historyLoaded ? (
            (() => {
              api.get(`/posts/history/${project.id}`).then(r => { setHistory(r.data); setHistoryLoaded(true); });
              return <p style={{ color: '#8892a4' }}>Loading…</p>;
            })()
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8892a4' }}>
              <p style={{ fontSize: 36, margin: '0 0 12px' }}>📭</p>
              <p>No progress updates yet.{isOwner ? ' Upload a cover photo or complete a task and share it as an update!' : ''}</p>
            </div>
          ) : (
            history.map(post => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))
          )}
        </div>
      )}

      {tab === 'timelog' && (
        <TimeLogTab projectId={project.id} isOwner={isOwner} />
      )}

      {/* Focus Mode overlay */}
      {focusMode && (
        <FocusMode
          project={project}
          onClose={() => setFocusMode(false)}
          onLogged={() => {
            // Refresh timelog tab data
            setTab('timelog');
          }}
        />
      )}

    </div>
  );
}
