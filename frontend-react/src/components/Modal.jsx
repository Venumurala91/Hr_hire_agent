import React from 'react';

export function Modal({ isOpen, onClose, children, size = 'default' }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const sizeClass = size === 'large' ? 'modal-lg' : '';

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-content ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}