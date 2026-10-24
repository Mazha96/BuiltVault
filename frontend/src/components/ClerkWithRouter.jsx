import { ClerkProvider } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

// ClerkProvider must live inside the router and get React Router's navigate.
// Without routerPush/routerReplace, Clerk moves between sign-in steps
// (/sign-in -> /sign-in/factor-one) with a full page reload. The code step then
// mounts on both the old page and the reloaded one, and each mount asks Clerk to
// send a code, so users got two emails and only the newer code worked.
export default function ClerkWithRouter({ publishableKey, children }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}
