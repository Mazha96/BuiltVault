import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { Boxes, Globe, Package, LayoutDashboard, Rss, User, Users, Bell, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';

const NARROW_QUERY = '(max-width: 760px)';

const LINKS = [
  { to: '/explore', label: 'Explore', icon: Globe },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feed', label: 'Feed', icon: Rss },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
];

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(NARROW_QUERY).matches
      : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = e => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

function NavItem({ to, label, icon, active, onClick, block = false, iconOnly = false }) {
  const Icon = icon;
  const base = active ? '#00d4ff' : '#9ca3af';
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: block ? 10 : 4,
        fontSize: block ? '1rem' : '0.875rem', color: base, textDecoration: 'none',
        padding: block ? '12px 16px' : 0,
        borderRadius: block ? 8 : 0,
        background: block && active ? 'rgba(0,212,255,0.08)' : 'transparent',
      }}
      onMouseOver={e => { e.currentTarget.style.color = '#00d4ff'; }}
      onMouseOut={e => { e.currentTarget.style.color = base; }}
    >
      <Icon style={{ width: block ? 18 : 16, height: block ? 18 : 16 }} />
      {!iconOnly && label}
    </Link>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const userId = user?.id;
  const { pathname } = useLocation();
  const narrow = useIsNarrow();
  const [unread, setUnread] = useState(0);
  // The menu is open only on the path where it was opened, so any navigation closes it.
  const [menuOpenAt, setMenuOpenAt] = useState(null);
  const menuOpen = narrow && menuOpenAt === pathname;

  useEffect(() => {
    if (!userId) return;
    const load = () => api.get('/notifications').then(r => setUnread(r.data.unread)).catch(() => {});
    load();
    const interval = setInterval(load, 60000); // poll every minute
    return () => clearInterval(interval);
  }, [userId]);

  const isActive = to => pathname === to || pathname.startsWith(`${to}/`);
  const closeMenu = () => setMenuOpenAt(null);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,13,46,0.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #0d1d6b'
    }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 1rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
          <Boxes style={{ color: '#00d4ff', width: 24, height: 24 }} />
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>
            <span className="neon-blue">Build</span><span className="neon-pink">Vault</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 12 : 16 }}>
          <SignedIn>
            {!narrow && LINKS.map(l => (
              <NavItem key={l.to} {...l} active={isActive(l.to)} />
            ))}
            <Link to="/notifications" onClick={() => setUnread(0)} aria-label="Notifications"
              style={{ position: 'relative', color: isActive('/notifications') ? '#00d4ff' : '#9ca3af', display: 'flex', textDecoration: 'none' }}
              onMouseOver={e => { e.currentTarget.style.color = '#00d4ff'; }}
              onMouseOut={e => { e.currentTarget.style.color = isActive('/notifications') ? '#00d4ff' : '#9ca3af'; }}>
              <Bell style={{ width: 18, height: 18 }} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ff2d78', color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{unread > 9 ? '9+' : unread}</span>
              )}
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                variables: { colorPrimary: '#00d4ff' },
                elements: { userButtonAvatarBox: { width: 32, height: 32 } }
              }}
            />
            {narrow && (
              <button
                type="button"
                onClick={() => setMenuOpenAt(menuOpen ? null : pathname)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-menu"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${menuOpen ? '#00d4ff66' : '#1e2a3a'}`,
                  background: menuOpen ? 'rgba(0,212,255,0.1)' : 'transparent',
                  color: menuOpen ? '#00d4ff' : '#9ca3af',
                }}
              >
                {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
              </button>
            )}
          </SignedIn>

          <SignedOut>
            <NavItem to="/explore" label="Explore" icon={Globe} active={isActive('/explore')} iconOnly={narrow} />
            <Link to="/sign-in" className="btn-secondary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign in</Link>
            <Link to="/sign-up" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Sign up</Link>
          </SignedOut>
        </div>
      </div>

      <SignedIn>
        {menuOpen && (
          <div id="mobile-nav-menu" style={{
            borderTop: '1px solid #0d1d6b', padding: '8px 1rem 12px',
            display: 'flex', flexDirection: 'column', gap: 2,
            background: 'rgba(6,13,46,0.98)'
          }}>
            {LINKS.map(l => (
              <NavItem key={l.to} {...l} block active={isActive(l.to)} onClick={closeMenu} />
            ))}
          </div>
        )}
      </SignedIn>
      <div className="neon-line" />
    </nav>
  );
}
