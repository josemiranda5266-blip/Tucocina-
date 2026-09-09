import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, hasMore, onPageChange }) => {
  if (currentPage === 1 && !hasMore) return null;

  return (
    <div id="pagination-controls" className="flex items-center justify-center space-x-4 my-8">
      <button
        id="pagination-prev-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Anterior</span>
      </button>

      <span className="text-sm font-semibold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
        Página {currentPage}
      </span>

      <button
        id="pagination-next-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasMore}
        className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
      >
        <span>Siguiente</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
