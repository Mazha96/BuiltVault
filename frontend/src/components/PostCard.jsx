import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getComments, addComment, deleteComment } from '../api';

const TYPE_META = {
  file_upload:    { label: 'Uploaded a file',        emoji: '📎', color: '#00d4ff' },
  task_completed: { label: 'Completed a task',        emoji: '✅', color: '#00ff88' },
  cover_update:   { label: 'Updated cover photo',     emoji: '📷', color: '#a78bfa' },
  manual_update:  { label: 'Shared an update',        emoji: '📣', color: '#ffd700' },
  milestone:      { label: 'Hit a milestone',         emoji: '🏆', color: '#ffd700' },
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

export default function PostCard({ post, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const meta = TYPE_META[post.type] || { label: post.type, emoji: '✨', color: '#00d4ff' };
  const displayName = post.display_name || post.username;
  const data = typeof post.data === 'string' ? JSON.parse(post.data || '{}') : (post.data || {});

  async function loadComments() {
    if (!showComments) {
      const res = await getComments(post.id);
      setComments(res.data);
    }
    setShowComments(!showComments);
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await addComment(post.id, newComment.trim());
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } finally { setLoading(false); }
  }

  async function handleDeleteComment(commentId) {
    await deleteComment(post.id, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14,
      overflow: 'hidden', marginBottom: 16
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: '#00d4ff22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0
          }}>
            {post.avatar_url
              ? <img src={post.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#00d4ff', fontWeight: 700 }}>{displayName?.[0]?.toUpperCase()}</span>
            }
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{displayName}</span>
              <span style={{ color: '#8892a4', fontSize: 13 }}>{meta.emoji} {meta.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {post.project_title && (
                <Link to={`/projects/${post.project_id}`} style={{ color: meta.color, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                  📁 {post.project_title}
                </Link>
              )}
              <span style={{ color: '#6b7280', fontSize: 12 }}>· {timeAgo(post.created_at)}</span>
            </div>
          </div>

          {/* Type badge */}
          <span style={{
            background: meta.color + '22', color: meta.color,
            border: `1px solid ${meta.color}44`,
            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0
          }}>
            {meta.emoji} {post.type?.replace('_', ' ')}
          </span>
        </div>

        {/* Caption */}
        {post.caption && (
          <p style={{ color: '#c9d1d9', margin: '0 0 12px', lineHeight: 1.6, fontSize: 14 }}>{post.caption}</p>
        )}

        {/* Task completed detail */}
        {post.type === 'task_completed' && data.title && (
          <div style={{
            background: '#00ff8811', border: '1px solid #00ff8833',
            borderRadius: 8, padding: '8px 12px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ color: '#00ff88', fontWeight: 600, fontSize: 14 }}>{data.title}</span>
            {data.category && <span style={{ color: '#8892a4', fontSize: 12 }}>· {data.category}</span>}
          </div>
        )}

        {/* File upload detail */}
        {post.type === 'file_upload' && data.name && (
          <div style={{
            background: '#00d4ff11', border: '1px solid #00d4ff33',
            borderRadius: 8, padding: '8px 12px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ fontSize: 18 }}>📎</span>
            <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: 14 }}>{data.name}</span>
          </div>
        )}
      </div>

      {/* Cover/image — full width */}
      {(post.type === 'cover_update' && data.cover_url) && (
        <img src={data.cover_url} alt="cover update"
          style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000', display: 'block', margin: '8px 0' }} />
      )}
      {(post.type === 'file_upload' && data.file_type === 'image' && data.url) && (
        <img src={data.url} alt={data.name}
          style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000', display: 'block', margin: '8px 0' }} />
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #1e2a3a', marginTop: 4 }}>
        <button onClick={loadComments} style={{
          background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6, padding: 0
        }}>
          💬 {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count !== 1 ? 's' : ''}` : 'Add comment'}
        </button>

        {/* Comments section */}
        {showComments && (
          <div style={{ marginTop: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#00d4ff22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11
                }}>
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span style={{ color: '#00d4ff', fontWeight: 700 }}>{(c.display_name || c.username)?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{c.display_name || c.username}</span>
                  <span style={{ color: '#8892a4', fontSize: 11, marginLeft: 6 }}>{timeAgo(c.created_at)}</span>
                  <p style={{ color: '#c9d1d9', margin: '4px 0 0', fontSize: 13, lineHeight: 1.5 }}>{c.comment}</p>
                </div>
                {c.user_id === currentUserId && (
                  <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#ff2d78', cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start' }}>✕</button>
                )}
              </div>
            ))}
            <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                style={{
                  flex: 1, background: '#161b22', border: '1px solid #1e2a3a',
                  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13
                }}
              />
              <button type="submit" disabled={loading} style={{
                background: '#00d4ff', color: '#0a0e1a', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13
              }}>{loading ? '…' : 'Post'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
