import { useState } from 'react';

export default function TagInput({ tags = [], onChange, max = 8 }) {
  const [input, setInput] = useState('');

  function add(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const tag = input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (tag && !tags.includes(tag) && tags.length < max) {
        onChange([...tags, tag]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  function remove(tag) {
    onChange(tags.filter(t => t !== tag));
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      background: '#161b22', border: '1px solid #1e2a3a', borderRadius: 8,
      padding: '6px 10px', minHeight: 40
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          background: '#00d4ff22', border: '1px solid #00d4ff44', color: '#00d4ff',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          #{tag}
          <button onClick={() => remove(tag)} style={{
            background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer',
            padding: 0, fontSize: 14, lineHeight: 1
          }}>✕</button>
        </span>
      ))}
      {tags.length < max && (
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={add}
          placeholder={tags.length === 0 ? 'Add tags (press Enter)…' : '+tag'}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: 13, flex: 1, minWidth: 100
          }}
        />
      )}
    </div>
  );
}
