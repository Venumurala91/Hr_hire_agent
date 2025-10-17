import React, { useState } from 'react';
import { Modal } from './Modal';

// Reusable Button Component
const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

export function InterviewLog({ interviews, candidateId, apiFetch, onInterviewAdded }) {
    const [isModalOpen, setModalOpen] = useState(false);

    const handleAddInterview = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const interviewData = {
            round_number: parseInt(formData.get('round_number'), 10),
            interviewer_name: formData.get('interviewer_name'),
            feedback: formData.get('feedback'),
            score: parseInt(formData.get('score'), 10),
            interview_date: new Date().toISOString(),
        };
        try {
            await apiFetch(`/api/candidates/${candidateId}/interviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
            setModalOpen(false);
            onInterviewAdded();
        } catch(error) {}
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-slate-800">Interview History</h4>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>+ Log Interview</Button>
            </div>
            <div className="space-y-4">
                {interviews.length > 0 ? interviews.map(interview => (
                    <div className="border border-slate-200 rounded-lg p-4" key={interview.id}>
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold text-slate-800">L{interview.round_number} Interview Feedback</h5>
                            <span className="text-xs text-slate-400">by <strong>{interview.interviewer_name}</strong> on {formatDate(interview.interview_date)}</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">{interview.feedback}</p>
                        {interview.score && <div className="mt-3 text-sm font-semibold text-slate-700">Score: {interview.score}/5</div>}
                    </div>
                )) : <p className="text-slate-500">No interview feedback has been logged for this candidate.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                <div className="p-6">
                    <div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Log Interview Feedback</h2><button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div>
                    <form onSubmit={handleAddInterview} className="mt-6 space-y-4">
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Interview Round</label><select name="round_number" required className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="1">L1 Technical</option><option value="2">L2 Technical</option><option value="3">HR Round</option></select></div>
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Interviewer Name</label><input type="text" name="interviewer_name" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div>
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Score (out of 5)</label><input type="number" name="score" min="1" max="5" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div>
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Feedback</label><textarea name="feedback" rows="5" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"></textarea></div>
                        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit">Save Feedback</Button></div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}