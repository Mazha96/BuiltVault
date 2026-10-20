import { useRef, useState } from 'react';
import api from '../api';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const HEIC_MSG = "HEIC isn't supported, export as JPG";
const isHeic = (f) => /\.(heic|heif)$/i.test(f.name || '') || /image\/hei[cf]/i.test(f.type || '');

export default function CoverUploader({ projectId, onUpdate, compact = false }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingUrl, setPendingUrl] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (isHeic(file)) { setError(HEIC_MSG); return; }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/files/${projectId}/cover`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUpdate(res.data.cover_url);
      setPendingUrl(res.data.cover_url);
      setShowPublish(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function publishUpdate() {
    setPublishing(true);
    try {
      await api.post('/posts/manual', {
        projectId,
        type: 'cover_update',
        caption: caption || 'Updated the project cover photo.',
        data: { cover_url: pendingUrl }
      });
      setShowPublish(false);
      setCaption('');
    } catch (err) {
      alert(err.response?.data?.error || 'Could not publish update');
    } finally {
      setPublishing(false);
    }
  }

  // Compact mode: small floating button in the corner of the image
  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleFile} />
        {error && (
          <div role="alert" onClick={() => setError('')} style={{
            position: 'absolute', bottom: 52, right: 12, maxWidth: 260,
            background: 'rgba(0,0,0,0.8)', border: '1px solid #ff2d7866', borderRadius: 8,
            padding: '6px 10px', color: '#ff2d78', fontSize: 12, cursor: 'pointer'
          }}>{error}</div>
        )}
        <button
          onClick={() => !uploading && inputRef.current.click()}
          style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '6px 14px', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(4px)'
          }}
        >
          {uploading ? '⏳ Uploading…' : '📷 Change Cover'}
        </button>

        {/* Share as update prompt */}
        {showPublish && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: '#0d1117', border: '1px solid #00d4ff44',
              borderRadius: 16, padding: 24, maxWidth: 440, width: '90%'
            }}>
              <p style={{ color: '#e2e8f0', fontWeight: 600, margin: '0 0 8px', fontSize: 15 }}>
                📣 Share this as a progress update?
              </p>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="What changed? Add a caption… (optional)"
                maxLength={280}
                style={{
                  width: '100%', minHeight: 70, background: '#161b22',
                  border: '1px solid #1e2a3a', borderRadius: 8, padding: 10,
                  color: '#e2e8f0', fontSize: 13, resize: 'none', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={publishUpdate} disabled={publishing} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: '#00d4ff', color: '#0a0e1a', fontWeight: 700, cursor: 'pointer'
                }}>
                  {publishing ? '…' : '📣 Share Update'}
                </button>
                <button onClick={() => setShowPublish(false)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #1e2a3a',
                  background: 'transparent', color: '#8892a4', cursor: 'pointer'
                }}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full mode: shown when no cover exists yet (standalone upload zone)
  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleFile} />
      <div style={{
        width: '100%', height: 120, borderRadius: 14,
        background: 'linear-gradient(135deg, #0d1628, #0a1a2e)',
        border: '2px dashed #00d4ff66', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
      }} onClick={() => !uploading && inputRef.current.click()}>
        {uploading ? (
          <span style={{ color: '#00d4ff', fontWeight: 700 }}>⏳ Uploading…</span>
        ) : (
          <>
            <span style={{ fontSize: 28 }}>📷</span>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>Add Cover Photo</div>
              <div style={{ color: '#8892a4', fontSize: 12 }}>JPG, PNG, WebP</div>
            </div>
          </>
        )}
      </div>
      {error && <p role="alert" style={{ color: '#ff2d78', fontSize: 12, margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}
