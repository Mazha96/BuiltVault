import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProjectCoverCard from '../components/ProjectCoverCard';
import { Upload, List, BarChart2, Share2, Package, Boxes, ArrowRight } from 'lucide-react';

const features = [
  { icon: Upload, label: 'Upload Blueprints', desc: 'PDFs, images, STL files — all in one place.' },
  { icon: List, label: 'Bill of Materials', desc: 'Track every part, cost, and supplier.' },
  { icon: BarChart2, label: 'Progress Tracking', desc: 'Task lists with auto progress bars.' },
  { icon: Package, label: 'Shared Inventory', desc: 'Parts library shared across all your projects.' },
  { icon: Share2, label: 'Publish & Share', desc: 'Let others discover, download, and remix your builds.' },
];

const S = {
  page: { minHeight: '100vh', background: 'var(--color-navy-950)' },
  hero: { position: 'relative', overflow: 'hidden' },
  grid: {
    position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(#00d4ff 1px,transparent 1px),linear-gradient(90deg,#00d4ff 1px,transparent 1px)',
    backgroundSize: '60px 60px'
  },
  glowBlue: { position: 'absolute', top: 80, left: '25%', width: 384, height: 384, background: 'rgba(0,212,255,0.08)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' },
  glowPink: { position: 'absolute', top: 160, right: '25%', width: 384, height: 384, background: 'rgba(255,45,120,0.08)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' },
  heroInner: { position: 'relative', maxWidth: 800, margin: '0 auto', padding: '6rem 1rem 5rem', textAlign: 'center' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 1rem', borderRadius: 9999, border: '1px solid #00d4ff', color: '#00d4ff', background: 'rgba(0,212,255,0.07)', fontSize: '0.8rem', marginBottom: '1.5rem', fontWeight: 500 },
  h1: { fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(2.5rem,8vw,4.5rem)', lineHeight: 1.1, marginBottom: '1.5rem' },
  sub: { color: '#9ca3af', fontSize: 'clamp(1rem,3vw,1.2rem)', maxWidth: 600, margin: '0 auto 2.5rem', lineHeight: 1.6 },
  btnRow: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  section: { maxWidth: 1152, margin: '0 auto', padding: '5rem 1rem' },
  sectionTitle: { fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '2rem', textAlign: 'center', marginBottom: '3rem', color: '#f3f4f6' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' },
  featureCard: {
    background: '#060d2e', borderRadius: '0.75rem', border: '1px solid #0d1d6b',
    padding: '1.25rem', transition: 'border-color 0.2s',
    cursor: 'default'
  },
  iconBox: { width: 40, height: 40, borderRadius: 8, background: '#0a1550', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cta: { maxWidth: 600, margin: '0 auto', padding: '0 1rem 5rem', textAlign: 'center' },
  featuredHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  featuredGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' },
  browseLink: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#00d4ff', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' },
  bigBtn: { fontSize: '1.1rem', padding: '0.75rem 2rem', textDecoration: 'none' },
};

const FEATURED_LIMIT = 6;

// Featured projects first (by featured_order), then newest.
function pickFeatured(projects) {
  const time = p => new Date(p.created_at || p.updated_at || 0).getTime() || 0;
  return [...projects]
    .sort((a, b) => {
      const fa = Number(a.is_featured) === 1, fb = Number(b.is_featured) === 1;
      if (fa !== fb) return fa ? -1 : 1;
      if (fa && fb) {
        const oa = Number(a.featured_order) || 0, ob = Number(b.featured_order) || 0;
        if (oa !== ob) return oa - ob;
      }
      return time(b) - time(a);
    })
    .slice(0, FEATURED_LIMIT);
}

function FeaturedBuilds() {
  const [projects, setProjects] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    api.get('/projects/public')
      .then(r => { if (!cancelled) setProjects(pickFeatured(Array.isArray(r.data) ? r.data : [])); })
      .catch(err => {
        console.debug('Could not load featured builds', err);
        if (!cancelled) setProjects([]);
      });
    return () => { cancelled = true; };
  }, []);

  // Hide the section entirely if nothing is public yet or the request failed.
  if (projects && projects.length === 0) return null;

  return (
    <section style={S.section} aria-labelledby="featured-builds">
      <div style={S.featuredHead}>
        <h2 id="featured-builds" style={{ ...S.sectionTitle, textAlign: 'left', marginBottom: 0 }}>
          Featured <span className="neon-blue">builds</span>
        </h2>
        <Link to="/explore" style={S.browseLink}>Browse all <ArrowRight size={16} /></Link>
      </div>
      {projects === null ? (
        <p style={{ color: '#6b7280' }}>Loading builds…</p>
      ) : (
        <div style={S.featuredGrid}>
          {projects.map(p => (
            <ProjectCoverCard key={p.id} project={p} to={`/projects/${p.id}`} showOwner />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div style={S.grid} />
        <div style={S.glowBlue} />
        <div style={S.glowPink} />

        <div style={S.heroInner}>
          <div style={S.badge}>
            <Boxes style={{ width: 14, height: 14 }} /> Maker Project Hub
          </div>
          <h1 style={S.h1}>
            <span className="neon-blue">Build</span><span className="neon-pink">Vault</span>
            <br />
            <span style={{ color: '#f3f4f6', fontSize: '75%' }}>Your Projects. Organized.</span>
          </h1>
          <p style={S.sub}>
            Upload blueprints, track your bill of materials, manage tasks and inventory — then share your builds with the maker community.
          </p>
          <div style={S.btnRow}>
            {user ? (
              <Link to="/dashboard" className="btn-primary" style={S.bigBtn}>Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/explore" className="btn-primary" style={S.bigBtn}>Explore projects</Link>
                <Link to="/sign-up" className="btn-secondary" style={S.bigBtn}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="neon-line" />

      {!loading && !user && <FeaturedBuilds />}

      <div style={S.section}>
        <h2 style={S.sectionTitle}>Everything a <span className="neon-blue">maker</span> needs</h2>
        <div style={S.grid3}>
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={S.featureCard}
              onMouseOver={e => e.currentTarget.style.borderColor='rgba(0,212,255,0.4)'}
              onMouseOut={e => e.currentTarget.style.borderColor='#0d1d6b'}>
              <div style={S.iconBox}>
                <Icon style={{ width: 20, height: 20, color: '#00d4ff' }} />
              </div>
              <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{label}</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {!user && (
        <div style={S.cta}>
          <div style={{ ...S.featureCard, border: '1px solid rgba(0,212,255,0.25)' }}>
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: 8 }}>Have builds of your own?</h2>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Free to use. No credit card. Just build.</p>
            <div style={S.btnRow}>
              <Link to="/explore" className="btn-primary" style={S.bigBtn}>Explore projects</Link>
              <Link to="/sign-up" className="btn-secondary" style={S.bigBtn}>Sign up</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
