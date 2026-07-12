import { useState, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, List, Activity, Server, AlertCircle } from 'lucide-react';

export function CommandPalette(): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpen);
    window.addEventListener('close-command-palette', handleClose);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpen);
      window.removeEventListener('close-command-palette', handleClose);
    };
  }, []);

  const items = [
    { title: 'System Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { title: 'Queue Orchestration', path: '/queues', icon: <List size={16} /> },
    { title: 'Job Registry', path: '/jobs', icon: <Activity size={16} /> },
    { title: 'Worker Nodes', path: '/workers', icon: <Server size={16} /> },
    { title: 'Dead Letter Queue', path: '/dlq', icon: <AlertCircle size={16} /> },
  ];

  const filteredItems = items.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleListNavigation = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        navigate(filteredItems[selectedIndex].path);
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleListNavigation);
    return () => window.removeEventListener('keydown', handleListNavigation);
  }, [isOpen, filteredItems, selectedIndex, navigate]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh'
    }} onClick={() => setIsOpen(false)}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(163, 0, 47, 0.1)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={20} color="var(--text-muted)" style={{ marginRight: '16px' }} />
          <input 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, queues, jobs..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.125rem'
            }}
          />
          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>ESC</span>
        </div>
        <div style={{ padding: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No results found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, i) => (
              <div 
                key={item.path}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                  setQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: i === selectedIndex ? 'rgba(163, 0, 47, 0.1)' : 'transparent',
                  color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderLeft: i === selectedIndex ? '3px solid var(--accent-violet)' : '3px solid transparent'
                }}
              >
                <div style={{ opacity: i === selectedIndex ? 1 : 0.6, marginRight: '16px' }}>{item.icon}</div>
                <span style={{ fontWeight: i === selectedIndex ? 500 : 400 }}>{item.title}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
