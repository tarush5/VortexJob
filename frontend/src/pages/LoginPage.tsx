import { useState, useRef, useMemo, type JSX, type FormEvent } from 'react';
import { Server, User, Mail, Lock, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export function LoginPage(): JSX.Element {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Reference to form inputs for page interactions
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Create randomized particle parameters once on mount
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      size: `${Math.random() * 6 + 4}px`,
      delay: `${Math.random() * -15}s`,
      duration: `${15 + Math.random() * 15}s`,
    }));
  }, []);

  const handleStartNow = () => {
    // Smoothly focus on form email field
    if (emailInputRef.current) {
      emailInputRef.current.focus();
      // Auto-toggle to register mode if they used the landing page CTA
      setIsRegister(true);
      toast.success('Ready to register your workspace!');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isRegister ? 'Registering workspace...' : 'Signing in...');
    
    try {
      if (isRegister) {
        await register(email, password, name);
        toast.success('Workspace initialized successfully!', { id: toastId });
      } else {
        await login(email, password);
        toast.success('Welcome back to the console!', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleMockOAuth = () => {
    toast.error('OAuth configuration is pending workspace API keys. Please sign in with email.');
  };

  return (
    <div className="stripe-container">
      {/* Skewed Colorful Mesh Gradient Background */}
      <div className="stripe-skew-bg" />

      {/* Live Drifting Particles Background */}
      <div className="particles-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Top Navbar */}
      <header className="stripe-navbar">
        <div className="stripe-logo-wrapper">
          <div className="bg-primary text-violet p-1.5 rounded" style={{ display: 'inline-flex', padding: '6px', borderRadius: '6px' }}>
            <Server size={18} />
          </div>
          <span className="stripe-logo-text">vortexjob</span>
        </div>

        <nav className="stripe-nav-links">
          <a href="#pipeline" className="stripe-nav-link" onClick={(e) => { e.preventDefault(); toast('VortexJob pipelines utilize local SQLite WAL concurrency'); }}>Pipeline</a>
          <a href="#workers" className="stripe-nav-link" onClick={(e) => { e.preventDefault(); toast('Daemon nodes automatically pull claims from DB'); }}>Workers</a>
          <a href="#architecture" className="stripe-nav-link" onClick={(e) => { e.preventDefault(); toast('DAG tasks support linear execution locks'); }}>Architecture</a>
          <a href="#docs" className="stripe-nav-link" onClick={(e) => { e.preventDefault(); toast('Developer docs are hosted inside /docs directory'); }}>Docs</a>
        </nav>

        <div>
          <button className="stripe-btn-white" onClick={() => { setIsRegister(false); emailInputRef.current?.focus(); }}>
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Page Wrapper */}
      <div className="stripe-content-wrapper">
        <div className="stripe-hero">
          
          {/* Left Column - Product messaging */}
          <div className="stripe-hero-left">
            <div className="stripe-announcement">
              <span>Sessions 2026</span>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ffffff', opacity: 0.6 }} />
              <span>Early-bird registration now open</span>
              <ChevronRight size={12} />
            </div>

            <h2 className="stripe-headline">
              Job infrastructure<br />
              to grow your<br />
              application
            </h2>

            <p className="stripe-body">
              Join the developer teams that use VortexJob to accept background task workloads, orchestrate multi-threaded pipeline queues, lock parent dependencies, and monitor node clusters.
            </p>

            <div className="stripe-cta-container">
              <div className="stripe-cta-capsule">
                <input
                  type="email"
                  className="stripe-cta-input"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleStartNow(); }}
                />
                <button className="stripe-cta-btn" onClick={handleStartNow}>
                  <span>Start now</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Mockups & Form */}
          <div className="stripe-hero-right">
            
            {/* Background Analytics Mockup Card */}
            <div className="mock-analytics-card">
              <div className="flex items-center justify-between mb-4" style={{ marginBottom: '16px' }}>
                <span className="text-xs fw-semibold uppercase tracking-wider text-muted flex items-center gap-2">
                  <Activity size={14} className="text-violet" />
                  <span>Today's Load</span>
                </span>
                <span className="text-xs font-mono text-success fw-semibold">+18.4%</span>
              </div>
              
              <div className="mb-2" style={{ marginBottom: '8px' }}>
                <span className="text-xs text-muted">Processed volume</span>
                <div className="text-2xl font-bold font-mono text-primary">3,528,198</div>
              </div>

              {/* Decorative mini graph SVG */}
              <div style={{ width: '100%', height: '80px', marginTop: '12px' }}>
                <svg width="100%" height="100%" viewBox="0 0 300 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-violet)" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="var(--accent-violet)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M 0 60 Q 40 40 80 50 T 160 20 T 240 45 T 300 10 L 300 80 L 0 80 Z" fill="url(#glowGrad)" />
                  <path d="M 0 60 Q 40 40 80 50 T 160 20 T 240 45 T 300 10" fill="none" stroke="var(--accent-violet)" strokeWidth="3" />
                  <circle cx="160" cy="20" r="4" fill="var(--accent-violet)" stroke="#ffffff" strokeWidth="2" />
                </svg>
              </div>

              <div className="grid-2 gap-4 mt-4" style={{ marginTop: '16px' }}>
                <div>
                  <span className="text-xs text-muted block">Success rate</span>
                  <span className="text-sm font-bold font-mono text-success">99.98%</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Avg Latency</span>
                  <span className="text-sm font-bold font-mono text-primary">124ms</span>
                </div>
              </div>
            </div>

            {/* Foreground Interactive Card (Login/Register Form) */}
            <div className="mock-checkout-card">
              <div className="stripe-card-header">
                <div className="stripe-card-brand">
                  <Server size={18} />
                </div>
                <div>
                  <h3 className="stripe-card-title">VortexJob Console</h3>
                  <span className="stripe-card-subtitle">Access your scheduler</span>
                </div>
              </div>

              {/* GitHub OAuth Button */}
              <button className="github-pay-btn" onClick={handleMockOAuth} type="button">
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 1024 1024" height="16" width="16" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5c0 197.7 128.2 365.3 306 424.6 22.4 4.1 30.6-9.7 30.6-21.6 0-10.7-.4-39-0.6-76.5-127.4 27.7-154.3-61.4-154.3-61.4-20.8-52.9-50.8-66.9-50.8-66.9-41.6-28.5 3.2-27.9 3.2-27.9 46 3.2 70.2 47.2 70.2 47.2 40.9 70 107.1 49.8 133.2 38.1 4.1-29.6 16-49.8 29.1-61.3-101.7-11.6-208.7-50.8-208.7-226.5 0-50.1 17.9-91 47.2-123.1-4.7-11.6-20.5-58.2 4.5-121.4 0 0 38.5-12.3 126.2 47.1 36.6-10.2 75.8-15.3 114.8-15.5 39 .2 78.2 5.3 114.8 15.5 87.7-59.4 126.1-47.1 126.1-47.1 25.1 63.2 9.3 109.8 4.6 121.4 29.4 32.1 47.2 73 47.2 123.1 0 176.2-107.2 214.7-209.2 226.1 16.4 14.1 31.1 42 31.1 84.7 0 61.2-.6 110.5-.6 125.6 0 12.1 8 26 30.8 21.5C831.9 888.5 960 720.9 960 523.5 960 276.4 759.6 76.3 511.6 76.3z"></path>
                </svg>
                <span>Continue with GitHub</span>
              </button>

              <div className="stripe-divider">
                <span>Or email console</span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {isRegister && (
                  <div>
                    <label className="stripe-field-label">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="stripe-field-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <User size={14} className="text-muted" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="stripe-field-label">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="stripe-field-input"
                      placeholder="developer@vortexjob.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      ref={emailInputRef}
                      required
                    />
                    <Mail size={14} className="text-muted" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                  </div>
                </div>

                <div>
                  <label className="stripe-field-label">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      className="stripe-field-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      ref={passwordInputRef}
                      required
                    />
                    <Lock size={14} className="text-muted" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                  </div>
                </div>

                <button type="submit" className="stripe-pay-submit-btn" disabled={loading}>
                  {loading ? 'Connecting Workspace...' : isRegister ? 'Register & Open Console' : 'Open Workspace Console'}
                </button>
              </form>

              {/* Bottom toggle */}
              <div className="text-center mt-4" style={{ marginTop: '16px', fontSize: '12px' }}>
                <span className="text-muted">{isRegister ? 'Already have a console?' : 'Need a workspace?'}</span>{' '}
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-violet-light)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  disabled={loading}
                >
                  {isRegister ? 'Sign In' : 'Register'}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
