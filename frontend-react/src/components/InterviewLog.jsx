import React, { useState } from 'react';
import { Modal } from './Modal';

export function InterviewLog({ interviews, candidateId, apiFetch, showToast, onInterviewAdded }) {
    const [isModalOpen, setModalOpen] = useState(false);

    const handleAddInterview = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const interviewData = {
            round_number: parseInt(formData.get('round_number'), 10),
            interviewer_name: formData.get('interviewer_name'),
            feedback: formData.get('feedback'),
            score: parseInt(formData.get('score'), 10),
            interview_date: new Date().toISOString(), // Use current date for simplicity
        };
        try {
            await apiFetch(`/api/candidates/${candidateId}/interviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
            setModalOpen(false);
            onInterviewAdded(); // Trigger a data refresh in the parent
        } catch(error) {}
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

    return (
        <div className="tab-content">
            <div className="interview-log-header">
                <h4>Interview History</h4>
                <button className="btn btn-secondary" onClick={() => setModalOpen(true)}>+ Log Interview</button>
            </div>
            <div className="interview-list">
                {interviews.length > 0 ? interviews.map(interview => (
                    <div className="interview-item" key={interview.id}>
                        <div className="interview-item-header">
                            <h5>L{interview.round_number} Interview Feedback</h5>
                            <span>by <strong>{interview.interviewer_name}</strong> on {formatDate(interview.interview_date)}</span>
                        </div>
                        <p className="interview-feedback">{interview.feedback}</p>
                        {interview.score && <div className="interview-score">Score: {interview.score}/5</div>}
                    </div>
                )) : <p>No interview feedback has been logged for this candidate.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                <div className="modal-header"><h2>Log Interview Feedback</h2><button className="close-btn" onClick={() => setModalOpen(false)}>&times;</button></div>
                <form onSubmit={handleAddInterview}>
                    <div className="form-group">
                        <label>Interview Round</label>
                        <select name="round_number" required>
                            <option value="1">L1 Technical</option>
                            <option value="2">L2 Technical</option>
                            <option value="3">HR Round</option>
                        </select>
                    </div>
                     <div className="form-group">
                        <label>Interviewer Name</label>
                        <input type="text" name="interviewer_name" required />
                    </div>
                     <div className="form-group">
                        <label>Score (out of 5)</label>
                        <input type="number" name="score" min="1" max="5" />
                    </div>
                     <div className="form-group">
                        <label>Feedback</label>
                        <textarea name="feedback" rows="5" required></textarea>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Feedback</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}