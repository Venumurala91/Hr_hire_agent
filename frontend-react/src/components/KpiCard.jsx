import React from 'react';

// A simple component that takes props and displays them.
export function KpiCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: { bg: 'var(--info-light)', text: 'var(--info-color)' },
    green: { bg: 'var(--success-light)', text: 'var(--success-color)' },
    orange: { bg: 'var(--warning-light)', text: 'var(--warning-color)' },
    purple: { bg: 'var(--purple-light)', text: 'var(--purple-color)' },
  };

  const currentColors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="card kpi-card">
      <div className="card-icon" style={{ backgroundColor: currentColors.bg, color: currentColors.text }}>
        {icon}
      </div>
      <div className="card-content">
        <span className="card-title">{title}</span>
        <span className="card-value">{value}</span>
      </div>
    </div>
  );
}