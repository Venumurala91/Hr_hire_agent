import React from 'react';

export function KpiCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
    orange: { bg: 'bg-amber-100', text: 'text-amber-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
  };

  const currentColors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200/80 flex items-center gap-5 shadow-sm">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentColors.bg} ${currentColors.text}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="block text-4xl font-bold text-slate-800 tracking-tight">{value}</span>
      </div>
    </div>
  );
}