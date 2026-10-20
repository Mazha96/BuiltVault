import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import api from '../api';

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, getToken } = useClerkAuth();
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      api.get('/auth/me').then(r => setDbUser(r.data)).catch(() => {});
    } else if (isLoaded && !clerkUser) {
      setDbUser(null);
    }
  }, [isLoaded, clerkUser?.id]);

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

export function AuthProvider({ children }) {
  return children;
}
