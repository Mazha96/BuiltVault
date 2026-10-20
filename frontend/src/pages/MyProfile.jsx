import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Link2, Check, Pencil, MapPin, Github, Linkedin, Globe, FileText, Lock } from 'lucide-react';
import ProjectCoverCard from '../components/ProjectCoverCard';
import api from '../api';

const HEADING = { fontFamily: 'Rajdhani, sans-serif', letterSpacing: 0.5 };
const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 };
const BIO_MAX = 280;

const FIELDS = [
  { key: 'display_name', label: 'Display name', max: 40, placeholder: 'Your name' },
  { key: 'headline', label: 'Headline', max: 120, placeholder: 'e.g. Controls engineer · Maker' },
  { key: 'location', label: 'Location', max: 60, placeholder: 'City, Country' },
];
const URL_FIELDS = [
  { key: 'github_url', label: 'GitHub', Icon: Github, placeholder: 'https://github.com/you' },
  { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin, placeholder: 'https://linkedin.com/in/you' },
  { key: 'website_url', label: 'Website', Icon: Globe, placeholder: 'https://example.com' },
  { key: 'resume_url', label: 'Resume', Icon: FileText, placeholder: 'https://… (PDF or doc link)' },
];
const EDIT_KEYS = [...FIELDS.map(f => f.key), 'bio', ...URL_FIELDS.map(f => f.key)];

const isHttpUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

