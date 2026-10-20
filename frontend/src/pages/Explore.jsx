import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Globe, DollarSign, User, Trophy, Grid, Search, Activity } from 'lucide-react';
import ProjectCoverCard from '../components/ProjectCoverCard';

const CATEGORIES = ['all','electronics','3d-printing','woodworking','metalwork','software','art','other','general'];
const CATEGORY_EMOJI = {
  all: '🌐', electronics: '⚡', '3d-printing': '🖨️', woodworking: '🪵',
  metalwork: '⚙️', software: '💻', art: '🎨', other: '🔧', general: '📦'
};

const s = {
  page: { maxWidth: 1152, margin: '0 auto', padding: '2rem 1rem' },
  header: { marginBottom: '2rem' },
  h1: { fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#e2e8f0' },
  sub: { color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '0.4rem 0.9rem', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 500,
    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
    background: active ? '#00d4ff' : 'rgba(255,255,255,0.06)',
    color: active ? '#0a0e1a' : '#9ca3af',
  }),
  viewToggle: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  viewBtn: (active) => ({
    padding: '0.4rem 0.75rem', borderRadius: 8, cursor: 'pointer', border: 'none',
    background: active ? 'rgba(0,212,255,0.15)' : 'transparent',
    color: active ? '#00d4ff' : '#6b7280',
  }),
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  searchWrap: { position: 'relative', flex: 1, maxWidth: 320 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: 16, height: 16 },
  input: { width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.875rem', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' },
  card: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', transition: 'border-color 0.2s' },
  cardTitle: { fontWeight: 600, fontSize: '1.05rem', color: '#e2e8f0', marginBottom: '0.4rem' },
  cardDesc: { color: '#9ca3af', fontSize: '0.82rem', marginBottom: '0.75rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  progressBar: { height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, marginBottom: '0.75rem' },
  progressFill: (pct) => ({ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg, #00d4ff, #ff2d78)', width: `${pct}%` }),
  meta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 },
  cost: { fontSize: '0.875rem', fontWeight: 600, color: '#00d4ff', display: 'flex', alignItems: 'center', gap: 4 },
  catTag: { fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 9999, background: 'rgba(0,212,255,0.1)', color: '#00d4ff', marginBottom: '0.5rem', display: 'inline-block' },
  // Top 10 list style
  top10: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  rankCard: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'border-color 0.2s' },
  rankNum: (n) => ({ fontSize: '1.5rem', fontWeight: 900, minWidth: 40, color: n <= 3 ? ['#FFD700','#C0C0C0','#CD7F32'][n-1] : '#374151' }),
  rankInfo: { flex: 1 },
  rankTitle: { fontWeight: 600, fontSize: '1rem', color: '#e2e8f0' },
  rankMeta: { fontSize: '0.75rem', color: '#6b7280', marginTop: 2 },
  trophy: { color: '#FFD700' },
  sortSelect: { padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '4rem 1rem', color: '#6b7280' },
  feedList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  feedCard: { background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem', display: 'flex', gap: '0.75rem' },
  feedIcon: { width: 40, height: 40, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 600 },
  feedText: { flex: 1, color: '#e2e8f0', fontSize: '0.9rem' },
  feedMeta: { fontSize: '0.75rem', color: '#6b7280', marginTop: 4 },
  followRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' },
  followBtn: active => ({
    fontSize: '0.7rem', padding: '0.25rem 0.7rem', borderRadius: 9999,
    border: `1px solid ${active ? 'rgba(255,45,120,0.45)' : 'rgba(255,255,255,0.2)'}`,
    background: active ? 'rgba(255,45,120,0.12)' : 'transparent',
    color: '#e2e8f0', cursor: 'pointer'
  })
};

const feedIconMeta = (type) => {
  switch (type) {
    case 'file_uploaded':
      return { emoji: '📎', bg: 'rgba(0,212,255,0.15)', color: '#00d4ff' };
    case 'task_completed':
      return { emoji: '✅', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' };
    case 'status_change':
      return { emoji: '🚀', bg: 'rgba(255,45,120,0.15)', color: '#ff2d78' };
    default:
      return { emoji: '✨', bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' };
  }
};

const formatFeedMessage = (item) => {
  const actor = item.actor_name || 'Someone';
  const projectTitle = item.project_title || 'a project';
  switch (item.type) {
    case 'file_uploaded':
      return `${actor} uploaded ${item.data?.name || 'a file'} to ${projectTitle}`;
    case 'task_completed':
      return `${actor} completed "${item.data?.title || 'a task'}" in ${projectTitle}`;
    case 'status_change':
      return `${actor} marked ${projectTitle} ${item.data?.status || 'updated'}`;
    default:
      return `${actor} posted an update in ${projectTitle}`;
  }
};

const formatTimestamp = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '';
  }
};


export default function Explore() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' | 'top10' | 'feed'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'cost' | 'progress'
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [followProjectBusy, setFollowProjectBusy] = useState({});
  const [followCreatorBusy, setFollowCreatorBusy] = useState({});
  const [remainingPoints, setRemainingPoints] = useState(null);
  const [givingPointsTo, setGivingPointsTo] = useState(null);
  const [pointAmount, setPointAmount] = useState(1);
  const [pointBusy, setPointBusy] = useState({});

  const fetchProjects = () => {
    setLoading(true);
    api.get('/projects/public').then(r => setProjects(r.data)).finally(() => setLoading(false));
  };

  const fetchFeed = () => {
    if (!user) { setFeed([]); return; }
    setFeedLoading(true);
    api.get('/follow/feed').then(r => setFeed(r.data)).catch(() => setFeed([])).finally(() => setFeedLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { fetchFeed(); }, [user?.id]);
  useEffect(() => {
    if (user) api.get('/points/me').then(r => setRemainingPoints(r.data.remaining)).catch(() => {});
  }, [user?.id]);

  const handleFollowProject = async (project, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user) return alert('Sign in to follow projects.');
    setFollowProjectBusy(prev => ({ ...prev, [project.id]: true }));
    try {
      if (project.is_following_project) await api.delete(`/follow/projects/${project.id}`);
      else await api.post(`/follow/projects/${project.id}`);
      setProjects(prev => prev.map(p => p.id === project.id ? {
        ...p,
        is_following_project: !project.is_following_project,
        followers_count: Math.max(0, (p.followers_count || 0) + (project.is_following_project ? -1 : 1)),
      } : p));
      fetchFeed();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update follow state. Try again.');
    } finally {
      setFollowProjectBusy(prev => ({ ...prev, [project.id]: false }));
    }
  };

  const handleFollowCreator = async (project, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user || String(user.id) === String(project.user_id)) return;
    setFollowCreatorBusy(prev => ({ ...prev, [project.user_id]: true }));
    try {
      if (project.is_following_creator) await api.delete(`/follow/users/${project.user_id}`);
      else await api.post(`/follow/users/${project.user_id}`);
      setProjects(prev => prev.map(p => p.user_id === project.user_id ? {
        ...p,
        is_following_creator: p.user_id === project.user_id ? !project.is_following_creator : p.is_following_creator,
      } : p));
      fetchFeed();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update creator follow.');
    } finally {
      setFollowCreatorBusy(prev => ({ ...prev, [project.user_id]: false }));
    }
  };

  const handleGivePoints = async (projectId, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return alert('Sign in to give points.');
    setPointBusy(prev => ({ ...prev, [projectId]: true }));
    try {
      await api.post(`/points/${projectId}`, { amount: pointAmount });
      setRemainingPoints(prev => prev - pointAmount);
      setGivingPointsTo(null);
      setPointAmount(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not give points.');
    } finally {
      setPointBusy(prev => ({ ...prev, [projectId]: false }));
    }
  };

  let filtered = projects.filter(p => {
    const matchCat = category === 'all' || p.category === category;
    const q = search.toLowerCase();
let tags = [];
    try { tags = JSON.parse(p.tags || '[]'); } catch {}
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q) || tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });

  if (sortBy === 'cost') filtered = [...filtered].sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
  else if (sortBy === 'progress') filtered = [...filtered].sort((a, b) => (b.progress || 0) - (a.progress || 0));

  const top10 = filtered.slice(0, 10);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>Explore <span style={{ color: '#00d4ff' }}>Projects</span></h1>
        <p style={s.sub}>Browse public maker builds. Get inspired, copy BOMs, learn from the community.</p>

        {/* Category tabs */}
        <div style={s.tabs}>
          {CATEGORIES.map(c => (
            <button key={c} style={s.tab(category === c)} onClick={() => setCategory(c)}>
              {CATEGORY_EMOJI[c]} {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        {/* Controls row */}
        <div style={s.controls}>
          <div style={s.searchWrap}>
            <Search style={s.searchIcon} />
            <input style={s.input} placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select style={s.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="recent">Most Recent</option>
              <option value="cost">Highest Cost</option>
              <option value="progress">Most Complete</option>
            </select>
            <div style={s.viewToggle}>
              <button style={s.viewBtn(view === 'grid')} onClick={() => setView('grid')} title="Grid view"><Grid size={16} /></button>
              <button style={s.viewBtn(view === 'top10')} onClick={() => setView('top10')} title="Top 10"><Trophy size={16} /></button>
              {user && <button style={s.viewBtn(view === 'feed')} onClick={() => setView('feed')} title="Following feed"><Activity size={16} /></button>}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading…</p>
      ) : view === 'feed' ? (
        !user ? (
          <div style={s.empty}>
            <p>Sign in to follow creators and see their progress feed.</p>
          </div>
        ) : feedLoading ? (
          <p style={{ color: '#9ca3af' }}>Loading your feed…</p>
        ) : feed.length === 0 ? (
          <div style={s.empty}>
            <Activity size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p>Follow creators or projects to see their updates here.</p>
          </div>
        ) : (
          <div style={s.feedList}>
            {feed.map(item => {
              const icon = feedIconMeta(item.type);
              const message = formatFeedMessage(item);
              return (
                <Link key={item.id} to={item.project_id ? `/projects/${item.project_id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={s.feedCard}
                    onMouseOver={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.3)'}
                    onMouseOut={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
                    <div style={{ ...s.feedIcon, background: icon.bg, color: icon.color }}>{icon.emoji}</div>
                    <div style={s.feedText}>
                      {message}
                      <div style={s.feedMeta}>{formatTimestamp(item.created_at)} · {item.project_title || 'Project'}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <Globe size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>No public projects found. Be the first to publish one!</p>
        </div>
      ) : view === 'top10' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <Trophy size={18} style={s.trophy} />
            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Top {Math.min(10, filtered.length)} Projects</span>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>— sorted by {sortBy}</span>
          </div>
          <div style={s.top10}>
            {top10.map((p, i) => (
              <Link to={`/projects/${p.id}`} key={p.id} style={s.rankCard}
                onMouseOver={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.3)'}
                onMouseOut={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
                <div style={s.rankNum(i + 1)}>#{i + 1}</div>
                <div style={s.rankInfo}>
                  <div style={s.rankTitle}>{p.title}</div>
                  <div style={s.rankMeta}>
                    by <Link to={`/users/${p.user_id}`} style={{color:'#00d4ff',textDecoration:'none'}} onClick={e=>e.stopPropagation()}>{p.display_name||p.username}</Link> · {p.category} · {p.progress}% complete · ${p.total_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#00d4ff' }}>${p.total_cost?.toFixed(2) || '0.00'}</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{p.progress}%</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div style={s.grid}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: '#0d1224', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
              <ProjectCoverCard project={p} to={`/projects/${p.id}`} showOwner />
              {/* Actions row */}
              <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/users/${p.user_id}`} style={{ ...s.username, color: '#00d4ff', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                    <User size={12} />{p.display_name || p.username}
                  </Link>
                  <span style={s.cost}><DollarSign size={12} />{p.total_cost?.toFixed(2) || '0.00'}</span>
                </div>
                {p.description && <div style={s.cardDesc}>{p.description}</div>}
                {(() => { try { const tags = JSON.parse(p.tags||'[]'); return tags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                    {tags.map(tag => (
                      <span key={tag} style={{ background: '#00d4ff11', border: '1px solid #00d4ff33', color: '#00d4ff', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>#{tag}</span>
                    ))}
                  </div>
                ) : null; } catch { return null; } })()}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{(p.followers_count || 0)} follower{(p.followers_count || 0) === 1 ? '' : 's'}</span>
                  {user && String(user.id) !== String(p.user_id) && (
                    <>
                      <button onClick={(e) => handleFollowProject(p, e)} disabled={followProjectBusy[p.id]} style={s.followBtn(p.is_following_project)}>
                        {followProjectBusy[p.id] ? '...' : p.is_following_project ? 'Project ✓' : 'Follow Project'}
                      </button>
                      <button onClick={(e) => handleFollowCreator(p, e)} disabled={followCreatorBusy[p.user_id]} style={s.followBtn(p.is_following_creator)}>
                        {followCreatorBusy[p.user_id] ? '...' : p.is_following_creator ? 'Creator ✓' : 'Follow Creator'}
                      </button>
                    </>
                  )}
                  {user && String(user.id) !== String(p.user_id) && remainingPoints > 0 && (
                    givingPointsTo === p.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <input type="number" min={1} max={remainingPoints} value={pointAmount}
                          onChange={e => setPointAmount(Math.min(remainingPoints, Math.max(1, Number(e.target.value))))}
                          style={{ width: 44, background: '#161b22', border: '1px solid #1e2a3a', borderRadius: 6, padding: '3px 6px', color: '#e2e8f0', textAlign: 'center', fontSize: 12 }} />
                        <button onClick={(e) => handleGivePoints(p.id, e)} disabled={pointBusy[p.id]}
                          style={{ background: '#00d4ff', color: '#0a0e1a', border: 'none', borderRadius: 6, padding: '3px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                          {pointBusy[p.id] ? '…' : '⚡ Give'}
                        </button>
                        <button onClick={e => { e.preventDefault(); e.stopPropagation(); setGivingPointsTo(null); }}
                          style={{ background: 'none', border: '1px solid #1e2a3a', borderRadius: 6, padding: '3px 8px', color: '#8892a4', cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setGivingPointsTo(p.id); setPointAmount(1); }}
                        style={{ background: '#00d4ff11', border: '1px solid #00d4ff33', borderRadius: 6, padding: '3px 10px', color: '#00d4ff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        ⚡ Boost ({remainingPoints} left)
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
