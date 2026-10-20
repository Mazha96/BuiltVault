import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Boxes } from 'lucide-react';

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-navy-950)' },
  wrap: { width: '100%', maxWidth: 420 },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  subtitle: { fontSize: '1.1rem', fontFamily: 'Rajdhani, sans-serif', color: '#d1d5db' },
  card: { background: '#060d2e', borderRadius: '0.75rem', border: '1px solid #0d1d6b', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
  formGroup: { marginBottom: '1rem' },
  error: { color: '#ff2d78', fontSize: '0.875rem', marginBottom: '0.75rem' },
  link: { color: '#00d4ff', textDecoration: 'none' },
  footer: { textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af', marginTop: '1rem' },
};

const passwordChecks = password => ([
  { id: 'len', label: 'At least 12 characters', pass: password.length >= 12 },
  { id: 'upper', label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
  { id: 'lower', label: 'One lowercase letter', pass: /[a-z]/.test(password) },
  { id: 'num', label: 'One number', pass: /[0-9]/.test(password) },
  { id: 'sp', label: 'One special character (!@#$%^&*)', pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
]);

function LogoHeader({ title }) {
  return (
    <div style={S.header}>
      <div style={S.logo}>
        <Boxes style={{ color: '#00d4ff', width: 28, height: 28 }} />
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}>
          <span className="neon-blue">Build</span><span className="neon-pink">Vault</span>
        </span>
      </div>
      <p style={S.subtitle}>{title}</p>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.username, form.password); nav('/dashboard'); }
    catch (e) { setError(e.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <LogoHeader title="Welcome back" />
        <div style={S.card}>
          <form onSubmit={submit}>
            <div style={S.formGroup}><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
            <div style={S.formGroup}><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
            <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
              <Link to="/forgot" style={{ color: '#00d4ff', fontSize: '0.85rem' }}>Forgot password?</Link>
            </div>
            {error && <p style={S.error}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.625rem' }} disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
          </form>
          <p style={S.footer}>No account? <Link to="/register" style={S.link}>Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    recoveryQuestion: '',
    recoveryAnswer: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => passwordChecks(form.password), [form.password]);
  const passwordValid = checks.every(c => c.pass);
  const passwordsMatch = form.password && form.password === form.confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && form.recoveryQuestion && form.recoveryAnswer;

  const submit = async e => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(''); setLoading(true);
    try {
      await register(form.username, form.email, form.password, {
        recovery_question: form.recoveryQuestion,
        recovery_answer: form.recoveryAnswer,
      });
      nav('/dashboard');
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <LogoHeader title="Create account" />
        <div style={S.card}>
          <form onSubmit={submit}>
            <div style={S.formGroup}><label className="label">Username</label><input className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
            <div style={S.formGroup}><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>

            <div style={S.formGroup}>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <div style={S.formGroup}>
              <label className="label">Confirm password</label>
              <input className="input" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required />
              {form.confirmPassword && !passwordsMatch && (
                <p style={{ color: '#ff2d78', fontSize: '0.8rem', marginTop: 4 }}>Passwords do not match.</p>
              )}
            </div>

            <div style={{ background: '#0a1550', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 4 }}>Password must include:</p>
              {checks.map(check => (
                <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: check.pass ? '#00d4ff' : '#9ca3af' }}>
                  {check.pass ? '✔️' : '○'} {check.label}
                </div>
              ))}
            </div>

            <div style={S.formGroup}>
              <label className="label">Recovery question</label>
              <input className="input" placeholder="e.g. Favorite childhood game?" value={form.recoveryQuestion} onChange={e => setForm({...form, recoveryQuestion: e.target.value})} required />
            </div>
            <div style={S.formGroup}>
              <label className="label">Recovery answer</label>
              <input className="input" value={form.recoveryAnswer} onChange={e => setForm({...form, recoveryAnswer: e.target.value})} required />
            </div>

            {error && <p style={S.error}>{error}</p>}
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.625rem' }} disabled={!canSubmit || loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <p style={S.footer}>Have an account? <Link to="/login" style={S.link}>Login</Link></p>
        </div>
      </div>
    </div>
  );
}
