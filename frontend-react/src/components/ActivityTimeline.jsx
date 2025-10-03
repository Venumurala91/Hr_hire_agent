import React from 'react';

export function ActivityTimeline({ history }) {
    if (!history || history.length === 0) {
        return <div className="tab-content"><p>No activity history found for this candidate.</p></div>;
    }
    
    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    return (
        <div className="tab-content">
            <div className="timeline">
                {history.map((item, index) => (
                    <div className="timeline-item" key={index}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                            <p className="timeline-title">{item.status_description}</p>
                            <p className="timeline-meta">
                                by <strong>{item.changed_by}</strong> on {formatDate(item.changed_at)}
                            </p>
                            {item.comments && <p className="timeline-comment">"{item.comments}"</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}