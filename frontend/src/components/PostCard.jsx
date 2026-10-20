import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import api, { getComments, addComment, deleteComment } from '../api';
import { useAuth } from '../context/AuthContext';
import { parseDbDate } from '../utils/format';

const TYPE_META = {
  file_upload:    { label: 'Uploaded a file',        emoji: '📎', color: '#00d4ff' },
  task_completed: { label: 'Completed a task',        emoji: '✅', color: '#00ff88' },
  cover_update:   { label: 'Updated cover photo',     emoji: '📷', color: '#a78bfa' },
  manual_update:  { label: 'Shared an update',        emoji: '📣', color: '#ffd700' },
  milestone:      { label: 'Hit a milestone',         emoji: '🏆', color: '#ffd700' },
};

const timeAgo = (ts) => {
  const diff = Date.now() - parseDbDate(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

function parseData(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
}

const smallBtn = {
  background: 'none', border: '1px solid #1e2a3a', borderRadius: 6,
  padding: '3px 8px', cursor: 'pointer', fontSize: 12,
};

// projectOwnerId is optional: when given, the project owner can also delete the post.
export default function PostCard({ post, currentUserId, projectOwnerId, onDeleted }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsError, setCommentsError] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleted, setDeleted] = useState(false);

  const meta = TYPE_META[post.type] || { label: post.type, emoji: '✨', color: '#00d4ff' };
  const displayName = post.display_name || post.username;
  const data = parseData(post.data);
  const myId = user?.id || currentUserId;
  const canDelete = !!user && (
    String(post.user_id) === String(user.id) ||
    user.role === 'supermod' ||
    (projectOwnerId != null && String(projectOwnerId) === String(user.id))
  );

  const isVideo = post.type === 'file_upload' && !!data.url &&
    (data.file_type === 'video' || VIDEO_EXT.test(data.url));
  const isImage = post.type === 'file_upload' && !!data.url && !isVideo && data.file_type === 'image';

  function loadComments() {
    if (showComments) { setShowComments(false); return; }
    setShowComments(true);
    setCommentsError('');
    setCommentsLoading(true);
    getComments(post.id)
      .then(res => setComments(res.data))
      .catch(err => {
        console.debug('Failed to load comments', err);
        setCommentsError("Couldn't load comments.");
      })
      .finally(() => setCommentsLoading(false));
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setLoading(true);
    setCommentsError('');
    try {
      const res = await addComment(post.id, newComment.trim());
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      setCommentsError(err.response?.data?.error || "Couldn't post comment.");
    } finally { setLoading(false); }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(post.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      setCommentsError(err.response?.data?.error || "Couldn't delete comment.");
    }
  }

  async function handleDeletePost() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/posts/${post.id}`);
      setDeleted(true);
      onDeleted?.(post.id);
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Couldn't delete post.");
      setConfirmingDelete(false);
    } finally { setDeleting(false); }
  }

  if (deleted && !onDeleted) return null;

  const commentCount = Number(post.comment_count) || 0;
  const commentLabel = commentCount > 0
    ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}`
    : (user ? 'Add comment' : 'Comments');

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14,
      overflow: 'hidden', marginBottom: 16
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
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

          {canDelete && (
            confirmingDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ color: '#8892a4', fontSize: 12 }}>Delete?</span>
                <button type="button" onClick={handleDeletePost} disabled={deleting}
                  style={{ ...smallBtn, borderColor: '#ff2d7866', color: '#ff2d78', fontWeight: 700 }}>
                  {deleting ? '…' : 'Yes'}
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}
                  style={{ ...smallBtn, color: '#8892a4' }}>No</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setDeleteError(''); setConfirmingDelete(true); }}
                title="Delete post" aria-label="Delete post"
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
                onMouseOver={e => e.currentTarget.style.color = '#ff2d78'}
                onMouseOut={e => e.currentTarget.style.color = '#6b7280'}>
                <Trash2 size={15} />
              </button>
            )
          )}
        </div>
        {deleteError && (
          <p style={{ color: '#ff2d78', fontSize: 12, margin: '0 0 8px' }}>{deleteError}</p>
        )}

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
      {isImage && (
        <img src={data.url} alt={data.name || 'uploaded image'} loading="lazy"
          style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000', display: 'block', margin: '8px 0' }} />
      )}
      {isVideo && (
        <div style={{ padding: '0 16px', margin: '8px 0' }}>
          <video src={data.url} controls preload="metadata" playsInline
            style={{ width: '100%', maxHeight: 420, borderRadius: 8, background: '#000', display: 'block' }} />
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #1e2a3a', marginTop: 4 }}>
        <button onClick={loadComments} style={{
          background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6, padding: 0
        }}>
          💬 {commentLabel}
        </button>

        {/* Comments section */}
        {showComments && (
          <div style={{ marginTop: 12 }}>
            {commentsError && (
              <p style={{ color: '#ff2d78', fontSize: 12, margin: '0 0 8px' }}>{commentsError}</p>
            )}
            {commentsLoading && (
              <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>Loading comments…</p>
            )}
            {!user && !commentsLoading && comments.length === 0 && !commentsError && (
              <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>No comments yet.</p>
            )}
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
                {user && String(c.user_id) === String(myId) && (
                  <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#ff2d78', cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start' }}>✕</button>
                )}
              </div>
            ))}
            {user ? (
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
            ) : (
              <p style={{ color: '#6b7280', fontSize: 12, margin: '8px 0 0' }}>
                <Link to="/sign-in" style={{ color: '#00d4ff', textDecoration: 'none' }}>Sign in</Link> to join the conversation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
