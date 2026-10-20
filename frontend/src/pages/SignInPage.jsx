import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0e1a'
    }}>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          variables: {
            colorPrimary: '#00d4ff',
            colorBackground: '#0d1224',
            colorText: '#e2e8f0',
            colorInputBackground: '#1a2035',
            colorInputText: '#e2e8f0',
            borderRadius: '8px',
          },
          elements: {
            card: { boxShadow: '0 0 30px rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.2)' },
            headerTitle: { color: '#00d4ff' },
            formButtonPrimary: { background: 'linear-gradient(135deg, #00d4ff, #ff2d78)', border: 'none' },
          }
        }}
      />
    </div>
  );
}
