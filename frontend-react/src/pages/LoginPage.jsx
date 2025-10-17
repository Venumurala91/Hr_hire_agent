



import React, { useState } from 'react';

// Eye icons for password visibility toggle
const EyeIcon = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOffIcon = ({ ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
);

export function LoginPage({ onLoginSuccess, apiFetch }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            onLoginSuccess(data.user);
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans flex items-center justify-center p-8 login-bg-globe">
            <div className="w-full max-w-6xl grid lg:grid-cols-2 items-center gap-24">
                
                {/* --- Branding Panel (Left Side) --- */}
                <div className="hidden lg:flex flex-col">
                    <img src="/logo-full.png" alt="Asset Telematics Logo" className="absolute top-8 left-8 h-20 md:top-10 md:left-14 md:h-20 w-auto object-contain" />

                    
                    {/* NEW: Handshake image added as the central visual */}
                    <img src="/handshake.png" alt="Recruitment Partnership" className="w-full max-w-sm my-12 self-center" />

                    <h1 className="text-5xl font-bold text-slate-800 tracking-tight">Modern ATS Platform</h1>
                    <p className="mt-4 text-slate-500 text-lg max-w-md">
                        Streamline your recruitment process with intelligent resume processing and candidate management.
                    </p>
                    
                </div>

                {/* --- Form Panel (Right Side) --- */}
                <div className="flex flex-col items-center justify-center w-full">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-center mb-8">
                            <img src="/logo-icon.png" alt="Asset Telematics Icon" className="w-16 h-auto" />
                        </div>
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-slate-800">Welcome Back</h2>
                            <p className="mt-2 text-slate-500">
                                Sign in to your account to continue
                            </p>
                        </div>

                        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-6 text-sm">{error}</p>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email" type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                                />
                            </div>

                            <div>
                                <label htmlFor="password"className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                                    />
                                    <button
                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit" disabled={isLoading}
                                    className="w-full flex justify-center py-3 px-4 mt-2 border border-transparent rounded-lg shadow-lg shadow-accent/20 text-sm font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-70 transition-colors"
                                >
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                        </form>
                         {/* REMOVED: The "Sign up" link is now gone. */}
                    </div>
                </div>
            </div>
        </div>
    );
}


