import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ImageUploader from '../components/ImageUploader';

const CAT_EMOJI = { general:'💬', help:'🆘', showcase:'🏆', electronics:'⚡', '3d-printing':'🖨️', software:'💻', woodworking:'🪵', metalwork:'⚙️' };

const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function Avatar({ user, size = 36 }) {
  const name = user?.display_name || user?.username || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#00d4ff22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, border: '1px solid #1e2a3a'
    }}>
      {user?.avatar_url
        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: size * 0.4 }}>{name[0].toUpperCase()}</span>
      }
    </div>
  );
}

export default function CommunityPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isMod = user?.role === 'supermod' || user?.role === 'admin';

  useEffect(() => {
    api.get(`/community/${id}`).then(r => setPost(r.data)).finally(() => setLoading(false));
  }, [id]);

  async function submitReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/community/${id}/replies`, { body: reply.trim(), images: replyImages });
      setReplyImages([]);
      setPost(p => ({ ...p, replies: [...(p.replies || []), res.data] }));
      setReply('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reply');
    } finally { setSubmitting(false); }
  }

  async function deleteReply(replyId) {
    if (!confirm('Delete this reply?')) return;
    await api.delete(`/community/${id}/replies/${replyId}`);
    setPost(p => ({ ...p, replies: p.replies.filter(r => r.id !== replyId) }));
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return;
    await api.delete(`/community/${id}`);
    window.location.href = '/community';
  }

  if (loading) return <div style={{ color: '#8892a4', textAlign: 'center', padding: 60 }}>Loading…</div>;
  if (!post) return <div style={{ color: '#ff2d78', textAlign: 'center', padding: 60 }}>Post not found</div>;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <Link to="/community" style={{ color: '#8892a4', textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        ← Back to Community
      </Link>

      {/* Post */}
      <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <Avatar user={post} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{post.display_name || post.username}</span>
              {post.role === 'supermod' && (
                <span style={{ background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70044', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>⚡ MOD</span>
              )}
              <span style={{ color: '#8892a4', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
              <span style={{
                background: '#00d4ff22', color: '#00d4ff', border: '1px solid #00d4ff44',
                borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600
              }}>{CAT_EMOJI[post.category]} {post.category}</span>
            </div>
            <h1 style={{ color: '#e2e8f0', margin: '0 0 12px', fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{post.title}</h1>
            {post.project_id && (
              <Link to={`/projects/${post.project_id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
                background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 10, padding: '8px 14px', textDecoration: 'none'
              }}>
                {post.project_cover && <img src={post.project_cover} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                <div>
                  <div style={{ color: '#8892a4', fontSize: 11 }}>🔗 Linked Project</div>
                  <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: 14 }}>{post.project_title}</div>
                </div>
                <span style={{ color: '#00d4ff', marginLeft: 4 }}>→</span>
              </Link>
            )}
            <p style={{ color: '#c9d1d9', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 15 }}>{post.body}</p>
            {(() => { try { const imgs = JSON.parse(post.images||'[]'); return imgs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {imgs.map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, objectFit: 'cover', border: '1px solid #1e2a3a', cursor: 'zoom-in' }} />
                  </a>
                ))}
              </div>
            ) : null; } catch { return null; } })()}
          </div>
        </div>
        {(user?.id === post.user_id || isMod) && (
          <div style={{ borderTop: '1px solid #1e2a3a', paddingTop: 14, marginTop: 14 }}>
            <button onClick={deletePost} style={{
              background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)',
              borderRadius: 8, padding: '6px 14px', color: '#ff2d78', cursor: 'pointer', fontSize: 13
            }}>🗑️ {isMod && user?.id !== post.user_id ? 'Remove Post (Mod)' : 'Delete Post'}</button>
          </div>
        )}
      </div>

      {/* Replies */}
      <h3 style={{ color: '#e2e8f0', margin: '0 0 14px', fontSize: 16 }}>
        {post.replies?.length || 0} {post.replies?.length === 1 ? 'Reply' : 'Replies'}
      </h3>

      {post.replies?.map(r => (
        <div key={r.id} style={{
          background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12,
          padding: '14px 18px', marginBottom: 10, display: 'flex', gap: 12
        }}>
          <Avatar user={r} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{r.display_name || r.username}</span>
              {r.role === 'supermod' && (
                <span style={{ background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70044', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>⚡ MOD</span>
              )}
              <span style={{ color: '#8892a4', fontSize: 12 }}>{timeAgo(r.created_at)}</span>
              {(user?.id === r.user_id || isMod) && (
                <button onClick={() => deleteReply(r.id)} style={{
                  marginLeft: 'auto', background: 'none', border: 'none', color: '#ff2d78', cursor: 'pointer', fontSize: 12
                }}>🗑️ {isMod && user?.id !== r.user_id ? 'Remove' : 'Delete'}</button>
              )}
            </div>
            <p style={{ color: '#c9d1d9', margin: 0, lineHeight: 1.6, fontSize: 14, whiteSpace: 'pre-wrap' }}>{r.body}</p>
            {(() => { try { const imgs = JSON.parse(r.images||'[]'); return imgs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {imgs.map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" style={{ maxWidth: 180, maxHeight: 140, borderRadius: 8, objectFit: 'cover', border: '1px solid #1e2a3a', cursor: 'zoom-in' }} />
                  </a>
                ))}
              </div>
            ) : null; } catch { return null; } })()}
          </div>
        </div>
      ))}

      {/* Reply box */}
      {user ? (
        <form onSubmit={submitReply} style={{ marginTop: 20 }}>
          <textarea
            value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Write a reply…" rows={3}
            style={{
              width: '100%', padding: '12px 14px', background: '#0d1117',
              border: '1px solid #1e2a3a', borderRadius: 10, color: '#e2e8f0',
              fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10
            }}
          />
          <div style={{ marginBottom: 10 }}>
            <ImageUploader images={replyImages} onChange={setReplyImages} />
          </div>
          <button type="submit" disabled={submitting || !reply.trim()} style={{
            background: '#00d4ff', border: 'none', borderRadius: 8, padding: '10px 24px',
            color: '#0a0e1a', fontWeight: 700, cursor: 'pointer', fontSize: 14
          }}>{submitting ? 'Posting…' : 'Reply'}</button>
        </form>
      ) : (
        <p style={{ color: '#8892a4', textAlign: 'center', padding: 20 }}>
          <Link to="/sign-in" style={{ color: '#00d4ff' }}>Sign in</Link> to reply
        </p>
      )}
    </div>
  );
}
