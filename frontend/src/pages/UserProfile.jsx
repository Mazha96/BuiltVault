import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Github, Linkedin, Globe, FileText, Share2, Check, CalendarDays } from 'lucide-react';
import ProjectCoverCard from '../components/ProjectCoverCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const HEADING = { fontFamily: 'Rajdhani, sans-serif', letterSpacing: 0.5 };
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 };

const isHttpUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

const LINK_DEFS = [
  { key: 'github_url', label: 'GitHub', Icon: Github },
  { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin },
  { key: 'website_url', label: 'Website', Icon: Globe },
  { key: 'resume_url', label: 'Resume', Icon: FileText },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatJoined(createdAt) {
  if (!createdAt) return null;
  const d = new Date(String(createdAt).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function ProjectTile({ project }) {
  const points = Number(project.total_points) || 0;
  const followers = Number(project.followers_count) || 0;
  return (
    <div style={{ minWidth: 0 }}>
      <ProjectCoverCard project={project} to={`/projects/${project.id}`} />
      {(project.description || points > 0 || followers > 0 || project.status) && (
        <div style={{ padding: '8px 4px 0' }}>
          {project.description && (
            <p style={{
              color: '#8892a4', margin: '0 0 6px', fontSize: 13, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>{project.description}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: '#8892a4' }}>
            {project.status && <span style={{ textTransform: 'capitalize' }}>{String(project.status).replace(/[_-]/g, ' ')}</span>}
            {followers > 0 && <span>👥 {followers} follower{followers === 1 ? '' : 's'}</span>}
            {points > 0 && <span>⚡ {points} pts</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const myId = me?.id;
  const navigate = useNavigate();
  // result: { key: route param it was loaded for, profile, error }
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null); // null | 'ok' | 'fail'
  const copyTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/users/${encodeURIComponent(id)}`)
      .then(r => { if (!cancelled) setResult({ key: id, profile: r.data, error: null }); })
      .catch(err => {
        if (!cancelled) setResult({ key: id, profile: null, error: err.response?.status === 404 ? 'notfound' : 'error' });
      });
    return () => { cancelled = true; };
  }, [id]);

  const loading = !result || result.key !== id;
  const profile = loading ? null : result.profile;
  const profileId = profile?.id;
  const isSelf = !!myId && !!profileId && myId === profileId;

  // Self-check runs after loading: the route param may be a username, so compare ids.
  useEffect(() => {
    if (isSelf) navigate('/profile', { replace: true });
  }, [isSelf, navigate]);

  const displayName = profile ? (profile.display_name || profile.username) : null;

  useEffect(() => {
    if (!displayName) return;
    const prev = document.title;
    document.title = `${displayName} · BuildVault`;
    return () => { document.title = prev; };
  }, [displayName]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  function updateProfile(fn) {
    setResult(r => (r && r.profile ? { ...r, profile: fn(r.profile) } : r));
  }

  async function toggleFollow() {
    if (!profileId) return;
    setBusy(true);
    try {
      if (profile.isFollowing) {
        await api.delete(`/follow/users/${profileId}`);
        updateProfile(p => ({ ...p, isFollowing: false, stats: { ...p.stats, followers: Math.max(0, (p.stats?.followers || 0) - 1) } }));
      } else {
        await api.post(`/follow/users/${profileId}`);
        updateProfile(p => ({ ...p, isFollowing: true, stats: { ...p.stats, followers: (p.stats?.followers || 0) + 1 } }));
      }
    } catch (e) {
      console.warn('Follow toggle failed', e);
    } finally { setBusy(false); }
  }

  async function shareProfile() {
    const ok = await copyText(`${window.location.origin}/u/${profile.username}`);
    setCopied(ok ? 'ok' : 'fail');
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div style={{ color: '#8892a4', textAlign: 'center', padding: 60 }}>Loading…</div>;
  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 16px' }}>
        <h1 style={{ ...HEADING, color: '#ff2d78', fontSize: 28, margin: '0 0 8px' }}>
          {result.error === 'notfound' ? 'User not found' : 'Could not load this profile'}
        </h1>
        <p style={{ color: '#8892a4', margin: '0 0 20px' }}>
          {result.error === 'notfound' ? 'This builder may have changed their username.' : 'Please try again in a moment.'}
        </p>
        <Link to="/explore" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 600 }}>Explore projects →</Link>
      </div>
    );
  }

  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const featured = projects.filter(p => Number(p.is_featured) === 1);
  const rest = projects.filter(p => Number(p.is_featured) !== 1);
  const links = LINK_DEFS.filter(l => isHttpUrl(profile[l.key]));
  const joined = formatJoined(profile.created_at);
  const stats = profile.stats || {};

  const pillBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, border: '1px solid #1e2a3a',
    background: 'rgba(255,255,255,0.02)', color: '#c9d1d9',
    fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
    transition: 'border-color 0.2s, color 0.2s', whiteSpace: 'nowrap'
  };
  const hoverOn = e => { e.currentTarget.style.borderColor = '#00d4ff66'; e.currentTarget.style.color = '#00d4ff'; };
  const hoverOff = e => { e.currentTarget.style.borderColor = '#1e2a3a'; e.currentTarget.style.color = '#c9d1d9'; };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
      {/* Header */}
      <section style={{
        background: 'linear-gradient(160deg, #0d1117 0%, #0b1324 100%)',
        border: '1px solid #1e2a3a', borderRadius: 16,
        padding: 'clamp(18px, 5vw, 32px)', marginBottom: 32,
        display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #00d4ff, #ff2d78)'
        }} />
        <div style={{
          width: 96, height: 96, borderRadius: '50%', background: '#00d4ff22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0, border: '2px solid #00d4ff55',
          boxShadow: '0 0 24px rgba(0,212,255,0.15)'
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 38 }}>{displayName?.[0]?.toUpperCase()}</span>
          }
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ ...HEADING, color: '#e2e8f0', margin: 0, fontSize: 'clamp(26px, 6vw, 34px)', lineHeight: 1.1, overflowWrap: 'anywhere' }}>
            {displayName}
          </h1>
          <p style={{ color: '#8892a4', margin: '4px 0 0', fontSize: 14 }}>@{profile.username}</p>

          {profile.headline && (
            <p style={{ color: '#00d4ff', margin: '12px 0 0', fontSize: 'clamp(16px, 4vw, 19px)', fontWeight: 600, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
              {profile.headline}
            </p>
          )}

          {(profile.location || joined) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10, color: '#8892a4', fontSize: 13 }}>
              {profile.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <MapPin style={{ width: 14, height: 14 }} /> {profile.location}
                </span>
              )}
              {joined && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays style={{ width: 14, height: 14 }} /> Joined {joined}
                </span>
              )}
            </div>
          )}

          {profile.bio && (
            <p style={{ color: '#c9d1d9', margin: '14px 0 0', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {profile.bio}
            </p>
          )}

          {links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {links.map(({ key, label, Icon: LinkIcon }) => (
                <a key={key} href={profile[key].trim()} target="_blank" rel="noopener noreferrer"
                  style={pillBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
                  <LinkIcon style={{ width: 15, height: 15 }} /> {label}
                </a>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', marginTop: 20 }}>
            {[
              { label: 'Projects', val: stats.projects ?? projects.length },
              { label: 'Followers', val: stats.followers ?? 0 },
              { label: 'Following', val: stats.following ?? 0 },
            ].map(s => (
              <div key={s.label}>
                <div style={{ ...HEADING, color: '#00d4ff', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: '#8892a4', fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 20 }}>
            {myId && !isSelf && (
              <button onClick={toggleFollow} disabled={busy} style={{
                padding: '8px 22px', borderRadius: 8,
                border: profile.isFollowing ? '1px solid #1e2a3a' : '1px solid #00d4ff',
                background: profile.isFollowing ? 'transparent' : '#00d4ff',
                color: profile.isFollowing ? '#8892a4' : '#0a0e1a',
                fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontSize: 14
              }}>
                {busy ? '…' : profile.isFollowing ? 'Unfollow' : '+ Follow'}
              </button>
            )}
            <button type="button" onClick={shareProfile} style={pillBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              {copied === 'ok'
                ? <><Check style={{ width: 15, height: 15, color: '#22c55e' }} /> Copied!</>
                : copied === 'fail'
                  ? <><Share2 style={{ width: 15, height: 15 }} /> Copy failed</>
                  : <><Share2 style={{ width: 15, height: 15 }} /> Share profile</>}
            </button>
            {!myId && (
              <Link to="/sign-in" style={{ color: '#8892a4', fontSize: 13, textDecoration: 'none' }}
                onMouseOver={e => { e.currentTarget.style.color = '#00d4ff'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#8892a4'; }}>
                Sign in to follow
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Projects */}
      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 16px', border: '1px dashed #1e2a3a',
          borderRadius: 16, background: '#0d1117'
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛠️</div>
          <h2 style={{ ...HEADING, color: '#e2e8f0', margin: '0 0 6px', fontSize: 22 }}>Nothing on the workbench yet</h2>
          <p style={{ color: '#8892a4', margin: 0, fontSize: 14 }}>
            {displayName} hasn't shared any public projects. Check back soon.
          </p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ ...HEADING, color: '#e2e8f0', margin: '0 0 14px', fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#ff2d78' }}>★</span> Featured
              </h2>
              <div style={GRID}>
                {featured.map(p => <ProjectTile key={p.id} project={p} />)}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h2 style={{ ...HEADING, color: '#e2e8f0', margin: '0 0 14px', fontSize: 24 }}>
                {featured.length > 0 ? 'All projects' : 'Projects'}
                <span style={{ color: '#8892a4', fontSize: 15, fontWeight: 500, marginLeft: 8 }}>{rest.length}</span>
              </h2>
              <div style={GRID}>
                {rest.map(p => <ProjectTile key={p.id} project={p} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
