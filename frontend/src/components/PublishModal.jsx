import { useState } from 'react';

export default function PublishModal({ title, onConfirm, onSkip }) {
  const [caption, setCaption] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16,
        padding: 32, maxWidth: 480, width: '90%'
      }}>
        <h3 style={{ color: '#00d4ff', margin: '0 0 8px' }}>Share this update?</h3>
        <p style={{ color: '#8892a4', margin: '0 0 16px', fontSize: 14 }}>
          <strong style={{ color: '#e2e8f0' }}>{title}</strong> will be shared with your followers and project followers.
        </p>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption... (optional)"
          maxLength={280}
          style={{
            width: '100%', minHeight: 80, background: '#161b22',
            border: '1px solid #1e2a3a', borderRadius: 8, padding: 12,
            color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box'
          }}
        />
        <p style={{ color: '#8892a4', fontSize: 12, margin: '4px 0 16px', textAlign: 'right' }}>
          {caption.length}/280
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => onConfirm(caption)} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: '#00d4ff', color: '#0a0e1a', fontWeight: 700, cursor: 'pointer'
          }}>
            📣 Share Update
          </button>
          <button onClick={onSkip} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #1e2a3a',
            background: 'transparent', color: '#8892a4', cursor: 'pointer'
          }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
