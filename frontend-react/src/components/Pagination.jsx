import React, { useMemo } from 'react';

const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;

const generatePaginationRange = (totalPages, currentPage) => {
  if (totalPages <= 7) { return Array.from({ length: totalPages }, (_, i) => i + 1); }
  const siblingCount = 1;
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;
  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) { const leftRange = Array.from({ length: 5 }, (_, i) => i + 1); return [...leftRange, '...', totalPages]; }
  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) { const rightRange = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i); return [1, '...', ...rightRange]; }
  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) { const middleRange = Array.from({ length: (siblingCount * 2) + 1 }, (_, i) => leftSiblingIndex + i); return [1, '...', ...middleRange, '...', totalPages]; }
};

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginationRange = useMemo(() => generatePaginationRange(totalPages, currentPage), [totalPages, currentPage]);

  if (totalPages <= 1) { return null; }

  const handlePageClick = (page) => { if (page < 1 || page > totalPages || page === currentPage) { return; } onPageChange(page); };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex justify-between items-center p-3 border-b border-slate-200">
      <span className="text-sm text-slate-500">
        Showing {startItem}-{endItem} of {totalItems} candidates
      </span>
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-800 border border-slate-300 hover:bg-slate-50" onClick={() => handlePageClick(currentPage - 1)} disabled={currentPage === 1}><ChevronLeftIcon /><span>Prev</span></button>
        <div className="flex items-center gap-1">
            {paginationRange.map((pageNumber, index) => {
                if (pageNumber === '...') { return <span key={`ellipsis-${index}`} className="flex items-center justify-center w-9 h-9 text-slate-500">...</span>; }
                return (<button key={pageNumber} className={`flex items-center justify-center w-9 h-9 rounded-md text-sm font-semibold transition-colors ${pageNumber === currentPage ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => handlePageClick(pageNumber)}>{pageNumber}</button>);
            })}
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-800 border border-slate-300 hover:bg-slate-50" onClick={() => handlePageClick(currentPage + 1)} disabled={currentPage === totalPages}><span>Next</span><ChevronRightIcon /></button>
      </div>
    </div>
  );
}