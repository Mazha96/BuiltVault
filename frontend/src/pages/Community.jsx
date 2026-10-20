import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ImageUploader from '../components/ImageUploader';

const CATEGORIES = ['all','general','help','showcase','electronics','3d-printing','software','woodworking','metalwork'];
const CAT_EMOJI = { all:'🌐', general:'💬', help:'🆘', showcase:'🏆', electronics:'⚡', '3d-printing':'🖨️', software:'💻', woodworking:'🪵', metalwork:'⚙️' };
const CAT_COLOR = { help:'#ff2d78', showcase:'#ffd700', general:'#00d4ff' };

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general', images: [] });
  const [submitting, setSubmitting] = useState(false);
  const [myProjects, setMyProjects] = useState([]);

  useEffect(() => { load(); }, [category, search]);
  useEffect(() => { if (user) api.get('/projects').then(r => setMyProjects(r.data)).catch(() => {}); }, [user?.id]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('search', search);
      const res = await api.get(`/community?${params}`);
      setPosts(res.data);
    } finally { setLoading(false); }
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/community', form);
      navigate(`/community/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post');
    } finally { setSubmitting(false); }
  }

  async function deletePost(postId, e) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this post?')) return;
    await api.delete(`/community/${postId}`);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  const isMod = user?.role === 'supermod' || user?.role === 'admin';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>
            Community <span style={{ color: '#00d4ff' }}>Forum</span>
          </h1>
          <p style={{ color: '#8892a4', margin: 0, fontSize: 14 }}>Ask for help, share progress, connect with makers</p>
        </div>
        {user && (
          <button onClick={() => setShowNew(true)} style={{
            background: 'linear-gradient(135deg, #00d4ff, #0099cc)', border: 'none',
            borderRadius: 10, padding: '10px 20px', color: '#0a0e1a',
            fontWeight: 700, cursor: 'pointer', fontSize: 14
          }}>+ New Post</button>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13,
            background: category === c ? '#00d4ff' : 'rgba(255,255,255,0.06)',
            color: category === c ? '#0a0e1a' : '#9ca3af', fontWeight: category === c ? 700 : 400
          }}>{CAT_EMOJI[c]} {c}</button>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search posts…"
        style={{
          width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0',
          fontSize: 14, marginBottom: 20, boxSizing: 'border-box'
        }}
      />

      {/* Posts */}
      {loading ? (
        <p style={{ color: '#8892a4', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8892a4' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>💬</p>
          <p>No posts yet in this category. Be the first!</p>
        </div>
      ) : posts.map(post => (
        <Link to={`/community/${post.id}`} key={post.id} style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12,
            padding: '16px 18px', marginBottom: 12, cursor: 'pointer',
            transition: 'border-color 0.2s'
          }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#00d4ff44'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#1e2a3a'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#00d4ff22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden'
              }}>
                {post.avatar_url
                  ? <img src={post.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 15 }}>{(post.display_name || post.username)?.[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    background: (CAT_COLOR[post.category] || '#00d4ff') + '22',
                    color: CAT_COLOR[post.category] || '#00d4ff',
                    border: `1px solid ${CAT_COLOR[post.category] || '#00d4ff'}44`,
                    borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700
                  }}>{CAT_EMOJI[post.category]} {post.category}</span>
                  {post.role === 'supermod' && (
                    <span style={{ background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70044', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>⚡ MOD</span>
                  )}
                </div>
                <h3 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{post.title}</h3>
                <p style={{ color: '#8892a4', margin: '0 0 10px', fontSize: 13, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.body}
                </p>
                {post.project_id && (
                  <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/projects/${post.project_id}`); }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10,
                    background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: 8, padding: '6px 12px', textDecoration: 'none', cursor: 'pointer', font: 'inherit'
                  }}>
                    {post.project_cover && <img src={post.project_cover} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
                    <span style={{ fontSize: 12 }}>
                      <span style={{ color: '#8892a4' }}>🔗 Project: </span>
                      <span style={{ color: '#00d4ff', fontWeight: 600 }}>{post.project_title}</span>
                    </span>
                  </button>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8892a4', fontSize: 12 }}>
                    by <strong style={{ color: '#c9d1d9' }}>{post.display_name || post.username}</strong> · {timeAgo(post.created_at)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#8892a4', fontSize: 13 }}>💬 {post.reply_count}</span>
                    {(user?.id === post.user_id || isMod) && (
                      <button onClick={(e) => deletePost(post.id, e)} style={{
                        background: 'none', border: 'none', color: '#ff2d78', cursor: 'pointer', fontSize: 12, padding: 0
                      }}>🗑️ {isMod && user?.id !== post.user_id ? 'Remove' : 'Delete'}</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* New Post Modal */}
      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 520
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#e2e8f0', margin: 0 }}>New Post</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <form onSubmit={submit}>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{
                width: '100%', padding: '10px 12px', background: '#161b22', border: '1px solid #1e2a3a',
                borderRadius: 8, color: '#e2e8f0', fontSize: 14, marginBottom: 12
              }}>
                {CATEGORIES.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>
                ))}
              </select>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="Post title…" maxLength={120}
                style={{
                  width: '100%', padding: '10px 12px', background: '#161b22', border: '1px solid #1e2a3a',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box'
                }} />
              <textarea required value={form.body} onChange={e => setForm({...form, body: e.target.value})}
                placeholder="Describe your question, idea, or update…" rows={5}
                style={{
                  width: '100%', padding: '10px 12px', background: '#161b22', border: '1px solid #1e2a3a',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16
                }} />
              {myProjects.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>🔗 Link a project (optional)</label>
                  <select
                    value={form.project_id || ''}
                    onChange={e => setForm({...form, project_id: e.target.value || null})}
                    style={{
                      width: '100%', padding: '9px 12px', background: '#161b22',
                      border: '1px solid #1e2a3a', borderRadius: 8, color: form.project_id ? '#e2e8f0' : '#8892a4',
                      fontSize: 14, boxSizing: 'border-box'
                    }}
                  >
                    <option value=''>— No project —</option>
                    {myProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <ImageUploader images={form.images} onChange={images => setForm({...form, images})} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting} style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                  background: '#00d4ff', color: '#0a0e1a', fontWeight: 700, cursor: 'pointer', fontSize: 15
                }}>{submitting ? 'Posting…' : 'Post'}</button>
                <button type="button" onClick={() => setShowNew(false)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid #1e2a3a',
                  background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 15
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
