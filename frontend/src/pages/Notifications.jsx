import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const TYPE_META = {
  follow_user:      { emoji: '👤', label: (d) => `${d.actorName} started following you` },
  follow_project:   { emoji: '📁', label: (d) => `${d.actorName} followed your project "${d.projectTitle}"` },
  points_received:  { emoji: '⚡', label: (d) => `${d.actorName} boosted your project "${d.projectTitle}" with ${d.points} point${d.points !== 1 ? 's' : ''}` },
  community_reply:  { emoji: '💬', label: (d) => `${d.actorName} replied to your post "${d.postTitle}"` },
};

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function linkFor(notif) {
  const d = notif.data;
  switch (notif.type) {
    case 'follow_user': return `/users/${d.actorId}`;
    case 'follow_project': return `/projects/${d.projectId}`;
    case 'points_received': return `/projects/${d.projectId}`;
    case 'community_reply': return `/community/${d.postId}`;
    default: return null;
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(r => setNotifications(r.data.notifications)).finally(() => setLoading(false));
    api.post('/notifications/read');
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 26, fontWeight: 700, margin: 0 }}>
          🔔 Notifications
        </h1>
        {notifications.length > 0 && (
          <button onClick={() => { api.post('/notifications/read'); setNotifications(n => n.map(x => ({...x, is_read: 1}))); }}
            style={{ background: 'none', border: '1px solid #1e2a3a', borderRadius: 8, padding: '6px 14px', color: '#8892a4', cursor: 'pointer', fontSize: 13 }}>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#8892a4', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#8892a4' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔔</p>
          <p>No notifications yet. When people interact with you or your projects, you'll see it here.</p>
        </div>
      ) : notifications.map(n => {
        const meta = TYPE_META[n.type];
        const to = linkFor(n);
        const content = (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
            background: n.is_read ? '#0d1117' : '#00d4ff08',
            border: `1px solid ${n.is_read ? '#1e2a3a' : '#00d4ff33'}`,
            borderRadius: 12, marginBottom: 10, transition: 'background 0.2s'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#00d4ff22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0
            }}>
              {n.data.actorAvatar
                ? <img src={n.data.actorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : meta?.emoji || '🔔'
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#e2e8f0', margin: '0 0 4px', fontSize: 14, lineHeight: 1.5 }}>
                {meta ? meta.label(n.data) : n.type}
              </p>
              <span style={{ color: '#8892a4', fontSize: 12 }}>{timeAgo(n.created_at)}</span>
            </div>
            {!n.is_read && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff', flexShrink: 0, marginTop: 6 }} />
            )}
          </div>
        );
        return to
          ? <Link key={n.id} to={to} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link>
          : <div key={n.id}>{content}</div>;
      })}
    </div>
  );
}
