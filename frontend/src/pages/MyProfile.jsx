import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectCoverCard from '../components/ProjectCoverCard';
import api from '../api';

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('projects');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me').then(r => setProfile(r.data)).finally(() => setLoading(false));
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

  if (loading) return <div style={{ color: '#8892a4', textAlign: 'center', padding: 60 }}>Loading…</div>;
  if (!profile) return null;

  const displayName = profile.display_name || profile.username;
  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: tab === t ? '#00d4ff' : 'transparent',
    color: tab === t ? '#0a0e1a' : '#8892a4',
    fontWeight: tab === t ? 700 : 400, fontSize: 14,
  });

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
          <p style={{ color: '#8892a4', margin: '0 0 16px', fontSize: 14 }}>@{profile.username}</p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Projects', val: profile.stats.projects, tab: null },
              { label: 'Followers', val: profile.stats.followers, tab: 'followers' },
              { label: 'Following', val: profile.stats.following, tab: 'following' },
              { label: 'Projects Following', val: profile.stats.followingProjects, tab: 'followingProjects' },
            ].map(s => (
              <div key={s.label}
                onClick={() => s.tab && setTab(s.tab)}
                style={{ textAlign: 'center', cursor: s.tab ? 'pointer' : 'default' }}>
                <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 20 }}>{s.val}</div>
                <div style={{ color: '#8892a4', fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('followers')} onClick={() => setTab('followers')}>Followers</button>
        <button style={tabStyle('following')} onClick={() => setTab('following')}>Following</button>
        <button style={tabStyle('followingProjects')} onClick={() => setTab('followingProjects')}>Projects</button>
      </div>

      {/* Followers list */}
      {tab === 'followers' && (
        profile.followerUsers.length === 0
          ? <p style={{ color: '#8892a4' }}>No followers yet.</p>
          : profile.followerUsers.map(u => <UserRow key={u.id} user={u} />)
      )}

      {/* Following list */}
      {tab === 'following' && (
        profile.followingUsers.length === 0
          ? <p style={{ color: '#8892a4' }}>You're not following anyone yet.</p>
          : profile.followingUsers.map(u => (
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
        profile.followedProjects.length === 0
          ? <p style={{ color: '#8892a4' }}>You're not following any projects yet.</p>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {profile.followedProjects.map(p => (
              <div key={p.id}>
                <ProjectCoverCard project={p} to={`/projects/${p.id}`} showOwner />
                <div style={{ padding: '6px 4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8892a4', fontSize: 12 }}>by {p.display_name || p.username}</span>
                  <button onClick={() => unfollowProject(p.id)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #1e2a3a',
                    background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 11
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
      <Link to={`/users/${user.id}`} style={{ flex: 1, textDecoration: 'none' }}>
        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{displayName}</div>
        <div style={{ color: '#8892a4', fontSize: 13 }}>@{user.username}</div>
      </Link>
      {children}
    </div>
  );
}
