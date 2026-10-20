import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { Boxes, Globe, Package, LayoutDashboard, Rss, User, Users, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';

export default function Navbar() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = () => api.get('/notifications').then(r => setUnread(r.data.unread)).catch(() => {});
    load();
    const interval = setInterval(load, 60000); // poll every minute
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,13,46,0.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #0d1d6b'
    }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 1rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Boxes style={{ color: '#00d4ff', width: 24, height: 24 }} />
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>
            <span className="neon-blue">Build</span><span className="neon-pink">Vault</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/explore" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
            onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
            <Globe style={{ width: 16, height: 16 }} /> Explore
          </Link>

          <SignedIn>
            <Link to="/inventory" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
              <Package style={{ width: 16, height: 16 }} /> Inventory
            </Link>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
              <LayoutDashboard style={{ width: 16, height: 16 }} /> Dashboard
            </Link>
            <Link to="/feed" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
              <Rss style={{ width: 16, height: 16 }} /> Feed
            </Link>
            <Link to="/community" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
              <Users style={{ width: 16, height: 16 }} /> Community
            </Link>
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: '#9ca3af', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
              <User style={{ width: 16, height: 16 }} /> Profile
            </Link>
            <Link to="/notifications" onClick={() => setUnread(0)} style={{ position: 'relative', color: '#9ca3af', display: 'flex', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color='#00d4ff'} onMouseOut={e => e.currentTarget.style.color='#9ca3af'}>
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
          </SignedIn>

          <SignedOut>
            <Link to="/sign-in" className="btn-secondary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', textDecoration: 'none' }}>Login</Link>
            <Link to="/sign-up" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem', textDecoration: 'none' }}>Sign up</Link>
          </SignedOut>
        </div>
      </div>
      <div className="neon-line" />
    </nav>
  );
}
