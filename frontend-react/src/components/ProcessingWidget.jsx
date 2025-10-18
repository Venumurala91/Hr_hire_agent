import React, { useState, useEffect } from 'react';

const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9L13.5 3z" /><path d="M13 3v6h6" /></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

function TaskItem({ task, onCancel }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const percentage = task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0;

    return (
        <div className="bg-primary-light/40 backdrop-blur-sm p-4 rounded-xl border border-primary-light w-full">
            <div className="flex items-center gap-4">
                <div className="text-primary p-3 bg-white rounded-lg shadow-sm">
                    <FileIcon />
                </div>
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-primary-dark truncate">
                        Processing {task.total} resumes for {task.job_title}...
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <ClockIcon />
                        <span>Estimated time remaining: 0m 0s</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 bg-white/60 rounded-md hover:bg-white text-slate-600 border border-slate-200">
                        <span className={`transition-transform duration-300 transform ${isMinimized ? 'rotate-180' : ''}`}><ChevronUpIcon /></span>
                    </button>
                    <button onClick={onCancel} className="p-2 bg-white/60 rounded-md hover:bg-white text-slate-600 border border-slate-200"><XIcon /></button>
                </div>
            </div>
            {!isMinimized && (
                <div className="mt-4">
                    <div className="flex justify-end text-sm font-medium text-slate-600 mb-1">
                        <span>{task.processed} / {task.total} completed ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ProcessingWidget({ activeTasks, onCancelTask }) {
    const taskIds = Object.keys(activeTasks);
    if (taskIds.length === 0) {
        return null;
    }

    return (
        <div className="w-full space-y-4 mb-6">
            {taskIds.map(tid => (
                <TaskItem key={tid} task={activeTasks[tid]} onCancel={() => onCancelTask(tid)} />
            ))}
        </div>
    );
}