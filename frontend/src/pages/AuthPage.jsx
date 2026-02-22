import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({ email: '', username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let data;
            if (mode === 'login') {
                data = await login(form.username, form.password);
            } else {
                if (form.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    setLoading(false);
                    return;
                }
                data = await register(form.email, form.username, form.password);
            }
            if (!data.success) setError(data.error || 'Something went wrong');
        } catch (err) {
            setError(err.response?.data?.error || 'Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d0d0f 0%, #1a0a0c 50%, #0d0d0f 100%)' }}>

            {/* Background ambient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #fc3c44, transparent)' }} />
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-8 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #ff453a, transparent)' }} />
            </div>

            <div className="relative w-full max-w-sm mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)' }}>
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">MusicCloud</h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(245,245,247,0.4)' }}>
                        {mode === 'login' ? 'Sign in to your library' : 'Create your account'}
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl p-7 shadow-2xl"
                    style={{ background: 'rgba(28,28,30,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

                    {/* Tab switch */}
                    <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        {[['login', 'Sign In'], ['register', 'Sign Up']].map(([m, label]) => (
                            <button key={m} onClick={() => { setMode(m); setError(''); }}
                                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                                style={mode === m
                                    ? { background: '#fc3c44', color: 'white' }
                                    : { color: 'rgba(245,245,247,0.4)' }
                                }>
                                {label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email (register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(245,245,247,0.5)' }}>
                                    Email Address
                                </label>
                                <input type="email" required value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#fc3c44'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(245,245,247,0.5)' }}>
                                Username
                            </label>
                            <input type="text" required value={form.username}
                                onChange={e => set('username', e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                                onFocus={e => e.target.style.borderColor = '#fc3c44'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                placeholder={mode === 'register' ? 'cooluser123' : 'Enter your username'}
                                autoComplete="username"
                                minLength={2}
                                maxLength={30}
                            />
                        </div>



                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(245,245,247,0.5)' }}>
                                Password
                            </label>
                            <input type="password" required value={form.password}
                                onChange={e => set('password', e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                                onFocus={e => e.target.style.borderColor = '#fc3c44'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                minLength={mode === 'register' ? 8 : undefined}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)' }}>
                                {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all mt-2"
                            style={{
                                background: loading ? 'rgba(252,60,68,0.5)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                boxShadow: loading ? 'none' : '0 4px 16px rgba(252,60,68,0.35)',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                                </span>
                                : mode === 'login' ? 'Sign In' : 'Create Account'
                            }
                        </button>
                    </form>

                    {/* Vercel Parallel Path: Guest Mode */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <button onClick={() => { const { loginAsGuest } = useAuth(); loginAsGuest(); }}
                            className="w-full py-2.5 rounded-xl font-medium text-xs text-white/40 hover:text-white/70 transition-all border border-white/5 hover:border-white/10 hover:bg-white/5 flex items-center justify-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Continue as Guest
                        </button>
                    </div>

                    {/* Switch mode */}
                    <p className="text-center text-xs mt-5" style={{ color: 'rgba(245,245,247,0.35)' }}>
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                            className="font-medium" style={{ color: '#fc3c44' }}>
                            {mode === 'login' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: 'rgba(245,245,247,0.2)' }}>
                    Your music, your library. Secured with JWTs.
                </p>
            </div>
        </div>
    );
}
