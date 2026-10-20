import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '../api';

export default function ClerkTokenProvider({ children }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setTokenGetter(async () => {
      if (!isSignedIn) return null;
      try {
        return await getToken();
      } catch (e) {
        console.warn('getToken failed', e);
        return null;
      }
    });
  }, [isSignedIn, getToken]);

  return children;
}
