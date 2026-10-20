import { useRef, useState } from 'react';
import api from '../api';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const HEIC_MSG = "HEIC isn't supported, export as JPG";
const isHeic = (f) => /\.(heic|heif)$/i.test(f.name || '') || /image\/hei[cf]/i.test(f.type || '');

export default function ImageUploader({ images = [], onChange, max = 5 }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(e) {
    const picked = Array.from(e.target.files);
    if (!picked.length) return;
    const files = picked.filter(f => !isHeic(f));
    setError(files.length < picked.length ? HEIC_MSG : '');
    if (!files.length) { e.target.value = ''; return; }
    const remaining = max - images.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const form = new FormData();
      toUpload.forEach(f => form.append('images', f));
      const res = await api.post('/community/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange([...images, ...res.data.urls]);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function remove(url) {
    onChange(images.filter(u => u !== url));
  }

  return (
    <div>
      {/* Preview grid */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {images.map(url => (
            <div key={url} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2a3a' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => remove(url)} style={{
                position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)',
                border: 'none', borderRadius: '50%', width: 20, height: 20,
                color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < max && (
        <div>
          <input ref={inputRef} type="file" accept={ACCEPT} multiple style={{ display: 'none' }} onChange={handleFiles} />
          <button type="button" onClick={() => inputRef.current.click()} disabled={uploading} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
            background: 'rgba(255,255,255,0.05)', border: '1px dashed #1e2a3a',
            borderRadius: 8, color: '#8892a4', cursor: 'pointer', fontSize: 13
          }}>
            {uploading ? '⏳ Uploading…' : `📷 Add Photos (${images.length}/${max})`}
          </button>
        </div>
      )}
      {error && <p role="alert" style={{ color: '#ff2d78', fontSize: 12, margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}
