import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ProjectCoverCard from '../components/ProjectCoverCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function UserProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me && id === me.id) { navigate('/profile'); return; }
    api.get(`/users/${id}`).then(r => {
      setProfile(r.data);
      setFollowing(r.data.isFollowing);
    }).finally(() => setLoading(false));
  }, [id]);

  async function toggleFollow() {
    setBusy(true);
    try {
      if (following) {
        await api.delete(`/follow/users/${id}`);
        setFollowing(false);
        setProfile(p => ({ ...p, stats: { ...p.stats, followers: p.stats.followers - 1 } }));
      } else {
        await api.post(`/follow/users/${id}`);
        setFollowing(true);
        setProfile(p => ({ ...p, stats: { ...p.stats, followers: p.stats.followers + 1 } }));
      }
    } finally { setBusy(false); }
  }

  if (loading) return <div style={{ color: '#8892a4', textAlign: 'center', padding: 60 }}>Loading…</div>;
  if (!profile) return <div style={{ color: '#ff2d78', textAlign: 'center', padding: 60 }}>User not found</div>;

  const displayName = profile.display_name || profile.username;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{
        background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16,
        padding: 32, marginBottom: 24, display: 'flex', gap: 24, alignItems: 'flex-start'
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
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#e2e8f0', margin: '0 0 4px', fontSize: 24 }}>{displayName}</h1>
          <p style={{ color: '#8892a4', margin: '0 0 12px', fontSize: 14 }}>@{profile.username}</p>
          {profile.bio && <p style={{ color: '#c9d1d9', margin: '0 0 16px', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            {[
              { label: 'Projects', val: profile.stats.projects },
              { label: 'Followers', val: profile.stats.followers },
              { label: 'Following', val: profile.stats.following },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 20 }}>{s.val}</div>
                <div style={{ color: '#8892a4', fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {me && me.id !== id && (
            <button onClick={toggleFollow} disabled={busy} style={{
              padding: '8px 24px', borderRadius: 8, border: following ? '1px solid #1e2a3a' : 'none',
              background: following ? 'transparent' : '#00d4ff',
              color: following ? '#8892a4' : '#0a0e1a',
              fontWeight: 700, cursor: 'pointer', fontSize: 14
            }}>
              {busy ? '…' : following ? 'Unfollow' : '+ Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Projects */}
      <h2 style={{ color: '#e2e8f0', marginBottom: 16 }}>Public Projects</h2>
      {profile.projects.length === 0 ? (
        <p style={{ color: '#8892a4' }}>No public projects yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {profile.projects.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} style={{
              background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12,
              padding: 16, textDecoration: 'none', display: 'block',
              transition: 'border-color 0.2s'
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#00d4ff44'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#1e2a3a'}
            >
              {p.cover_url && (
                <img src={p.cover_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
              )}
              <h3 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: 16 }}>{p.title}</h3>
              <p style={{ color: '#8892a4', margin: '0 0 10px', fontSize: 13, lineHeight: 1.5 }}>
                {p.description?.slice(0, 80)}{p.description?.length > 80 ? '…' : ''}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8892a4' }}>
                <span>👥 {p.followers_count} followers</span>
                <span>⚡ {p.total_points} pts</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
