import { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-navy-950)' },
  card: { width: '100%', maxWidth: 420, background: '#060d2e', borderRadius: '0.75rem', border: '1px solid #0d1d6b', padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' },
  title: { fontFamily: 'Rajdhani', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' },
  text: { color: '#9ca3af', fontSize: '0.95rem', marginBottom: '1.5rem' },
  error: { color: '#ff2d78', fontSize: '0.9rem', marginBottom: '0.75rem' },
  success: { color: '#00d4ff', fontSize: '0.9rem', marginBottom: '0.75rem' }
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requirements = [
    { id: 'len', label: 'At least 12 characters', pass: newPassword.length >= 12 },
    { id: 'upper', label: 'One uppercase letter', pass: /[A-Z]/.test(newPassword) },
    { id: 'lower', label: 'One lowercase letter', pass: /[a-z]/.test(newPassword) },
    { id: 'num', label: 'One number', pass: /[0-9]/.test(newPassword) },
    { id: 'sp', label: 'One special character (!@#$%^&*)', pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword) },
  ];

  const canSubmitReset = requirements.every(r => r.pass) && newPassword === confirmPassword && newPassword;

  const fetchQuestion = async e => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      const res = await api.post('/auth/recovery-question', { username });
      setQuestion(res.data.question);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'User not found');
    }
  };

  const resetPassword = async e => {
    e.preventDefault(); setError(''); setMessage('');
    if (!canSubmitReset) return;
    try {
      await api.post('/auth/reset-password', { username, recovery_answer: answer, new_password: newPassword });
      setMessage('Password updated! You can log in with your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>Reset password</h1>
        <p style={S.text}>Answer your recovery question to create a new password.</p>

        {error && <p style={S.error}>{error}</p>}
        {message && <p style={S.success}>{message}</p>}

        {step === 1 && (
          <form onSubmit={fetchQuestion} className="space-y-3">
            <div>
              <label className="label">Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Continue</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword} className="space-y-3">
            <div>
              <label className="label">Recovery question</label>
              <input className="input" value={question} disabled />
            </div>
            <div>
              <label className="label">Answer</label>
              <input className="input" value={answer} onChange={e => setAnswer(e.target.value)} required />
            </div>
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              {confirmPassword && newPassword !== confirmPassword && (
                <p style={{ color: '#ff2d78', fontSize: '0.8rem', marginTop: 4 }}>Passwords do not match.</p>
              )}
            </div>
            <div style={{ background: '#0a1550', borderRadius: '0.5rem', padding: '0.75rem' }}>
              {requirements.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: req.pass ? '#00d4ff' : '#9ca3af' }}>
                  {req.pass ? '✔️' : '○'} {req.label}
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!canSubmitReset}>Reset password</button>
          </form>
        )}

        {step === 3 && (
          <div>
            <p style={S.text}>You can now log in with your new password.</p>
            <Link to="/login" className="btn-primary" style={{ justifyContent: 'center', width: '100%', textDecoration: 'none' }}>Back to login</Link>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: '#00d4ff' }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
