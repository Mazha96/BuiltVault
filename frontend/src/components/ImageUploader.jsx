import { useRef, useState } from 'react';
import api from '../api';

export default function ImageUploader({ images = [], onChange, max = 5 }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
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
      alert(err.response?.data?.error || 'Upload failed');
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
          <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={handleFiles} />
          <button type="button" onClick={() => inputRef.current.click()} disabled={uploading} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
            background: 'rgba(255,255,255,0.05)', border: '1px dashed #1e2a3a',
            borderRadius: 8, color: '#8892a4', cursor: 'pointer', fontSize: 13
          }}>
            {uploading ? '⏳ Uploading…' : `📷 Add Photos (${images.length}/${max})`}
          </button>
        </div>
      )}
    </div>
  );
}
