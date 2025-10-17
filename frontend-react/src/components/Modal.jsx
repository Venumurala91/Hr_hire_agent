import React from 'react';

export function Modal({ isOpen, onClose, children, size = 'default' }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const sizeClass = size === 'large' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" 
        onClick={handleOverlayClick}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}