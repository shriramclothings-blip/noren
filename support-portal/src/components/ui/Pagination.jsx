import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Pagination({ page, total, limit, onChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        className="btn btn-ghost btn-sm p-1.5"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>

      {pages[0] > 1 && (
        <>
          <PageBtn n={1} current={page} onClick={onChange} />
          {pages[0] > 2 && <span className="px-1 text-[var(--text-muted)]">…</span>}
        </>
      )}

      {pages.map(n => <PageBtn key={n} n={n} current={page} onClick={onChange} />)}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-[var(--text-muted)]">…</span>}
          <PageBtn n={totalPages} current={page} onClick={onChange} />
        </>
      )}

      <button
        className="btn btn-ghost btn-sm p-1.5"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>

      <span className="ml-2 text-xs text-[var(--text-muted)]">
        {total} total
      </span>
    </div>
  );
}

function PageBtn({ n, current, onClick }) {
  return (
    <button
      className={cn(
        'btn btn-sm px-2.5 py-1',
        n === current ? 'btn-primary' : 'btn-ghost'
      )}
      onClick={() => onClick(n)}
    >
      {n}
    </button>
  );
}
