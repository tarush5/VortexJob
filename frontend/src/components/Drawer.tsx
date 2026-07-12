import { useEffect, type JSX, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps): JSX.Element | null {
  // Lock body scroll and handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer p-6 flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-subtle" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
          <h3 className="text-lg font-bold uppercase tracking-wider">{title}</h3>
          <button className="btn-close text-muted hover:text-primary transition" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-content flex-1 overflow-y-auto pr-1" style={{ overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  );
}
