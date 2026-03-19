import { useState } from 'react';
import { signIn, signUp } from '../lib/auth';

const C = {
  header: '#1a1a2e',
  border: '#d0d0d0',
  error: '#b00000',
  seed: '#666',
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (mode === 'register' && !displayName.trim()) { setError('Display name is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, displayName.trim());

    setLoading(false);
    if (error) setError(error.message);
    // On success, App.tsx will detect the session change and re-render
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    border: `1px solid ${C.border}`, fontSize: 13,
    boxSizing: 'border-box' as const, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 32, width: 360, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: C.header }}>🏀 2026 Bracket Pool</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: C.seed }}>
          {mode === 'login' ? 'Sign in to your account.' : 'Create a new account.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Display name</label>
              <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder='e.g. John Smith' />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Email</label>
            <input style={inputStyle} type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@example.com' onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Password</label>
            <input style={inputStyle} type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='Min. 6 characters' onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '10px 0', borderRadius: 4, background: C.header, color: '#fff', border: 'none', fontSize: 14, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: C.seed }}>
            {mode === 'login' ? (
              <>No account? <button onClick={() => { setMode('register'); setError(null); }} style={{ background: 'none', border: 'none', color: C.header, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Register</button></>
            ) : (
              <>Have an account? <button onClick={() => { setMode('login'); setError(null); }} style={{ background: 'none', border: 'none', color: C.header, cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
