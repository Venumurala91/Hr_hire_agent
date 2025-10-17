import React from 'react';

export function ActivityTimeline({ history }) {
    if (!history || history.length === 0) {
        return <p className="text-slate-500">No activity history found for this candidate.</p>;
    }
    
    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    return (
        <div className="relative pl-6">
            {/* The vertical timeline bar */}
            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200"></div>

            {history.map((item, index) => (
                <div className="relative mb-6" key={index}>
                    <div className="absolute -left-7 top-1 w-4 h-4 rounded-full bg-primary border-2 border-white"></div>
                    <div className="pl-2">
                        <p className="font-semibold text-slate-800">{item.status_description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            by <strong>{item.changed_by}</strong> on {formatDate(item.changed_at)}
                        </p>
                        {item.comments && <p className="mt-2 text-sm text-slate-600 p-3 bg-slate-50 border border-slate-200 rounded-md">"{item.comments}"</p>}
                    </div>
                </div>
            ))}
        </div>
    );
}