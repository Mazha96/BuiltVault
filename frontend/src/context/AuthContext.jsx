import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import api from '../api';

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, getToken } = useClerkAuth();
  const clerkId = isLoaded ? clerkUser?.id : undefined;
  // Remember which Clerk user the DB record belongs to, so a stale record is
  // ignored after sign-out or account switch without resetting state in the effect.
  const [dbState, setDbState] = useState({ forId: null, data: null });

  useEffect(() => {
    if (!clerkId) return;
    let cancelled = false;
    api.get('/auth/me')
      .then(r => { if (!cancelled) setDbState({ forId: clerkId, data: r.data }); })
      .catch(err => console.debug('Could not load /auth/me', err));
    return () => { cancelled = true; };
  }, [clerkId]);

  const dbUser = clerkId && dbState.forId === clerkId ? dbState.data : null;

  return {
    user: isLoaded && clerkUser ? {
      id: clerkUser.id,
      username: clerkUser.username || clerkUser.firstName || clerkUser.emailAddresses[0]?.emailAddress,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      avatar_url: clerkUser.imageUrl,
      role: dbUser?.role || 'user',
      display_name: dbUser?.display_name || clerkUser.username || clerkUser.firstName,
    } : null,
    loading: !isLoaded,
    logout: () => signOut(),
    getToken,
  };
}
