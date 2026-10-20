import { useEffect, useState } from 'react';
import { getFeed, getLeaderboard, getMyPoints, givePoints } from '../api';
import PostCard from '../components/PostCard';
import { useUser } from '@clerk/clerk-react';

export default function Feed() {
  const { user } = useUser();
  const [tab, setTab] = useState('feed');
  const [posts, setPosts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('week');
  const [myPoints, setMyPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [givingTo, setGivingTo] = useState(null);
  const [giveAmount, setGiveAmount] = useState(1);

  useEffect(() => {
    loadFeed();
    loadPoints();
  }, []);

  useEffect(() => {
    if (tab === 'top') loadLeaderboard();
  }, [tab, period]);

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await getFeed();
      setPosts(res.data);
    } catch (err) {
      console.debug('Could not load feed', err);
    } finally { setLoading(false); }
  }

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const res = await getLeaderboard(period);
      setLeaderboard(res.data);
    } catch (err) {
      console.debug('Could not load leaderboard', err);
    } finally { setLoading(false); }
  }

  async function loadPoints() {
    try {
      const res = await getMyPoints();
      setMyPoints(res.data);
    } catch (err) {
      console.debug('Could not load points', err);
    }
  }

  async function handleGivePoints(projectId) {
    try {
      await givePoints(projectId, giveAmount);
      setGivingTo(null);
      loadPoints();
      loadLeaderboard();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to give points');
    }
  }

  const tabStyle = (t) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: tab === t ? '#00d4ff' : 'transparent',
    color: tab === t ? '#0a0e1a' : '#8892a4',
    fontWeight: tab === t ? 700 : 400, fontSize: 14,
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      {/* Points banner */}
      {myPoints && (
        <div style={{
          background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12,
          padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#8892a4', fontSize: 14 }}>Today's boosts remaining</span>
          <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 20 }}>
            ⚡ {myPoints.remaining} / {myPoints.daily_budget}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('feed')} onClick={() => setTab('feed')}>Following</button>
        <button style={tabStyle('top')} onClick={() => setTab('top')}>🏆 Top Projects</button>
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        loading ? (
          <p style={{ color: '#8892a4', textAlign: 'center', marginTop: 40 }}>Loading feed…</p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8892a4' }}>
            <p style={{ fontSize: 48, margin: '0 0 16px' }}>📭</p>
            <p>Nothing in your feed yet. Follow some people or projects to see their updates here.</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={user?.id}
              onDeleted={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))} />
          ))
        )
      )}

      {/* Top Projects tab */}
      {tab === 'top' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['today', 'week', 'all'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid #1e2a3a',
                background: period === p ? '#00d4ff22' : 'transparent',
                color: period === p ? '#00d4ff' : '#8892a4', cursor: 'pointer', fontSize: 13
              }}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'All Time'}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: '#8892a4', textAlign: 'center' }}>Loading…</p>
          ) : leaderboard.map((proj, i) => (
            <div key={proj.id} style={{
              background: '#0d1117', border: i === 0 ? '1px solid #00d4ff55' : '1px solid #1e2a3a',
              borderRadius: 12, padding: 16, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <span style={{
                fontSize: 20, fontWeight: 700, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#8892a4',
                minWidth: 28, textAlign: 'center'
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              {proj.cover_url && (
                <img src={proj.cover_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{proj.title}</div>
                <div style={{ color: '#8892a4', fontSize: 13 }}>by {proj.display_name || proj.username}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 18 }}>⚡ {proj.total_points}</div>
                {myPoints && myPoints.remaining > 0 && (
                  givingTo === proj.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                      <input
                        type="number" min={1} max={myPoints.remaining}
                        value={giveAmount} onChange={e => setGiveAmount(Number(e.target.value))}
                        style={{ width: 50, background: '#161b22', border: '1px solid #1e2a3a', borderRadius: 6, padding: '4px 8px', color: '#e2e8f0', textAlign: 'center' }}
                      />
                      <button onClick={() => handleGivePoints(proj.id)} style={{
                        background: '#00d4ff', color: '#0a0e1a', border: 'none',
                        borderRadius: 6, padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 12
                      }}>Give</button>
                      <button onClick={() => setGivingTo(null)} style={{
                        background: 'none', border: '1px solid #1e2a3a', borderRadius: 6,
                        padding: '4px 8px', color: '#8892a4', cursor: 'pointer', fontSize: 12
                      }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setGivingTo(proj.id); setGiveAmount(1); }} style={{
                      marginTop: 6, background: '#00d4ff22', border: '1px solid #00d4ff44',
                      borderRadius: 6, padding: '4px 10px', color: '#00d4ff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600
                    }}>⚡ Boost</button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