function formFromProfile(p) {
  const f = {};
  EDIT_KEYS.forEach(k => { f[k] = p?.[k] || ''; });
  return f;
}

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

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #1e2a3a', background: '#0a0e1a', color: '#e2e8f0',
  fontSize: 14, outline: 'none', fontFamily: 'inherit'
};
const labelStyle = { display: 'block', color: '#8892a4', fontSize: 12, fontWeight: 600, marginBottom: 5 };

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('myProjects');
  const [loading, setLoading] = useState(true);
  const [myProjects, setMyProjects] = useState(null); // null = loading
  const [myProjectsError, setMyProjectsError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(formFromProfile(null));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [copied, setCopied] = useState(null);
  const timers = useRef({});

  function loadProfile() {
    return api.get('/users/me')
      .then(r => { setProfile(r.data); setLoadError(null); return r.data; })
      .catch(err => { setLoadError(err.response?.data?.error || 'Could not load your profile.'); return null; });
  }

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
    api.get('/projects')
      .then(r => setMyProjects(Array.isArray(r.data) ? r.data : []))
      .catch(err => { setMyProjects([]); setMyProjectsError(err.response?.data?.error || 'Could not load your projects.'); });
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => { clearTimeout(t.copy); clearTimeout(t.saved); };
  }, []);

  async function unfollow(userId) {
    await api.delete(`/follow/users/${userId}`);
    setProfile(p => ({
      ...p,
      followingUsers: p.followingUsers.filter(u => u.id !== userId),
      stats: { ...p.stats, following: p.stats.following - 1 }
    }));
  }

  async function unfollowProject(projectId) {
    await api.delete(`/follow/projects/${projectId}`);
    setProfile(p => ({
      ...p,
      followedProjects: p.followedProjects.filter(proj => proj.id !== projectId),
      stats: { ...p.stats, followingProjects: p.stats.followingProjects - 1 }
    }));
  }

  function startEditing() {
    setForm(formFromProfile(profile));
    setSaveError(null);
    setSaved(false);
    setEditing(true);
  }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const payload = {};
    EDIT_KEYS.forEach(k => { payload[k] = (form[k] || '').trim(); });
    if (!payload.display_name) delete payload.display_name; // keep existing name rather than sending an invalid empty one
    try {
      await api.patch('/users/me', payload);
      const fresh = await loadProfile();
      if (fresh) setForm(formFromProfile(fresh));
      setSaved(true);
      clearTimeout(timers.current.saved);
      timers.current.saved = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    const ok = await copyText(`${window.location.origin}/u/${profile.username}`);
    setCopied(ok ? 'ok' : 'fail');
    clearTimeout(timers.current.copy);
    timers.current.copy = setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div style={{ color: '#8892a4', textAlign: 'center', padding: 60 }}>Loading…</div>;
  if (!profile) {
    return <div style={{ color: '#ff2d78', textAlign: 'center', padding: 60 }}>{loadError || 'Could not load your profile.'}</div>;
  }

  const displayName = profile.display_name || profile.username;
  const publicPath = `/u/${profile.username}`;
  const links = URL_FIELDS.filter(l => isHttpUrl(profile[l.key]));
  const followerUsers = profile.followerUsers || [];
  const followingUsers = profile.followingUsers || [];
  const followedProjects = profile.followedProjects || [];
  const featuredCount = (myProjects || []).filter(p => Number(p.is_featured) === 1).length;

  const tabStyle = (t) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: tab === t ? '#00d4ff' : 'transparent',
    color: tab === t ? '#0a0e1a' : '#8892a4',
    fontWeight: tab === t ? 700 : 500, fontSize: 14, whiteSpace: 'nowrap'
  });
  const pillBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8, border: '1px solid #1e2a3a',
    background: 'transparent', color: '#c9d1d9', fontSize: 13, fontWeight: 600,
    textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 48px', boxSizing: 'border-box' }}>
      {/* Header */}
      <section style={{
        background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16,
        padding: 'clamp(18px, 5vw, 32px)', marginBottom: 20,
        display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start'
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: '#00d4ff22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0, border: '2px solid #00d4ff44'
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 32 }}>{displayName?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ ...HEADING, color: '#e2e8f0', margin: 0, fontSize: 28, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{displayName}</h1>
          <p style={{ color: '#8892a4', margin: '2px 0 0', fontSize: 14 }}>@{profile.username}</p>
          {profile.headline && (
            <p style={{ color: '#00d4ff', margin: '10px 0 0', fontSize: 16, fontWeight: 600, overflowWrap: 'anywhere' }}>{profile.headline}</p>
          )}
          {profile.location && (
            <p style={{ color: '#8892a4', margin: '8px 0 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin style={{ width: 14, height: 14 }} /> {profile.location}
            </p>
          )}
          {profile.bio && (
            <p style={{ color: '#c9d1d9', margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{profile.bio}</p>
          )}
          {links.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {links.map(({ key, label, Icon: LinkIcon }) => (
                <a key={key} href={profile[key].trim()} target="_blank" rel="noopener noreferrer" style={{ ...pillBtn, padding: '5px 10px', fontSize: 12 }}>
                  <LinkIcon style={{ width: 14, height: 14 }} /> {label}
                </a>
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', marginTop: 18 }}>
            {[
              { label: 'Projects', val: profile.stats?.projects ?? 0, tab: 'myProjects' },
              { label: 'Followers', val: profile.stats?.followers ?? 0, tab: 'followers' },
              { label: 'Following', val: profile.stats?.following ?? 0, tab: 'following' },
              { label: 'Projects Following', val: profile.stats?.followingProjects ?? 0, tab: 'followingProjects' },
            ].map(s => (
              <button key={s.label} type="button" onClick={() => setTab(s.tab)}
                style={{ textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                <div style={{ ...HEADING, color: '#00d4ff', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: '#8892a4', fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Public profile actions */}
      <section style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
        background: 'linear-gradient(90deg, rgba(0,212,255,0.08), rgba(255,45,120,0.08))',
        border: '1px solid #00d4ff33', borderRadius: 12, padding: '14px 16px', marginBottom: 20
      }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ ...HEADING, color: '#e2e8f0', fontWeight: 700, fontSize: 17 }}>Your public portfolio</div>
          <div style={{ color: '#8892a4', fontSize: 12, overflowWrap: 'anywhere' }}>{window.location.host}{publicPath}</div>
        </div>
        <Link to={publicPath} style={{
          ...pillBtn, background: '#00d4ff', color: '#0a0e1a', border: '1px solid #00d4ff', fontWeight: 700
        }}>
          <ExternalLink style={{ width: 15, height: 15 }} /> View public profile
        </Link>
        <button type="button" onClick={copyLink} style={pillBtn}>
          {copied === 'ok'
            ? <><Check style={{ width: 15, height: 15, color: '#22c55e' }} /> Copied!</>
            : <><Link2 style={{ width: 15, height: 15 }} /> {copied === 'fail' ? 'Copy failed' : 'Copy link'}</>}
        </button>
        {!editing && (
          <button type="button" onClick={startEditing} style={pillBtn}>
            <Pencil style={{ width: 15, height: 15 }} /> Edit profile
          </button>
        )}
      </section>

      {/* Edit form */}
      {editing && (
        <form onSubmit={saveProfile} style={{
          background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16,
          padding: 'clamp(16px, 4vw, 24px)', marginBottom: 24
        }}>
          <h2 style={{ ...HEADING, color: '#e2e8f0', margin: '0 0 16px', fontSize: 22 }}>Edit profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label htmlFor={`pf-${f.key}`} style={labelStyle}>{f.label}</label>
                <input id={`pf-${f.key}`} type="text" value={form[f.key]} maxLength={f.max}
                  placeholder={f.placeholder} onChange={e => setField(f.key, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <label htmlFor="pf-bio" style={labelStyle}>Bio</label>
            <textarea id="pf-bio" rows={4} value={form.bio} maxLength={BIO_MAX}
              placeholder="What do you build? What are you looking for?"
              onChange={e => setField('bio', e.target.value.slice(0, BIO_MAX))}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            <div style={{ textAlign: 'right', fontSize: 11, marginTop: 3, color: form.bio.length >= BIO_MAX ? '#ff2d78' : '#8892a4' }}>
              {form.bio.length}/{BIO_MAX}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 6 }}>
            {URL_FIELDS.map(f => (
              <div key={f.key}>
                <label htmlFor={`pf-${f.key}`} style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <f.Icon style={{ width: 13, height: 13 }} /> {f.label}
                </label>
                <input id={`pf-${f.key}`} type="url" inputMode="url" value={form[f.key]}
                  placeholder={f.placeholder} onChange={e => setField(f.key, e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
          <p style={{ color: '#8892a4', fontSize: 12, margin: '8px 0 0' }}>Links must start with http:// or https://. Leave a field empty to remove it.</p>

          {saveError && (
            <div role="alert" style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(255,45,120,0.1)', border: '1px solid #ff2d7855', color: '#ff2d78', fontSize: 13
            }}>{saveError}</div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} style={{
              padding: '9px 22px', borderRadius: 8, border: 'none', background: '#00d4ff',
              color: '#0a0e1a', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1
            }}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" onClick={() => setEditing(false)} style={pillBtn}>Close</button>
            {saved && (
              <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check style={{ width: 15, height: 15 }} /> Saved
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        <button style={tabStyle('myProjects')} onClick={() => setTab('myProjects')}>My projects</button>
        <button style={tabStyle('followers')} onClick={() => setTab('followers')}>Followers</button>
        <button style={tabStyle('following')} onClick={() => setTab('following')}>Following</button>
        <button style={tabStyle('followingProjects')} onClick={() => setTab('followingProjects')}>Following projects</button>
      </div>

      {/* My projects */}
      {tab === 'myProjects' && (
        myProjects === null
          ? <p style={{ color: '#8892a4' }}>Loading projects…</p>
          : myProjectsError
            ? <p style={{ color: '#ff2d78' }}>{myProjectsError}</p>
            : myProjects.length === 0
              ? (
                <p style={{ color: '#8892a4' }}>
                  You have no projects yet. <Link to="/dashboard" style={{ color: '#00d4ff' }}>Start one on your dashboard</Link>.
                </p>
              )
              : (
                <>
                  <p style={{ color: '#8892a4', fontSize: 12, margin: '0 0 12px' }}>
                    ★ {featuredCount}/6 featured. Featured public projects appear first on your public profile; private projects are hidden from it.
                  </p>
                  <div style={GRID}>
                    {myProjects.map(p => {
                      const isPublic = Number(p.is_public) === 1;
                      return (
                        <div key={p.id} style={{ minWidth: 0 }}>
                          <ProjectCoverCard project={p} to={`/projects/${p.id}`} />
                          <div style={{ padding: '6px 4px 0', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 12, color: '#8892a4' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isPublic ? '#8892a4' : '#ff2d78' }}>
                              {isPublic ? <Globe style={{ width: 12, height: 12 }} /> : <Lock style={{ width: 12, height: 12 }} />}
                              {isPublic ? 'Public' : 'Private'}
                            </span>
                            {p.status && <span style={{ textTransform: 'capitalize' }}>{String(p.status).replace(/[_-]/g, ' ')}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
      )}

      {/* Followers list */}
      {tab === 'followers' && (
        followerUsers.length === 0
          ? <p style={{ color: '#8892a4' }}>No followers yet.</p>
          : followerUsers.map(u => <UserRow key={u.id} user={u} />)
      )}

      {/* Following list */}
      {tab === 'following' && (
        followingUsers.length === 0
          ? <p style={{ color: '#8892a4' }}>You're not following anyone yet.</p>
          : followingUsers.map(u => (
            <UserRow key={u.id} user={u}>
              <button onClick={() => unfollow(u.id)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #1e2a3a',
                background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 13
              }}>Unfollow</button>
            </UserRow>
          ))
      )}

      {/* Followed projects */}
      {tab === 'followingProjects' && (
        followedProjects.length === 0
          ? <p style={{ color: '#8892a4' }}>You're not following any projects yet.</p>
          : <div style={GRID}>
            {followedProjects.map(p => (
              <div key={p.id} style={{ minWidth: 0 }}>
                <ProjectCoverCard project={p} to={`/projects/${p.id}`} showOwner />
                <div style={{ padding: '6px 4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#8892a4', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>by {p.display_name || p.username}</span>
                  <button onClick={() => unfollowProject(p.id)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #1e2a3a',
                    background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 11, flexShrink: 0
                  }}>Unfollow</button>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );
}

function UserRow({ user, children }) {
  const displayName = user.display_name || user.username;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, marginBottom: 10
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: '#00d4ff22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0
      }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#00d4ff', fontWeight: 700 }}>{displayName?.[0]?.toUpperCase()}</span>
        }
      </div>
      <Link to={user.username ? `/u/${user.username}` : `/users/${user.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <div style={{ color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
        <div style={{ color: '#8892a4', fontSize: 13 }}>@{user.username}</div>
      </Link>
      {children}
    </div>
  );
}
