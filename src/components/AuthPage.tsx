import { useState } from 'react';
import { signIn, signUp, resetPassword } from '../lib/auth';

const C = {
  header: '#1a1a2e',
  border: '#d0d0d0',
  error: '#b00000',
  success: '#2a7a2a',
  seed: '#666',
};

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 4,
  border: `1px solid ${C.border}`, fontSize: 13,
  boxSizing: 'border-box' as const, outline: 'none',
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = (m: typeof mode) => { setMode(m); setError(null); setSuccess(null); };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (mode === 'forgot') {
      if (!email.trim()) { setError('Enter your email address.'); return; }
      setLoading(true);
      const { error } = await resetPassword(email.trim());
      setLoading(false);
      if (error) setError(error.message);
      else setSuccess('Password reset email sent. Check your inbox.');
      return;
    }

    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (mode === 'register' && !displayName.trim()) { setError('Display name is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 32, width: 360, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: C.header }}>🏀 2026 Bracket Pool</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: C.seed }}>
          {mode === 'login' && 'Sign in to your account.'}
          {mode === 'register' && 'Create a new account.'}
          {mode === 'forgot' && 'Reset your password.'}
        </p>

        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Display name</label>
              <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder='e.g. John Smith' />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Email</label>
            <input style={inputStyle} type='email' value={email} onChange={e => setEmail(e.target.value)} placeholder='you@example.com' />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label style={{ fontSize: 12, color: C.seed, display: 'block', marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 36 }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='Min. 6 characters'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.seed, padding: 0, lineHeight: 1 }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: C.error }}>{error}</div>}
          {success && <div style={{ fontSize: 12, color: C.success }}>{success}</div>}

          <button
            type='submit'
            disabled={loading}
            style={{ padding: '10px 0', borderRadius: 4, background: C.header, color: '#fff', border: 'none', fontSize: 14, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset email'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', fontSize: 12, color: C.seed }}>
            {mode === 'login' && (<>
              <span>No account? <Btn label='Register' onClick={() => reset('register')} /></span>
              <span>Forgot password? <Btn label='Reset it' onClick={() => reset('forgot')} /></span>
            </>)}
            {mode === 'register' && (
              <span>Have an account? <Btn label='Sign in' onClick={() => reset('login')} /></span>
            )}
            {mode === 'forgot' && (
              <span><Btn label='Back to sign in' onClick={() => reset('login')} /></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Btn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} type='button' style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 }}>
      {label}
    </button>
  );
}
