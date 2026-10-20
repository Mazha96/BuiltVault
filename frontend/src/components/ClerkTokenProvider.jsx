import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '../api';

// Wires Clerk's session token into the axios instance in api.js.
//
// Two details matter here:
// 1. The getter is set during render, not in a useEffect. React runs child effects
//    before parent effects, so pages that fetch on mount would otherwise fire their
//    first request without a token (that is what made owners see "Private project").
// 2. Children are only rendered once Clerk has loaded, so no request can go out
//    before we know whether the visitor is signed in.
export default function ClerkTokenProvider({ children }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  setTokenGetter(async () => {
    if (!isSignedIn) return null;
    try {
      return await getToken();
    } catch (e) {
      console.warn('getToken failed', e);
      return null;
    }
  });

  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8892a4' }}>
        Loading…
      </div>
    );
  }
  return children;
}
