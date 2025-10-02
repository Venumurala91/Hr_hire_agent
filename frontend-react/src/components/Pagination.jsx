import React, { useMemo } from 'react';

// A helper function to generate the array of page numbers
const generatePaginationRange = (totalPages, currentPage) => {
  if (totalPages <= 7) {
    // If there are 7 or fewer pages, show them all
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // If there are more than 7 pages, use ellipsis
  const siblingCount = 1;
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    // Case: We are near the beginning
    const leftRange = Array.from({ length: 5 }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    // Case: We are near the end
    const rightRange = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
    return [1, '...', ...rightRange];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    // Case: We are in the middle
    const middleRange = Array.from({ length: (siblingCount * 2) + 1 }, (_, i) => leftSiblingIndex + i);
    return [1, '...', ...middleRange, '...', totalPages];
  }
};

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginationRange = useMemo(() => 
    generatePaginationRange(totalPages, currentPage),
    [totalPages, currentPage]
  );

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page
  }

  const handlePageClick = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Showing {startItem}-{endItem} of {totalItems} candidates
      </span>
      <div className="pagination-controls">
        <button className="page-btn-nav" onClick={() => handlePageClick(currentPage - 1)} disabled={currentPage === 1}>
          &lsaquo; Prev
        </button>

        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === '...') {
            return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
          }
          return (
            <button
              key={pageNumber}
              className={`page-btn ${pageNumber === currentPage ? 'active' : ''}`}
              onClick={() => handlePageClick(pageNumber)}
            >
              {pageNumber}
            </button>
          );
        })}

        <button className="page-btn-nav" onClick={() => handlePageClick(currentPage + 1)} disabled={currentPage === totalPages}>
          Next &rsaquo;
        </button>
      </div>
    </div>
  );
}