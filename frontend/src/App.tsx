import { useEffect, useRef, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { CommandPalette } from './components/CommandPalette';

export default function App(): JSX.Element {
  const { token, loading } = useAuth();

  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking && appRef.current) {
        window.requestAnimationFrame(() => {
          if (appRef.current) {
            appRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
            appRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [token]);

  if (loading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout flex" ref={appRef}>
      <div className="mouse-glow" />
      <CommandPalette />
      
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content Area */}
      <main className="main-content flex-1 flex flex-col relative" style={{ position: 'relative' }}>
        {/* Animated Gradient Mesh Banner */}
        <div className="gradient-mesh-banner" style={{ opacity: 1, pointerEvents: 'none' }} />

        {/* Floating gradient orbs */}
        <div className="floating-orb floating-orb-1" style={{ opacity: 1, pointerEvents: 'none' }} />
        <div className="floating-orb floating-orb-2" style={{ opacity: 1, pointerEvents: 'none' }} />
        <div className="floating-orb floating-orb-3" style={{ opacity: 1, pointerEvents: 'none' }} />

        {/* Sticky Header */}
        <Header />

        {/* Dynamic Nested Routes Page Container */}
        <div className="flex-grow overflow-y-auto relative z-10" style={{ overflowY: 'auto', position: 'relative', zIndex: 10 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
