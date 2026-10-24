import { useEffect, useRef } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';

// ClerkProvider must live inside the router and get React Router's navigate.
// Without routerPush/routerReplace, Clerk moves between sign-in steps
// (/sign-in -> /sign-in/factor-one) with a full page reload. The code step then
// mounts on both the old page and the reloaded one, and each mount asks Clerk to
// send a code, so users got two emails and only the newer code worked.
//
// The router functions return a promise that resolves once the new location has
// rendered. Clerk awaits it during sign-out before marking the user signed out;
// without the wait, a protected page would still be on screen when the user
// became signed out, and Protected.jsx would bounce them to /sign-in instead of /.
const NAV_TIMEOUT_MS = 1000;

export default function ClerkWithRouter({ publishableKey, children }) {
  const navigate = useNavigate();
  const { key } = useLocation();
  const pending = useRef([]);

  useEffect(() => {
    const done = pending.current;
    pending.current = [];
    done.forEach((resolve) => resolve());
  }, [key]);

  const go = (to, options) =>
    new Promise((resolve) => {
      pending.current.push(resolve);
      setTimeout(resolve, NAV_TIMEOUT_MS); // never leave Clerk waiting
      navigate(to, options);
    });

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => go(to)}
      routerReplace={(to) => go(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
