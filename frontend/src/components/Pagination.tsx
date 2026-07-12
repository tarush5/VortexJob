import type { JSX } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps): JSX.Element | null {
  if (totalPages <= 1) return null;

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <button key={1} className={`btn-pagination ${page === 1 ? 'active' : ''}`} onClick={() => onPageChange(1)}>
          1
        </button>
      );
      if (start > 2) {
        pages.push(<span key="ellipsis-start" className="pagination-ellipsis">...</span>);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button key={i} className={`btn-pagination ${page === i ? 'active' : ''}`} onClick={() => onPageChange(i)}>
          {i}
        </button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(<span key="ellipsis-end" className="pagination-ellipsis">...</span>);
      }
      pages.push(
        <button key={totalPages} className={`btn-pagination ${page === totalPages ? 'active' : ''}`} onClick={() => onPageChange(totalPages)}>
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="pagination flex items-center justify-between mt-6">
      <button className="btn-pagination-nav" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        <ChevronLeft size={16} />
        <span>Prev</span>
      </button>

      <div className="pagination-pages flex gap-2">
        {renderPages()}
      </div>

      <button className="btn-pagination-nav" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
        <span>Next</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
