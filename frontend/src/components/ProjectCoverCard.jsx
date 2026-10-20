import { Link } from 'react-router-dom';
import { CATEGORY_EMOJI } from '../constants/categories';

function projectGradient(id = '') {
  const gradients = [
    'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #001a2e 100%)',
    'linear-gradient(135deg, #1a0a28 0%, #2d0d37 50%, #1a002e 100%)',
    'linear-gradient(135deg, #0a1a10 0%, #0d3720 50%, #002e14 100%)',
    'linear-gradient(135deg, #1a1a0a 0%, #372d0d 50%, #2e1a00 100%)',
    'linear-gradient(135deg, #1a0a0a 0%, #370d0d 50%, #2e0000 100%)',
  ];
  return gradients[String(id).charCodeAt(0) % gradients.length || 0];
}

// project.tags may be a JSON string, an array, or a comma-separated string.
function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String);
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return [];
}

export default function ProjectCoverCard({ project, to, showOwner = false, style = {} }) {
  const emoji = CATEGORY_EMOJI[project.category] || '📦';
  const displayName = project.display_name || project.username;
  const hasCover = !!project.cover_url;
  const tags = parseTags(project.tags).slice(0, 3);
  const featured = !!Number(project.is_featured);

  const card = (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid #1e2a3a',
      background: hasCover ? '#000' : projectGradient(project.id),
      cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s',
      position: 'relative',
      ...style
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = '#00d4ff55'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = '#1e2a3a'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {hasCover ? (
        /* 4:3 crop for grid previews */
        <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
          <img
            src={project.cover_url}
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        /* Placeholder when no cover */
        <div style={{
          minHeight: 160, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28
        }}>
          <span style={{ fontSize: 48, filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.4))', marginBottom: 40 }}>{emoji}</span>
        </div>
      )}

      {featured && (
        <span style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(255,45,120,0.9)', color: '#fff',
          borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
          boxShadow: '0 0 10px rgba(255,45,120,0.5)', letterSpacing: 0.3
        }}>★ Featured</span>
      )}

      {/* Bottom overlay with title + category */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
        padding: '40px 14px 12px',
      }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginBottom: 5 }}>
          {project.title}
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {tags.map(t => (
              <span key={t} style={{
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                borderRadius: 4, padding: '1px 6px', fontSize: 10, maxWidth: 110,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>#{t}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.3)',
            color: '#00d4ff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600
          }}>
            {emoji} {project.category || 'general'}
          </span>
          {showOwner && displayName && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>@{displayName}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {project.progress > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{
            height: '100%', width: `${project.progress}%`,
            background: 'linear-gradient(90deg, #00d4ff, #ff2d78)'
          }} />
        </div>
      )}
    </div>
  );

  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>;
  return card;
}
