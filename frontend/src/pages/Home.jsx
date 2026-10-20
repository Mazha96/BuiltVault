import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, List, BarChart2, Share2, Package, Boxes } from 'lucide-react';

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
};

export default function Home() {
  const { user } = useAuth();

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
              <Link to="/dashboard" className="btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>Start Building Free</Link>
                <Link to="/explore" className="btn-secondary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>Browse Projects</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="neon-line" />

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
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.5rem', marginBottom: 8 }}>Ready to start?</h2>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Free to use. No credit card. Just build.</p>
            <Link to="/register" className="btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', textDecoration: 'none' }}>Create Account</Link>
          </div>
        </div>
      )}
    </div>
  );
}
